import { useGetAuthorityDashboard, useUpdateReportStatus, getGetAuthorityDashboardQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, CheckCircle2, Clock, FileText } from "lucide-react";
import { UrgencyBadge } from "@/components/ui/urgency-badge";
import { Button } from "@/components/ui/button";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
import { Link } from "wouter";
import { StatusBadge } from "@/components/ui/status-badge";

export default function Dashboard() {
  const { data: dashboardData, isLoading } = useGetAuthorityDashboard();
  const updateStatus = useUpdateReportStatus();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  if (isLoading) {
    return <div className="p-8 text-center text-slate-500">Loading dashboard...</div>;
  }

  if (!dashboardData) return null;

  const handleMarkUnderReview = (reportId: string) => {
    updateStatus.mutate(
      { data: { reportId, newStatus: "under_review", note: "Auto-marked under review from dashboard alert" } },
      {
        onSuccess: () => {
          toast({ title: "স্ট্যাটাস আপডেট হয়েছে" });
          queryClient.invalidateQueries({ queryKey: getGetAuthorityDashboardQueryKey() });
        }
      }
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-slate-500">Overview of reports and current status.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Reports</CardTitle>
            <FileText className="h-4 w-4 text-slate-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboardData.totalReports}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Critical Reports</CardTitle>
            <AlertCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600 dark:text-red-400">{dashboardData.criticalReports}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Under Review</CardTitle>
            <Clock className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">{dashboardData.underReview}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Resolved This Week</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">{dashboardData.resolvedThisWeek}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="col-span-1 border-l-4 border-l-red-500">
          <CardHeader>
            <CardTitle className="text-red-600 dark:text-red-400 flex items-center gap-2">
              <AlertCircle className="h-5 w-5" /> Urgent Unassigned Reports
            </CardTitle>
            <CardDescription>Reports with urgency score &gt;= 8 needing immediate attention</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {dashboardData.urgentReports?.length === 0 ? (
                <div className="text-sm text-slate-500 text-center py-4">No urgent reports pending</div>
              ) : (
                dashboardData.urgentReports?.map((report) => (
                  <div key={report.id} className="flex items-center justify-between p-3 border rounded-md">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Link href={`/reports/${report.id}`} className="font-mono text-sm text-blue-600 hover:underline">
                          {report.report_number}
                        </Link>
                        <UrgencyBadge score={report.urgency_score} />
                      </div>
                      <div className="text-sm text-slate-600">{report.category} • {report.ward_name || "Unknown Location"}</div>
                      <div className="text-xs text-slate-400">{formatDistanceToNow(new Date(report.created_at), { addSuffix: true })}</div>
                    </div>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="border-amber-200 text-amber-700 hover:bg-amber-50"
                      onClick={() => handleMarkUnderReview(report.id)}
                      disabled={updateStatus.isPending}
                    >
                      Mark Review
                    </Button>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>Recent Reports</CardTitle>
            <CardDescription>Latest submissions in your jurisdiction</CardDescription>
          </CardHeader>
          <CardContent>
             <div className="space-y-4">
              {dashboardData.recentReports?.length === 0 ? (
                <div className="text-sm text-slate-500 text-center py-4">No recent reports</div>
              ) : (
                dashboardData.recentReports?.map((report) => (
                  <div key={report.id} className="flex items-center justify-between p-3 border-b last:border-0 pb-3 last:pb-0">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Link href={`/reports/${report.id}`} className="font-mono text-sm hover:underline">
                          {report.report_number}
                        </Link>
                        <StatusBadge status={report.status} />
                      </div>
                      <div className="text-sm text-slate-600">{report.category}</div>
                    </div>
                    <div className="text-right space-y-1">
                       <UrgencyBadge score={report.urgency_score} />
                       <div className="text-xs text-slate-400">{formatDistanceToNow(new Date(report.created_at), { addSuffix: true })}</div>
                    </div>
                  </div>
                ))
              )}
            </div>
            <div className="mt-4 text-center">
              <Link href="/reports" className="text-sm text-blue-600 hover:underline">
                View all reports &rarr;
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
