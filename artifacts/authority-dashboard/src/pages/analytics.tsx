import { useGetAuthorityAnalytics } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from "recharts";
import { ArrowDownIcon, ArrowUpIcon } from "lucide-react";

/* Palette:
   Mint green  #52c468  (primary)
   Light blue  #90bdd8  (secondary / accent)
   Gray        #9b9b9b  (muted)
   Black       #111111  (foreground)
*/
const CHART_GREEN   = "#52c468";
const CHART_BLUE    = "#90bdd8";
const CHART_GRAY    = "#9b9b9b";
const CHART_BLACK   = "#1a1a1a";
const CHART_ORANGE  = "#f97316";

const COLORS = [CHART_GREEN, CHART_BLUE, CHART_GRAY, CHART_BLACK, CHART_ORANGE, "#60c8a8", "#b8d090"];

const STATUS_COLORS: Record<string, string> = {
  submitted:    CHART_BLUE,
  under_review: "#f59e0b",
  in_progress:  CHART_ORANGE,
  resolved:     CHART_GREEN,
  rejected:     "#ef4444",
};

const GRID_COLOR  = "#e5e7eb";
const TOOLTIP_STYLE = {
  borderRadius: "8px",
  border: "1px solid #e5e7eb",
  boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.08)",
  fontSize: 13,
};

export default function Analytics() {
  const { data, isLoading } = useGetAuthorityAnalytics();

  if (isLoading) return <div className="p-8 text-center text-muted-foreground">Loading analytics...</div>;
  if (!data) return null;

  const monthDiff   = data.thisMonthCount - data.lastMonthCount;
  const monthGrowth = data.lastMonthCount === 0 ? 100 : Math.round((monthDiff / data.lastMonthCount) * 100);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Analytics & Performance</h1>
        <p className="text-muted-foreground">Department metrics and reporting trends.</p>
      </div>

      {/* Summary cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-l-4 border-l-primary">
          <CardContent className="p-6">
            <div className="text-sm font-medium text-muted-foreground mb-1">Resolution Rate</div>
            <div className="text-3xl font-bold text-primary">{Math.round(data.responseRate * 100)}%</div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-secondary" style={{ borderLeftColor: CHART_BLUE }}>
          <CardContent className="p-6">
            <div className="text-sm font-medium text-muted-foreground mb-1">Avg. Resolution Time</div>
            <div className="text-3xl font-bold text-foreground">
              {data.avgResolutionDays ? `${data.avgResolutionDays.toFixed(1)} days` : "N/A"}
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-border">
          <CardContent className="p-6">
            <div className="text-sm font-medium text-muted-foreground mb-1">Reports This Month</div>
            <div className="flex items-baseline gap-2">
              <div className="text-3xl font-bold text-foreground">{data.thisMonthCount}</div>
              <div className={`text-sm flex items-center font-medium ${monthDiff >= 0 ? "text-destructive" : "text-primary"}`}>
                {monthDiff >= 0
                  ? <ArrowUpIcon className="w-3 h-3 mr-0.5" />
                  : <ArrowDownIcon className="w-3 h-3 mr-0.5" />}
                {Math.abs(monthGrowth)}% vs last month
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts grid */}
      <div className="grid gap-6 md:grid-cols-2">

        {/* Reports by category — bar */}
        <Card>
          <CardHeader>
            <CardTitle className="text-foreground">Reports by Category</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.categoryBreakdown} margin={{ top: 10, right: 10, left: -20, bottom: 24 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={GRID_COLOR} />
                  <XAxis
                    dataKey="category"
                    axisLine={false} tickLine={false}
                    tick={{ fontSize: 11, fill: CHART_GRAY }}
                    angle={-35} textAnchor="end"
                    tickFormatter={(v: string) => v.replace(/_/g, ' ')}
                  />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: CHART_GRAY }} />
                  <Tooltip cursor={{ fill: "#f0fdf4" }} contentStyle={TOOLTIP_STYLE} />
                  <Bar dataKey="count" fill={CHART_GREEN} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Daily flow — line */}
        <Card>
          <CardHeader>
            <CardTitle className="text-foreground">Daily Report Flow (30 Days)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data.dailyReports} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={GRID_COLOR} />
                  <XAxis
                    dataKey="date"
                    axisLine={false} tickLine={false}
                    tick={{ fontSize: 11, fill: CHART_GRAY }}
                    tickFormatter={(v: string) => v.split("-").slice(1).join("/")}
                  />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: CHART_GRAY }} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} />
                  <Line
                    type="monotone" dataKey="count"
                    stroke={CHART_BLUE} strokeWidth={3}
                    dot={false} activeDot={{ r: 5, fill: CHART_BLUE }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Status distribution — donut */}
        <Card>
          <CardHeader>
            <CardTitle className="text-foreground">Status Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data.statusBreakdown}
                    cx="50%" cy="50%"
                    innerRadius={60} outerRadius={100}
                    paddingAngle={3}
                    dataKey="count" nameKey="status"
                    label={({ status, percent }) =>
                      `${(status as string).replace("_", " ")} ${((percent as number) * 100).toFixed(0)}%`
                    }
                    labelLine={false}
                  >
                    {data.statusBreakdown.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={STATUS_COLORS[entry.status] || COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={TOOLTIP_STYLE} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Avg urgency by category — horizontal bar */}
        <Card>
          <CardHeader>
            <CardTitle className="text-foreground">Average Urgency by Category</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={data.categoryBreakdown}
                  layout="vertical"
                  margin={{ top: 10, right: 30, left: 50, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={GRID_COLOR} />
                  <XAxis
                    type="number" domain={[0, 10]}
                    axisLine={false} tickLine={false}
                    tick={{ fontSize: 11, fill: CHART_GRAY }}
                  />
                  <YAxis
                    type="category" dataKey="category"
                    axisLine={false} tickLine={false}
                    tick={{ fontSize: 11, fill: CHART_GRAY }}
                    tickFormatter={(v: string) => v.replace(/_/g, ' ')}
                  />
                  <Tooltip cursor={{ fill: "#fff4f4" }} contentStyle={TOOLTIP_STYLE} />
                  <Bar dataKey="avg_urgency" fill="#ef4444" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
