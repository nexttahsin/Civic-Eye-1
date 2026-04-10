import { useGetAuthorityAnalytics } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from "recharts";
import { ArrowDownIcon, ArrowUpIcon } from "lucide-react";

const COLORS = ['#2563eb', '#16a34a', '#d97706', '#dc2626', '#9333ea', '#0891b2', '#0284c7'];
const STATUS_COLORS: Record<string, string> = {
  'submitted': '#3b82f6',
  'under_review': '#f59e0b',
  'in_progress': '#f97316',
  'resolved': '#22c55e',
  'rejected': '#ef4444'
};

export default function Analytics() {
  const { data, isLoading } = useGetAuthorityAnalytics();

  if (isLoading) return <div className="p-8 text-center text-slate-500">Loading analytics...</div>;
  if (!data) return null;

  const monthDiff = data.thisMonthCount - data.lastMonthCount;
  const monthGrowth = data.lastMonthCount === 0 ? 100 : Math.round((monthDiff / data.lastMonthCount) * 100);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Analytics & Performance</h1>
        <p className="text-slate-500">Department metrics and reporting trends.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="p-6">
            <div className="text-sm font-medium text-slate-500 mb-1">Resolution Rate</div>
            <div className="text-3xl font-bold">{Math.round(data.responseRate * 100)}%</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="text-sm font-medium text-slate-500 mb-1">Avg. Resolution Time</div>
            <div className="text-3xl font-bold">{data.avgResolutionDays ? `${data.avgResolutionDays.toFixed(1)} days` : 'N/A'}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="text-sm font-medium text-slate-500 mb-1">Reports This Month</div>
            <div className="flex items-baseline gap-2">
              <div className="text-3xl font-bold">{data.thisMonthCount}</div>
              <div className={`text-sm flex items-center ${monthDiff >= 0 ? 'text-red-500' : 'text-green-500'}`}>
                {monthDiff >= 0 ? <ArrowUpIcon className="w-3 h-3 mr-1" /> : <ArrowDownIcon className="w-3 h-3 mr-1" />}
                {Math.abs(monthGrowth)}% vs last month
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Reports by Category</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.categoryBreakdown} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="category" axisLine={false} tickLine={false} tick={{ fontSize: 12 }} angle={-45} textAnchor="end" />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                  <Tooltip cursor={{ fill: '#f1f5f9' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                  <Bar dataKey="count" fill="#2563eb" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Daily Report Flow (30 Days)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data.dailyReports} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 12 }} tickFormatter={(val) => val.split('-').slice(1).join('/')} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                  <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                  <Line type="monotone" dataKey="count" stroke="#16a34a" strokeWidth={3} dot={false} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Status Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data.statusBreakdown}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={2}
                    dataKey="count"
                    nameKey="status"
                    label={({ status, percent }) => `${status.replace('_', ' ')} ${(percent * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    {data.statusBreakdown.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={STATUS_COLORS[entry.status] || COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Average Urgency by Category</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.categoryBreakdown} layout="vertical" margin={{ top: 10, right: 30, left: 40, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                  <XAxis type="number" domain={[0, 10]} axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                  <YAxis type="category" dataKey="category" axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                  <Tooltip cursor={{ fill: '#f1f5f9' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                  <Bar dataKey="avg_urgency" fill="#dc2626" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
