import { useParams } from "wouter";
import { useGetAuthorityReport, useUpdateReportStatus, getGetAuthorityReportQueryKey } from "@workspace/api-client-react";
import { StatusBadge } from "@/components/ui/status-badge";
import { UrgencyBadge } from "@/components/ui/urgency-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format } from "date-fns";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";

export default function ReportDetail() {
  const { id } = useParams<{ id: string }>();
  const { data, isLoading } = useGetAuthorityReport(id || "", { query: { enabled: !!id, queryKey: getGetAuthorityReportQueryKey(id || "") } });
  const updateStatus = useUpdateReportStatus();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const [newStatus, setNewStatus] = useState<string>("");
  const [lightboxImg, setLightboxImg] = useState<string | null>(null);

  if (isLoading) return <div className="p-8 text-center text-muted-foreground">Loading report details...</div>;
  if (!data?.report) return <div className="p-8 text-center text-destructive">Report not found</div>;

  const report = data.report;
  const citizen = report.citizen;
  const aiAnalysis = report.ai_analysis?.find((a: any) => a.is_aggregate);

  const handleStatusUpdate = () => {
    if (!newStatus || newStatus === report.status) return;
    
    updateStatus.mutate(
      { data: { reportId: report.id, newStatus, note: "Status updated by authority" } },
      {
        onSuccess: () => {
          toast({ title: "স্ট্যাটাস আপডেট হয়েছে" });
          queryClient.invalidateQueries({ queryKey: getGetAuthorityReportQueryKey(report.id) });
          setNewStatus("");
        }
      }
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-bold font-mono tracking-tight">{report.report_number}</h1>
            <StatusBadge status={report.status} />
            <UrgencyBadge score={report.urgency_score} />
          </div>
          <p className="text-muted-foreground text-sm">
            Submitted {format(new Date(report.created_at), "PPP 'at' p")}
          </p>
        </div>
        
        <div className="flex items-center gap-2 bg-card p-2 rounded-md border border-border shadow-sm">
          <Select value={newStatus || report.status} onValueChange={setNewStatus}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Update Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="submitted">Submitted</SelectItem>
              <SelectItem value="under_review">Under Review</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="resolved">Resolved</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>
          <Button 
            onClick={handleStatusUpdate} 
            disabled={!newStatus || newStatus === report.status || updateStatus.isPending}
          >
            Update
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Issue Description</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-lg font-medium mb-2">{report.category}</div>
              <p className="text-foreground leading-relaxed whitespace-pre-wrap">
                {report.description || "No description provided."}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Images</CardTitle>
            </CardHeader>
            <CardContent>
              {report.report_images?.length === 0 ? (
                <div className="text-muted-foreground italic">No images provided.</div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {report.report_images?.map((img: any) => (
                    <div 
                      key={img.id} 
                      className="cursor-pointer overflow-hidden rounded-md border aspect-video hover:opacity-80 transition"
                      onClick={() => setLightboxImg(img.public_url)}
                    >
                      <img 
                        src={img.public_url} 
                        alt="Report visual" 
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Location Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="text-sm font-medium text-muted-foreground">Address</div>
                <div>{report.address || "N/A"}</div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm font-medium text-muted-foreground">Ward</div>
                  <div>{report.ward_name || "N/A"}</div>
                </div>
                <div>
                  <div className="text-sm font-medium text-muted-foreground">Coordinates</div>
                  <div className="font-mono text-sm">{report.latitude.toFixed(6)}, {report.longitude.toFixed(6)}</div>
                </div>
              </div>
              
              <div className="w-full h-48 bg-muted rounded-md border border-border flex items-center justify-center text-muted-foreground mt-4 text-sm">
                Map View Placeholder
                &nbsp;({report.latitude.toFixed(4)}, {report.longitude.toFixed(4)})
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-4 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">AI Analysis</CardTitle>
            </CardHeader>
            <CardContent>
              {aiAnalysis ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    {report.ai_verified ? (
                      <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-primary/15 text-primary border border-primary/30">
                        AI যাচাইকৃত ✓
                      </span>
                    ) : report.is_flagged_fake ? (
                      <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-destructive/10 text-destructive border border-destructive/30">
                        সন্দেহজনক ⚠
                      </span>
                    ) : null}
                    
                    <span className="text-sm text-muted-foreground">
                      Confidence: {(aiAnalysis.confidence || 0) * 100}%
                    </span>
                  </div>
                  
                  <div className="text-sm">
                    <div className="font-medium text-muted-foreground mb-1">Summary</div>
                    <div className="font-['Hind_Siliguri'] text-base leading-relaxed bg-secondary/30 p-3 rounded border border-secondary">
                      {aiAnalysis.summary || "No summary available."}
                    </div>
                  </div>
                  
                  <div className="text-sm">
                    <div className="font-medium text-muted-foreground mb-1">Severity</div>
                    <div className="capitalize text-foreground">{aiAnalysis.severity || "Unknown"}</div>
                  </div>
                </div>
              ) : (
                <div className="text-muted-foreground italic">AI analysis pending or unavailable.</div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Reporter Info</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {citizen ? (
                <>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Name</span>
                    <span className="font-medium text-foreground">{citizen.full_name || "Anonymous"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Phone</span>
                    <span className="font-mono text-foreground">{citizen.phone_masked || "N/A"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Reputation Score</span>
                    <span className="font-medium text-foreground">{citizen.reputation_score || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total Reports</span>
                    <span className="font-medium text-foreground">{citizen.total_reports || 0}</span>
                  </div>
                </>
              ) : (
                <div className="text-muted-foreground italic">Reporter details unavailable.</div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={!!lightboxImg} onOpenChange={(open) => !open && setLightboxImg(null)}>
        <DialogContent className="max-w-4xl p-1 bg-black/90 border-none">
          {lightboxImg && (
            <img src={lightboxImg} alt="Lightbox" className="w-full h-auto max-h-[85vh] object-contain" />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
