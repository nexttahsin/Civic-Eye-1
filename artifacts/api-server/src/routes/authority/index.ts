import { Router, type IRouter } from "express";
import {
  requireAuthorityAuth,
  type AuthorityRequest,
} from "../../middlewares/authority-auth.js";
import { createSupabaseClientWithToken } from "../../lib/supabase-server.js";
import { logger } from "../../lib/logger.js";

const router: IRouter = Router();

function maskPhone(phone: string): string {
  if (!phone || phone.length < 4) return "***";
  return phone.slice(0, 3) + "*****" + phone.slice(-2);
}

router.get(
  "/authority/me",
  requireAuthorityAuth,
  async (req: AuthorityRequest, res): Promise<void> => {
    res.json({ authorityUser: req.authorityUser });
  },
);

router.post(
  "/authority/update-status",
  requireAuthorityAuth,
  async (req: AuthorityRequest, res): Promise<void> => {
    const { reportId, newStatus, note } = req.body as {
      reportId: string;
      newStatus: string;
      note: string;
    };

    if (!reportId || !newStatus) {
      res.status(400).json({ error: "reportId and newStatus are required" });
      return;
    }

    const validStatuses = [
      "submitted",
      "under_review",
      "in_progress",
      "resolved",
      "rejected",
    ];
    if (!validStatuses.includes(newStatus)) {
      res.status(400).json({ error: "Invalid status" });
      return;
    }

    const authorityUser = req.authorityUser!;
    const supabase = createSupabaseClientWithToken(req.accessToken!);

    const { data: report, error: fetchError } = await supabase
      .from("reports")
      .select("id, status, department_id")
      .eq("id", reportId)
      .single();

    if (fetchError || !report) {
      res.status(404).json({ error: "Report not found" });
      return;
    }

    if (report.department_id !== authorityUser.department_id) {
      res.status(403).json({ error: "Report does not belong to your department" });
      return;
    }

    const oldStatus = report.status as string;

    const { error: updateError } = await supabase
      .from("reports")
      .update({ status: newStatus })
      .eq("id", reportId);

    if (updateError) {
      req.log.error({ error: updateError }, "Failed to update report status");
      res.status(500).json({ error: "Failed to update status" });
      return;
    }

    const { error: logError } = await supabase.from("activity_logs").insert({
      report_id: reportId,
      actor_type: "authority",
      actor_id: authorityUser.id,
      action: "status_updated",
      details: {
        from: oldStatus,
        to: newStatus,
        note: note || "",
        officer: authorityUser.full_name,
      },
    });

    if (logError) {
      req.log.warn({ error: logError }, "Failed to insert activity log");
    }

    res.json({ success: true, message: "Status updated successfully" });
  },
);

router.get(
  "/authority/dashboard",
  requireAuthorityAuth,
  async (req: AuthorityRequest, res): Promise<void> => {
    const authorityUser = req.authorityUser!;
    const deptId = authorityUser.department_id;
    const supabase = createSupabaseClientWithToken(req.accessToken!);

    const weekAgo = new Date(
      Date.now() - 7 * 24 * 60 * 60 * 1000,
    ).toISOString();
    const monthStart = new Date(
      new Date().getFullYear(),
      new Date().getMonth(),
      1,
    ).toISOString();

    const [
      totalResult,
      criticalResult,
      underReviewResult,
      resolvedWeekResult,
      urgentResult,
      recentResult,
      monthReportsResult,
    ] = await Promise.all([
      supabase
        .from("reports")
        .select("*", { count: "exact", head: true })
        .eq("department_id", deptId),

      supabase
        .from("reports")
        .select("*", { count: "exact", head: true })
        .eq("department_id", deptId)
        .gte("urgency_score", 7)
        .eq("status", "submitted"),

      supabase
        .from("reports")
        .select("*", { count: "exact", head: true })
        .eq("department_id", deptId)
        .eq("status", "under_review"),

      supabase
        .from("reports")
        .select("*", { count: "exact", head: true })
        .eq("department_id", deptId)
        .eq("status", "resolved")
        .gte("updated_at", weekAgo),

      supabase
        .from("reports")
        .select(
          "id, report_number, category, urgency_score, ward_name, created_at, status",
        )
        .eq("department_id", deptId)
        .gte("urgency_score", 8)
        .eq("status", "submitted")
        .order("urgency_score", { ascending: false })
        .limit(5),

      supabase
        .from("reports")
        .select(
          "id, report_number, category, status, urgency_score, address, ward_name, created_at, updated_at, ai_verified, is_flagged_fake, image_count, report_images(public_url, upload_order)",
        )
        .eq("department_id", deptId)
        .order("urgency_score", { ascending: false })
        .limit(10),

      supabase
        .from("reports")
        .select("category")
        .eq("department_id", deptId)
        .gte("created_at", monthStart),
    ]);

    const monthReports = monthReportsResult.data ?? [];
    const categoryMap: Record<string, { count: number; urgencySum: number }> =
      {};
    monthReports.forEach((r: { category: string }) => {
      if (!categoryMap[r.category]) {
        categoryMap[r.category] = { count: 0, urgencySum: 0 };
      }
      categoryMap[r.category].count++;
    });
    const categoryBreakdown = Object.entries(categoryMap).map(
      ([category, data]) => ({
        category,
        count: data.count,
        avg_urgency: 0,
      }),
    );

    const recentReports = (recentResult.data ?? []).map(
      (r: Record<string, unknown>) => {
        const images = (r.report_images as Array<{ public_url: string; upload_order: number }>) ?? [];
        const sorted = [...images].sort(
          (a, b) => a.upload_order - b.upload_order,
        );
        return {
          id: r.id,
          report_number: r.report_number,
          category: r.category,
          status: r.status,
          urgency_score: r.urgency_score,
          address: r.address,
          ward_name: r.ward_name,
          created_at: r.created_at,
          updated_at: r.updated_at,
          ai_verified: r.ai_verified,
          is_flagged_fake: r.is_flagged_fake,
          image_count: r.image_count,
          thumbnail_url: sorted[0]?.public_url ?? null,
        };
      },
    );

    res.json({
      totalReports: totalResult.count ?? 0,
      criticalReports: criticalResult.count ?? 0,
      underReview: underReviewResult.count ?? 0,
      resolvedThisWeek: resolvedWeekResult.count ?? 0,
      urgentReports: urgentResult.data ?? [],
      recentReports,
      categoryBreakdown,
    });
  },
);

