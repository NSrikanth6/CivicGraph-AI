import React, { useMemo } from 'react';
import {
  FileText,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Network,
  Users,
  Activity,
  ArrowRight,
  ShieldCheck,
  TrendingUp,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
} from 'recharts';
import { useCivic } from '../context/CivicContext';
import {
  CATEGORY_COLORS,
  PRIORITY_STYLES,
  STATUS_STYLES,
  formatDate,
  getCommunityColor,
} from '../utils/styleHelpers';
import { CivicCategory } from '../types/civic';

interface DashboardPageProps {
  onNavigate: (page: string) => void;
  onOpenIssue: (id: string) => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({
  onNavigate,
  onOpenIssue,
}) => {
  const {
    issues,
    edges,
    globalMetrics,
    communitySummaries,
    alerts,
    dataQuality,
    datasetName,
  } = useCivic();

  // 1. KPI Calculations (Real derived data)
  const totalIssues = issues.length;
  const openIssues = issues.filter(
    (i) => i.status === 'reported' || i.status === 'in_progress' || i.status === 'under_review'
  ).length;
  const resolvedIssues = issues.filter(
    (i) => i.status === 'resolved' || i.status === 'closed'
  ).length;
  const highPriorityIssues = issues.filter(
    (i) => i.priority === 'high' || i.priority === 'critical'
  ).length;

  // Average Resolution Time (in days)
  const avgResolutionTime = useMemo(() => {
    const closed = issues.filter((i) => i.closedDate && i.createdDate);
    if (closed.length === 0) return null;
    const totalHours = closed.reduce((acc, cur) => {
      const created = new Date(cur.createdDate).getTime();
      const closedTime = new Date(cur.closedDate!).getTime();
      return acc + Math.max(0, (closedTime - created) / (1000 * 60 * 60));
    }, 0);
    const avgDays = totalHours / closed.length / 24;
    return Math.round(avgDays * 10) / 10;
  }, [issues]);

  // 2. Chart Data: Issues by Category
  const categoryChartData = useMemo(() => {
    const counts: Record<string, number> = {};
    issues.forEach((i) => {
      counts[i.category] = (counts[i.category] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([cat, count]) => ({
        name: CATEGORY_COLORS[cat as CivicCategory]?.label || cat,
        key: cat,
        count,
        fill: CATEGORY_COLORS[cat as CivicCategory]?.hex || '#06b6d4',
      }))
      .sort((a, b) => b.count - a.count);
  }, [issues]);

  // 3. Chart Data: Status Distribution
  const statusChartData = useMemo(() => {
    const counts: Record<string, number> = {
      reported: 0,
      in_progress: 0,
      under_review: 0,
      resolved: 0,
      closed: 0,
    };
    issues.forEach((i) => {
      counts[i.status] = (counts[i.status] || 0) + 1;
    });
    return [
      { name: 'Reported', value: counts.reported, color: '#94a3b8' },
      { name: 'In Progress', value: counts.in_progress, color: '#06b6d4' },
      { name: 'Under Review', value: counts.under_review, color: '#818cf8' },
      { name: 'Resolved', value: counts.resolved, color: '#10b981' },
      { name: 'Closed', value: counts.closed, color: '#475569' },
    ].filter((s) => s.value > 0);
  }, [issues]);

  // 4. Chart Data: Priority Distribution
  const priorityChartData = useMemo(() => {
    const counts: Record<string, number> = { low: 0, medium: 0, high: 0, critical: 0 };
    issues.forEach((i) => {
      counts[i.priority] = (counts[i.priority] || 0) + 1;
    });
    return [
      { name: 'Low', value: counts.low, fill: '#64748b' },
      { name: 'Medium', value: counts.medium, fill: '#3b82f6' },
      { name: 'High', value: counts.high, fill: '#f59e0b' },
      { name: 'Critical', value: counts.critical, fill: '#ef4444' },
    ];
  }, [issues]);

  // 5. Chart Data: Issues Over Time (Weekly/Daily aggregated)
  const timelineChartData = useMemo(() => {
    const dayMap = new Map<string, number>();
    issues.forEach((i) => {
      try {
        const d = new Date(i.createdDate);
        if (!isNaN(d.getTime())) {
          const key = d.toISOString().slice(5, 10); // MM-DD
          dayMap.set(key, (dayMap.get(key) || 0) + 1);
        }
      } catch {}
    });
    return Array.from(dayMap.entries())
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [issues]);

  // 6. Chart Data: Top Connected Issues
  const topConnectedIssues = useMemo(() => {
    const degMap = new Map<string, number>();
    issues.forEach((i) => degMap.set(i.id, 0));
    edges.forEach((e) => {
      degMap.set(e.source, (degMap.get(e.source) || 0) + 1);
      degMap.set(e.target, (degMap.get(e.target) || 0) + 1);
    });
    return issues
      .map((i) => ({
        id: i.id,
        complaintId: i.externalComplaintId,
        title: i.title,
        degree: degMap.get(i.id) || 0,
        category: i.category,
      }))
      .sort((a, b) => b.degree - a.degree)
      .slice(0, 6);
  }, [issues, edges]);

  // Recent 6 issues for quick inspection
  const recentIssues = useMemo(() => {
    return [...issues]
      .sort(
        (a, b) => new Date(b.createdDate).getTime() - new Date(a.createdDate).getTime()
      )
      .slice(0, 6);
  }, [issues]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Hero Strip */}
      <div className="relative rounded-2xl overflow-hidden border border-slate-800 bg-gradient-to-r from-slate-900 via-slate-900/90 to-cyan-950/40 p-6 shadow-xl">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs font-semibold text-cyan-400">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></span>
              <span>SMART CITY TOPOLOGY ENGINE</span>
              <span className="text-slate-600">·</span>
              <span className="text-slate-300 font-normal">Active Dataset: {datasetName}</span>
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">
              Civic Infrastructure Connectivity Hub
            </h1>
            <p className="text-xs text-slate-400 max-w-2xl">
              Real-time graph analytics mapping municipal problem propagation, cascading failures,
              and community clusters across urban sectors.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => onNavigate('network')}
              className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-slate-950 bg-cyan-400 hover:bg-cyan-300 rounded-lg transition-colors whitespace-nowrap shrink-0 shadow-sm cursor-pointer"
            >
              <Network className="w-4 h-4" />
              <span>Explore Graph Network</span>
            </button>
            <button
              onClick={() => onNavigate('map')}
              className="flex items-center gap-2 px-4 py-2 text-xs font-medium text-slate-200 bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-700 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <span>View Map</span>
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3">
        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800/80 space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Total Issues</span>
            <FileText className="w-3.5 h-3.5 text-cyan-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-white tabular-nums">
            {totalIssues}
          </div>
          <div className="text-[11px] text-slate-400">Active records</div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800/80 space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Open Issues</span>
            <Clock className="w-3.5 h-3.5 text-cyan-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-cyan-400 tabular-nums">
            {openIssues}
          </div>
          <div className="text-[11px] text-slate-400">In queue / triage</div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800/80 space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Resolved</span>
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-400 tabular-nums">
            {resolvedIssues}
          </div>
          <div className="text-[11px] text-slate-400">Closed or fixed</div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800/80 space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>High Priority</span>
            <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-rose-400 tabular-nums">
            {highPriorityIssues}
          </div>
          <div className="text-[11px] text-slate-400">High & Critical</div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800/80 space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Components</span>
            <Network className="w-3.5 h-3.5 text-indigo-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-indigo-300 tabular-nums">
            {globalMetrics.connectedComponentsCount}
          </div>
          <div className="text-[11px] text-slate-400">Connected subgraphs</div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800/80 space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Communities</span>
            <Users className="w-3.5 h-3.5 text-purple-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-purple-300 tabular-nums">
            {globalMetrics.communitiesCount}
          </div>
          <div className="text-[11px] text-slate-400">Louvain modularity</div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800/80 space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Avg Resolution</span>
            <TrendingUp className="w-3.5 h-3.5 text-teal-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-teal-300 tabular-nums">
            {avgResolutionTime !== null ? `${avgResolutionTime}d` : 'N/A'}
          </div>
          <div className="text-[11px] text-slate-400">Timestamp derived</div>
        </div>
      </div>

      {/* Primary Analytics Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Category Breakdown */}
        <div className="lg:col-span-2 p-5 rounded-xl bg-slate-900/80 border border-slate-800/80 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-white">Issues by Category</h3>
              <p className="text-xs text-slate-400">Distribution of municipal tickets</p>
            </div>
            <span className="text-xs font-mono text-slate-400">
              {categoryChartData.length} active sectors
            </span>
          </div>

          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={categoryChartData}
                margin={{ top: 10, right: 10, left: -20, bottom: 20 }}
              >
                <XAxis
                  dataKey="name"
                  tick={{ fill: '#94a3b8', fontSize: 11 }}
                  interval={0}
                  angle={-20}
                  textAnchor="end"
                />
                <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderColor: '#1e293b',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                  itemStyle={{ color: '#38bdf8' }}
                />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {categoryChartData.map((entry, idx) => (
                    <Cell key={`cell-${idx}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Status & Priority Proportions */}
        <div className="p-5 rounded-xl bg-slate-900/80 border border-slate-800/80 space-y-4 flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-semibold text-white">Status & Resolution State</h3>
            <p className="text-xs text-slate-400">Ticket operational lifecycle</p>
          </div>

          <div className="h-44 flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusChartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={45}
                  outerRadius={70}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {statusChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderColor: '#1e293b',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-slate-800/80">
            {statusChartData.map((s) => (
              <div key={s.name} className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: s.color }} />
                <span className="text-slate-300 truncate">{s.name}:</span>
                <span className="font-mono text-white font-semibold tabular-nums ml-auto">
                  {s.value}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Secondary Row: Timeline & Top Connected Issues */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Timeline Chart */}
        <div className="lg:col-span-2 p-5 rounded-xl bg-slate-900/80 border border-slate-800/80 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-white">Incident Timeline Flow</h3>
              <p className="text-xs text-slate-400">Complaint reporting frequency over time</p>
            </div>
            <span className="text-xs font-mono text-cyan-400">Chronological</span>
          </div>

          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={timelineChartData}
                margin={{ top: 10, right: 10, left: -20, bottom: 5 }}
              >
                <XAxis dataKey="date" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderColor: '#1e293b',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="count"
                  stroke="#06b6d4"
                  strokeWidth={2.5}
                  dot={{ fill: '#06b6d4', r: 3 }}
                  activeDot={{ r: 5, fill: '#38bdf8' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Most Connected Issues (High Hub Nodes) */}
        <div className="p-5 rounded-xl bg-slate-900/80 border border-slate-800/80 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-white">Most Connected Hubs</h3>
              <p className="text-xs text-slate-400">Highest topological degree nodes</p>
            </div>
            <button
              onClick={() => onNavigate('network')}
              className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
            >
              <span>Graph</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          <div className="space-y-2">
            {topConnectedIssues.map((hub) => (
              <div
                key={hub.id}
                onClick={() => onOpenIssue(hub.id)}
                className="p-2.5 rounded-lg bg-slate-950/40 border border-slate-800 hover:border-slate-700 cursor-pointer transition-colors flex items-center justify-between gap-3 text-xs"
              >
                <div className="min-w-0 space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-cyan-400 font-semibold">
                      {hub.complaintId}
                    </span>
                    <span className="text-slate-600">·</span>
                    <span className="text-slate-400 truncate">{hub.category}</span>
                  </div>
                  <div className="text-slate-300 truncate font-medium">{hub.title}</div>
                </div>
                <div className="text-right shrink-0">
                  <span className="font-mono text-cyan-400 font-bold tabular-nums">
                    {hub.degree}
                  </span>
                  <div className="text-[10px] text-slate-400">edges</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Third Row: Recent Issues Table & Data Quality / Alerts Snippet */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Issues Table */}
        <div className="lg:col-span-2 p-5 rounded-xl bg-slate-900/80 border border-slate-800/80 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-white">Recent Civic Complaints</h3>
              <p className="text-xs text-slate-400">Chronological feed of recorded tickets</p>
            </div>
            <button
              onClick={() => onNavigate('issues')}
              className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
            >
              <span>View All ({issues.length})</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400">
                  <th className="pb-2 font-medium">Ticket ID</th>
                  <th className="pb-2 font-medium">Title & Location</th>
                  <th className="pb-2 font-medium">Category</th>
                  <th className="pb-2 font-medium">Priority</th>
                  <th className="pb-2 font-medium">Status</th>
                  <th className="pb-2 font-medium text-right">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {recentIssues.map((issue) => {
                  const pri = PRIORITY_STYLES[issue.priority];
                  const stat = STATUS_STYLES[issue.status];
                  return (
                    <tr
                      key={issue.id}
                      onClick={() => onOpenIssue(issue.id)}
                      className="hover:bg-slate-800/40 cursor-pointer transition-colors"
                    >
                      <td className="py-2.5 font-mono text-cyan-400 font-medium whitespace-nowrap">
                        {issue.externalComplaintId}
                      </td>
                      <td className="py-2.5 max-w-[240px]">
                        <div className="text-slate-200 font-medium truncate">{issue.title}</div>
                        <div className="text-slate-400 text-[11px] truncate">
                          {issue.locationName}
                        </div>
                      </td>
                      <td className="py-2.5 whitespace-nowrap text-slate-300">
                        {CATEGORY_COLORS[issue.category]?.label || issue.category}
                      </td>
                      <td className={`py-2.5 font-medium whitespace-nowrap ${pri.text}`}>
                        {pri.label}
                      </td>
                      <td className={`py-2.5 font-medium whitespace-nowrap ${stat.text}`}>
                        {stat.label}
                      </td>
                      <td className="py-2.5 text-right font-mono text-slate-400 whitespace-nowrap">
                        {formatDate(issue.createdDate)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Data Quality & Alert Summary Card */}
        <div className="space-y-4">
          {/* Data Quality */}
          <div className="p-5 rounded-xl bg-slate-900/80 border border-slate-800/80 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                Data Quality Audit
              </h3>
              <span className="font-mono text-sm font-bold text-emerald-400 tabular-nums">
                {dataQuality.overallScore}%
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Evaluated against coordinate validity, date schemas, and duplicate signatures.
            </p>
            <div className="space-y-1.5 text-xs text-slate-300">
              <div className="flex justify-between">
                <span className="text-slate-400">Valid Records:</span>
                <span className="font-mono">{dataQuality.validRecords} / {dataQuality.totalRecords}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Missing GPS Coords:</span>
                <span className="font-mono text-amber-400">{dataQuality.missingCoordinates}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Potential Duplicates:</span>
                <span className="font-mono text-slate-400">{dataQuality.potentialDuplicates}</span>
              </div>
            </div>
          </div>

          {/* Active Alerts Teaser */}
          <div className="p-5 rounded-xl bg-slate-900/80 border border-slate-800/80 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                Rule-Based Alerts ({alerts.length})
              </h3>
              <button
                onClick={() => onNavigate('alerts')}
                className="text-xs text-cyan-400 hover:text-cyan-300"
              >
                Inspect
              </button>
            </div>
            {alerts.length === 0 ? (
              <p className="text-xs text-slate-400">No active rule alerts triggered.</p>
            ) : (
              <div className="space-y-2">
                {alerts.slice(0, 2).map((a) => (
                  <div
                    key={a.id}
                    onClick={() => onNavigate('alerts')}
                    className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800 hover:border-slate-700 cursor-pointer transition-colors text-xs space-y-1"
                  >
                    <div className="font-medium text-slate-200 truncate">{a.title}</div>
                    <div className="text-[11px] text-slate-400 line-clamp-2">
                      {a.description}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
