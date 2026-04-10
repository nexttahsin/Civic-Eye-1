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
    return <div className="p-8 text-center text-muted-foreground">Loading dashboard...</div>;
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
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Dashboard</h1>
        <p className="text-muted-foreground">Overview of reports and current status.</p>
      </div>

      {/* Stat Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-l-4 border-l-primary">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Reports</CardTitle>
            <FileText className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{dashboardData.totalReports}</div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-destructive">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Critical Reports</CardTitle>
            <AlertCircle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{dashboardData.criticalReports}</div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-secondary" style={{ borderLeftColor: 'hsl(38 90% 50%)' }}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Under Review</CardTitle>
            <Clock className="h-4 w-4" style={{ color: 'hsl(38 90% 45%)' }} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" style={{ color: 'hsl(38 90% 40%)' }}>{dashboardData.underReview}</div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-primary">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Resolved This Week</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{dashboardData.resolvedThisWeek}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Urgent Alerts */}
        <Card className="col-span-1 border-l-4 border-l-destructive">
          <CardHeader>
            <CardTitle className="text-destructive flex items-center gap-2">
              <AlertCircle className="h-5 w-5" /> Urgent Unassigned Reports
            </CardTitle>
            <CardDescription>Reports with urgency score &gt;= 8 needing immediate attention</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {dashboardData.urgentReports?.length === 0 ? (
                <div className="text-sm text-muted-foreground text-center py-4">No urgent reports pending</div>
              ) : (
                dashboardData.urgentReports?.map((report) => (
                  <div key={report.id} className="flex items-center justify-between p-3 border border-border rounded-md bg-card">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Link href={`/reports/${report.id}`} className="font-mono text-sm text-primary hover:underline">
                          {report.report_number}
                        </Link>
                        <UrgencyBadge score={report.urgency_score} />
                      </div>
                      <div className="text-sm text-muted-foreground">{report.category} • {report.ward_name || "Unknown Location"}</div>
                      <div className="text-xs text-muted-foreground/60">{formatDistanceToNow(new Date(report.created_at), { addSuffix: true })}</div>
                    </div>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="border-secondary text-secondary-foreground hover:bg-secondary"
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

        {/* Recent Reports */}
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle className="text-foreground">Recent Reports</CardTitle>
            <CardDescription>Latest submissions in your jurisdiction</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {dashboardData.recentReports?.length === 0 ? (
                <div className="text-sm text-muted-foreground text-center py-4">No recent reports</div>
              ) : (
                dashboardData.recentReports?.map((report) => (
                  <div key={report.id} className="flex items-center justify-between p-3 border-b border-border last:border-0 pb-3 last:pb-0">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Link href={`/reports/${report.id}`} className="font-mono text-sm text-primary hover:underline">
                          {report.report_number}
                        </Link>
                        <StatusBadge status={report.status} />
                      </div>
                      <div className="text-sm text-muted-foreground capitalize">{report.category?.replace(/_/g, ' ')}</div>
                    </div>
                    <div className="text-right space-y-1">
                      <UrgencyBadge score={report.urgency_score} />
                      <div className="text-xs text-muted-foreground/60">{formatDistanceToNow(new Date(report.created_at), { addSuffix: true })}</div>
                    </div>
                  </div>
                ))
              )}
            </div>
            <div className="mt-4 text-center">
              <Link href="/reports" className="text-sm text-primary hover:underline font-medium">
                View all reports →
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
