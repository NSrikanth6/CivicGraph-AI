import React, { useMemo } from 'react';
import {
  TrendingUp,
  Activity,
  Layers,
  Building2,
  Clock,
  ArrowRight,
  GitFork,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
} from 'recharts';
import { useCivic } from '../context/CivicContext';
import { CATEGORY_COLORS } from '../utils/styleHelpers';
import { CivicCategory } from '../types/civic';

export const TrendsPage: React.FC = () => {
  const { issues, edges } = useCivic();

  // 1. Agency Performance (Resolution Velocity & Ticket Volume)
  const agencyMetrics = useMemo(() => {
    const map = new Map<
      string,
      { total: number; resolved: number; totalHours: number; validTimeCount: number }
    >();

    issues.forEach((i) => {
      const agency = i.responsibleAgency || 'Unassigned';
      if (!map.has(agency)) {
        map.set(agency, { total: 0, resolved: 0, totalHours: 0, validTimeCount: 0 });
      }
      const data = map.get(agency)!;
      data.total++;
      if (i.status === 'resolved' || i.status === 'closed') {
        data.resolved++;
        if (i.closedDate && i.createdDate) {
          const diffHours =
            (new Date(i.closedDate).getTime() - new Date(i.createdDate).getTime()) /
            (1000 * 60 * 60);
          if (diffHours >= 0) {
            data.totalHours += diffHours;
            data.validTimeCount++;
          }
        }
      }
    });

    return Array.from(map.entries())
      .map(([agency, data]) => {
        const avgDays =
          data.validTimeCount > 0
            ? Math.round((data.totalHours / data.validTimeCount / 24) * 10) / 10
            : null;
        const resolutionRate =
          data.total > 0 ? Math.round((data.resolved / data.total) * 100) : 0;
        return {
          agency,
          total: data.total,
          resolved: data.resolved,
          avgDays,
          resolutionRate,
        };
      })
      .sort((a, b) => b.total - a.total);
  }, [issues]);

  // 2. Cross-Category Failure Co-occurrence (derived from edges!)
  const crossCategoryCorrelations = useMemo(() => {
    const pairMap = new Map<string, number>();

    const issueCatMap = new Map<string, CivicCategory>();
    issues.forEach((i) => issueCatMap.set(i.id, i.category));

    edges.forEach((e) => {
      const c1 = issueCatMap.get(e.source);
      const c2 = issueCatMap.get(e.target);
      if (c1 && c2 && c1 !== c2) {
        const pair = c1 < c2 ? `${c1}:::${c2}` : `${c2}:::${c1}`;
        pairMap.set(pair, (pairMap.get(pair) || 0) + 1);
      }
    });

    return Array.from(pairMap.entries())
      .map(([pair, count]) => {
        const [catA, catB] = pair.split(':::') as [CivicCategory, CivicCategory];
        return {
          catA,
          catB,
          labelA: CATEGORY_COLORS[catA]?.label || catA,
          labelB: CATEGORY_COLORS[catB]?.label || catB,
          count,
        };
      })
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);
  }, [issues, edges]);

  // 3. Category Resolution Times
  const categoryResolutionTimes = useMemo(() => {
    const map = new Map<string, { totalHours: number; count: number }>();

    issues.forEach((i) => {
      if ((i.status === 'resolved' || i.status === 'closed') && i.closedDate && i.createdDate) {
        const diff =
          (new Date(i.closedDate).getTime() - new Date(i.createdDate).getTime()) /
          (1000 * 60 * 60 * 24);
        if (diff >= 0) {
          if (!map.has(i.category)) map.set(i.category, { totalHours: 0, count: 0 });
          const curr = map.get(i.category)!;
          curr.totalHours += diff;
          curr.count++;
        }
      }
    });

    return Array.from(map.entries())
      .map(([cat, val]) => ({
        category: CATEGORY_COLORS[cat as CivicCategory]?.label || cat,
        avgDays: Math.round((val.totalHours / val.count) * 10) / 10,
        fill: CATEGORY_COLORS[cat as CivicCategory]?.hex || '#06b6d4',
      }))
      .sort((a, b) => b.avgDays - a.avgDays);
  }, [issues]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-xl bg-slate-900/80 border border-slate-800/80">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-semibold text-cyan-400">
            <TrendingUp className="w-4 h-4" />
            <span>MUNICIPAL VELOCITY & PATTERN RECOGNITION</span>
          </div>
          <h1 className="text-xl font-bold text-white tracking-tight">
            Trends, Latency & Cross-Infrastructure Cascades
          </h1>
          <p className="text-xs text-slate-400 max-w-2xl">
            Empirical analysis of complaint resolution speed across departments and cross-category
            infrastructure failure chains.
          </p>
        </div>
      </div>

      {/* Grid: Agency Responsiveness & Cascade Failures */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Agency Responsiveness */}
        <div className="p-5 rounded-xl bg-slate-900/80 border border-slate-800/80 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <Building2 className="w-4 h-4 text-blue-400" />
              Departmental Workload & Resolution Rates
            </h3>
            <span className="text-xs font-mono text-slate-400">
              {agencyMetrics.length} agencies
            </span>
          </div>

          <div className="space-y-3">
            {agencyMetrics.map((agency) => (
              <div
                key={agency.agency}
                className="p-3 rounded-lg bg-slate-950/60 border border-slate-800 space-y-2 text-xs"
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium text-slate-200">{agency.agency}</span>
                  <div className="flex items-center gap-2 font-mono">
                    <span className="text-slate-400">{agency.total} tickets</span>
                    <span className="text-slate-600">·</span>
                    <span className="text-emerald-400 font-semibold">
                      {agency.resolutionRate}% resolved
                    </span>
                  </div>
                </div>

                <div className="w-full bg-slate-900 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-blue-500 to-emerald-400 h-full rounded-full transition-all duration-300"
                    style={{ width: `${agency.resolutionRate}%` }}
                  />
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <span>
                    Closed: {agency.resolved} / {agency.total}
                  </span>
                  <span>
                    Avg turnaround:{' '}
                    <strong className="text-slate-200 font-mono">
                      {agency.avgDays !== null ? `${agency.avgDays} days` : 'Pending data'}
                    </strong>
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Cross-Infrastructure Cascade Failures */}
        <div className="p-5 rounded-xl bg-slate-900/80 border border-slate-800/80 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <GitFork className="w-4 h-4 text-rose-400" />
              Cross-Category Cascade Linkages
            </h3>
            <span className="text-xs font-mono text-slate-400">Top topological couplings</span>
          </div>

          <p className="text-xs text-slate-400">
            Detected multi-domain dependencies where physical failure in one municipal subsystem
            directly impacts another (e.g., water pipe burst triggering road sinkholes).
          </p>

          <div className="space-y-2.5">
            {crossCategoryCorrelations.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-400 bg-slate-950/40 rounded-lg border border-slate-800">
                No cross-category edges meet the current confidence and proximity thresholds.
              </div>
            ) : (
              crossCategoryCorrelations.map((pair, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-lg bg-slate-950/60 border border-slate-800 flex items-center justify-between gap-3 text-xs"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className={`font-semibold ${CATEGORY_COLORS[pair.catA]?.text}`}>
                      {pair.labelA}
                    </span>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                    <span className={`font-semibold ${CATEGORY_COLORS[pair.catB]?.text}`}>
                      {pair.labelB}
                    </span>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="font-mono text-cyan-400 font-bold tabular-nums">
                      {pair.count}
                    </span>{' '}
                    <span className="text-[10px] text-slate-400">coupled edges</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Category Resolution Time Chart */}
      {categoryResolutionTimes.length > 0 && (
        <div className="p-5 rounded-xl bg-slate-900/80 border border-slate-800/80 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <Clock className="w-4 h-4 text-teal-400" />
              Average Days to Resolution by Sector
            </h3>
            <span className="text-xs font-mono text-slate-400">Calculated from closed tickets</span>
          </div>

          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={categoryResolutionTimes}
                margin={{ top: 10, right: 10, left: -20, bottom: 20 }}
              >
                <XAxis
                  dataKey="category"
                  tick={{ fill: '#94a3b8', fontSize: 11 }}
                  angle={-15}
                  textAnchor="end"
                />
                <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderColor: '#1e293b',
                    borderRadius: '8px',
                    fontSize: '11px',
                  }}
                  formatter={(val: any) => [`${val} days`, 'Avg Resolution Time']}
                />
                <Bar dataKey="avgDays" radius={[4, 4, 0, 0]}>
                  {categoryResolutionTimes.map((entry, idx) => (
                    <Cell key={`bar-${idx}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
};
