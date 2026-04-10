import { useState } from "react";
import { useGetAuthorityReports } from "@workspace/api-client-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Link } from "wouter";
import { UrgencyBadge } from "@/components/ui/urgency-badge";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatDistanceToNow } from "date-fns";
import { ChevronLeft, ChevronRight, FilterX } from "lucide-react";

export default function Reports() {
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [urgencyMin, setUrgencyMin] = useState<number>(1);
  const [sortBy, setSortBy] = useState<string>("date_desc");
  const PAGE_SIZE = 20;

  const { data, isLoading } = useGetAuthorityReports({
    page,
    pageSize: PAGE_SIZE,
    status: statusFilter !== "all" ? statusFilter : undefined,
    category: categoryFilter !== "all" ? categoryFilter : undefined,
    urgencyMin: urgencyMin > 1 ? urgencyMin : undefined,
    sortBy
  });

  const resetFilters = () => {
    setStatusFilter("all");
    setCategoryFilter("all");
    setUrgencyMin(1);
    setSortBy("date_desc");
    setPage(1);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">All Reports</h1>
        <p className="text-slate-500">Filter, sort, and manage citizen reports.</p>
      </div>

      <div className="bg-white dark:bg-slate-900 p-4 border rounded-md shadow-sm flex flex-col md:flex-row gap-4 items-center">
        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="submitted">Submitted</SelectItem>
            <SelectItem value="under_review">Under Review</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="resolved">Resolved</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>

        <div className="flex-1 w-full max-w-sm px-4">
          <div className="flex justify-between mb-1">
            <span className="text-sm font-medium text-slate-700">Min Urgency: {urgencyMin}</span>
          </div>
          <Slider 
            value={[urgencyMin]} 
            min={1} 
            max={10} 
            step={1}
            onValueChange={(v) => { setUrgencyMin(v[0]); setPage(1); }}
          />
        </div>

        <Select value={sortBy} onValueChange={(v) => { setSortBy(v); setPage(1); }}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Sort By" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="date_desc">Newest First</SelectItem>
            <SelectItem value="date_asc">Oldest First</SelectItem>
            <SelectItem value="urgency_desc">Highest Urgency</SelectItem>
            <SelectItem value="urgency_asc">Lowest Urgency</SelectItem>
          </SelectContent>
        </Select>

        <Button variant="outline" onClick={resetFilters} className="ml-auto" data-testid="button-reset-filters">
          <FilterX className="w-4 h-4 mr-2" /> Reset
        </Button>
      </div>

      <div className="bg-white dark:bg-slate-900 border rounded-md shadow-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-slate-50 dark:bg-slate-950">
            <TableRow>
              <TableHead>Report#</TableHead>
              <TableHead>Location</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Urgency</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Submitted</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-slate-500">Loading reports...</TableCell>
              </TableRow>
            ) : data?.reports.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-slate-500">No reports found matching criteria.</TableCell>
              </TableRow>
            ) : (
              data?.reports.map((report) => (
                <TableRow key={report.id}>
                  <TableCell className="font-mono text-sm">{report.report_number}</TableCell>
                  <TableCell className="max-w-[200px] truncate" title={report.ward_name || report.address || "Unknown"}>
                    {report.ward_name || report.address || "Unknown"}
                  </TableCell>
                  <TableCell>{report.category}</TableCell>
                  <TableCell><UrgencyBadge score={report.urgency_score} /></TableCell>
                  <TableCell><StatusBadge status={report.status} /></TableCell>
                  <TableCell className="text-sm text-slate-500">{formatDistanceToNow(new Date(report.created_at), { addSuffix: true })}</TableCell>
                  <TableCell className="text-right">
                    <Link href={`/reports/${report.id}`}>
                      <Button variant="secondary" size="sm">View</Button>
                    </Link>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {data && data.total > 0 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-slate-500">
            Showing {((page - 1) * PAGE_SIZE) + 1} - {Math.min(page * PAGE_SIZE, data.total)} of {data.total}
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              disabled={page === 1}
              onClick={() => setPage(p => Math.max(1, p - 1))}
            >
              <ChevronLeft className="w-4 h-4 mr-1" /> Prev
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              disabled={page * PAGE_SIZE >= data.total}
              onClick={() => setPage(p => p + 1)}
            >
              Next <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