router.get(
  "/authority/reports",
  requireAuthorityAuth,
  async (req: AuthorityRequest, res): Promise<void> => {
    const authorityUser = req.authorityUser!;
    const deptId = authorityUser.department_id;
    const supabase = createSupabaseClientWithToken(req.accessToken!);

    const {
      status,
      category,
      urgencyMin,
      sortBy,
      page: pageStr,
      pageSize: pageSizeStr,
    } = req.query as Record<string, string | undefined>;

    const page = parseInt(pageStr ?? "0", 10);
    const pageSize = parseInt(pageSizeStr ?? "20", 10);
    const urgencyMinNum = urgencyMin ? parseFloat(urgencyMin) : 1;
    const sortField =
      sortBy === "created_at" ? "created_at" : "urgency_score";

    let query = supabase
      .from("reports")
      .select(
        "id, report_number, category, status, urgency_score, address, ward_name, created_at, updated_at, ai_verified, is_flagged_fake, image_count, report_images(public_url, upload_order)",
        { count: "exact" },
      )
      .eq("department_id", deptId)
      .order(sortField, { ascending: false })
      .range(page * pageSize, (page + 1) * pageSize - 1);

    if (status && status !== "all") {
      query = query.eq("status", status);
    }
    if (category && category !== "all") {
      query = query.eq("category", category);
    }
    if (urgencyMinNum > 1) {
      query = query.gte("urgency_score", urgencyMinNum);
    }

    const { data, count, error } = await query;

    if (error) {
      req.log.error({ error }, "Failed to fetch reports");
      res.status(500).json({ error: "Failed to fetch reports" });
      return;
    }

    const reports = (data ?? []).map((r: Record<string, unknown>) => {
      const images = (r.report_images as Array<{ public_url: string; upload_order: number }>) ?? [];
      const sorted = [...images].sort(
        (a, b) => a.upload_order - b.upload_order,
      );
      return {
        id: r.id,
        report_number: r.report_number,
        category: r.category,
        status: r.status,
        urgency_score: r.urgency_score,
        address: r.address,
        ward_name: r.ward_name,
        created_at: r.created_at,
        updated_at: r.updated_at,
        ai_verified: r.ai_verified,
        is_flagged_fake: r.is_flagged_fake,
        image_count: r.image_count,
        thumbnail_url: sorted[0]?.public_url ?? null,
      };
    });

    res.json({
      reports,
      total: count ?? 0,
      page,
      pageSize,
    });
  },
);

router.get(
  "/authority/reports/:id",
  requireAuthorityAuth,
  async (req: AuthorityRequest, res): Promise<void> => {
    const authorityUser = req.authorityUser!;
    const deptId = authorityUser.department_id;
    const supabase = createSupabaseClientWithToken(req.accessToken!);

    const rawId = Array.isArray(req.params.id)
      ? req.params.id[0]
      : req.params.id;

    const { data: report, error } = await supabase
      .from("reports")
      .select(
        `
        *,
        departments(name, name_bn, slug),
        report_images(*),
        ai_analysis(*),
        activity_logs(*)
      `,
      )
      .eq("id", rawId)
      .eq("department_id", deptId)
      .single();

    if (error || !report) {
      res.status(404).json({ error: "Report not found" });
      return;
    }

    let citizen = {
      full_name: "অজানা",
      phone_masked: "***",
      reputation_score: 0,
      total_reports: 0,
      verified_reports: 0,
    };

    const { data: citizenData } = await supabase
      .from("users")
      .select("full_name, phone, reputation_score, total_reports, verified_reports")
      .eq("id", (report as Record<string, unknown>).user_id as string)
      .single();

    if (citizenData) {
      const cd = citizenData as {
        full_name: string;
        phone: string;
        reputation_score: number;
        total_reports: number;
        verified_reports: number;
      };
      citizen = {
        full_name:
          cd.full_name.split(" ").length > 1
            ? cd.full_name.split(" ")[0] +
              " " +
              cd.full_name.split(" ").slice(-1)[0][0] +
              "."
            : cd.full_name,
        phone_masked: maskPhone(cd.phone ?? ""),
        reputation_score: cd.reputation_score ?? 0,
        total_reports: cd.total_reports ?? 0,
        verified_reports: cd.verified_reports ?? 0,
      };
    }

    const activityLogs = (
      (report as Record<string, unknown>).activity_logs as Array<Record<string, unknown>>
    );
    const sortedLogs = [...(activityLogs ?? [])].sort(
      (a, b) =>
        new Date(a.created_at as string).getTime() -
        new Date(b.created_at as string).getTime(),
    );

    res.json({
      report: {
        ...(report as object),
        activity_logs: sortedLogs,
        citizen,
      },
    });
  },
);

router.get(
  "/authority/analytics",
  requireAuthorityAuth,
  async (req: AuthorityRequest, res): Promise<void> => {
    const authorityUser = req.authorityUser!;
    const deptId = authorityUser.department_id;
    const supabase = createSupabaseClientWithToken(req.accessToken!);

    const thirtyDaysAgo = new Date(
      Date.now() - 30 * 24 * 60 * 60 * 1000,
    ).toISOString();
    const monthStart = new Date(
      new Date().getFullYear(),
      new Date().getMonth(),
      1,
    ).toISOString();
    const lastMonthStart = new Date(
      new Date().getFullYear(),
      new Date().getMonth() - 1,
      1,
    ).toISOString();

    const [allReportsResult, last30Result, statusResult] = await Promise.all([
      supabase
        .from("reports")
        .select("category, status, urgency_score, created_at, updated_at")
        .eq("department_id", deptId),

      supabase
        .from("reports")
        .select("created_at, category")
        .eq("department_id", deptId)
        .gte("created_at", thirtyDaysAgo),

      supabase
        .from("reports")
        .select("status")
        .eq("department_id", deptId),
    ]);

    const allReports = (allReportsResult.data ?? []) as Array<{
      category: string;
      status: string;
      urgency_score: number;
      created_at: string;
      updated_at: string;
    }>;

    const thisMonthReports = allReports.filter(
      (r) => r.created_at >= monthStart,
    );
    const lastMonthReports = allReports.filter(
      (r) =>
        r.created_at >= lastMonthStart && r.created_at < monthStart,
    );

    const categoryMap: Record<
      string,
      { count: number; urgencySum: number }
    > = {};
    thisMonthReports.forEach((r) => {
      if (!categoryMap[r.category]) {
        categoryMap[r.category] = { count: 0, urgencySum: 0 };
      }
      categoryMap[r.category].count++;
      categoryMap[r.category].urgencySum += r.urgency_score ?? 0;
    });
    const categoryBreakdown = Object.entries(categoryMap).map(
      ([category, data]) => ({
        category,
        count: data.count,
        avg_urgency:
          data.count > 0
            ? Math.round((data.urgencySum / data.count) * 10) / 10
            : 0,
      }),
    );

    const last30 = (last30Result.data ?? []) as Array<{ created_at: string }>;
    const dailyMap: Record<string, number> = {};
    const now = new Date();
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dateKey = d.toISOString().slice(0, 10);
      dailyMap[dateKey] = 0;
    }
    last30.forEach((r) => {
      const dateKey = r.created_at.slice(0, 10);
      if (dateKey in dailyMap) {
        dailyMap[dateKey]++;
      }
    });
    const dailyReports = Object.entries(dailyMap).map(([date, count]) => ({
      date,
      count,
    }));

    const statusMap: Record<string, number> = {};
    ((statusResult.data ?? []) as Array<{ status: string }>).forEach((r) => {
      statusMap[r.status] = (statusMap[r.status] ?? 0) + 1;
    });
    const statusBreakdown = Object.entries(statusMap).map(
      ([status, count]) => ({ status, count }),
    );

    const resolvedCount = statusMap["resolved"] ?? 0;
    const totalCount = allReports.length;
    const responseRate =
      totalCount > 0
        ? Math.round((resolvedCount / totalCount) * 100 * 10) / 10
        : 0;

    const resolvedReports = allReports.filter(
      (r) => r.status === "resolved",
    );
    let avgResolutionDays: number | null = null;
    if (resolvedReports.length > 0) {
      const totalDays = resolvedReports.reduce((sum, r) => {
        const created = new Date(r.created_at).getTime();
        const updated = new Date(r.updated_at).getTime();
        return sum + (updated - created) / (1000 * 60 * 60 * 24);
      }, 0);
      avgResolutionDays =
        Math.round((totalDays / resolvedReports.length) * 10) / 10;
    }

    res.json({
      categoryBreakdown,
      dailyReports,
      statusBreakdown,
      responseRate,
      avgResolutionDays,
      thisMonthCount: thisMonthReports.length,
      lastMonthCount: lastMonthReports.length,
    });
  },
);

export default router;
