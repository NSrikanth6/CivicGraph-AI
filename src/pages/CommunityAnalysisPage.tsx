import React from 'react';
import {
  Users,
  Network,
  Share2,
  MapPin,
  ExternalLink,
  Tag,
  Activity,
  Layers,
  ArrowRight,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
} from 'recharts';
import { useCivic } from '../context/CivicContext';
import {
  CATEGORY_COLORS,
  getCommunityColor,
  PRIORITY_STYLES,
  STATUS_STYLES,
} from '../utils/styleHelpers';
import { CommunitySummary, CivicCategory, IssueStatus } from '../types/civic';

interface CommunityAnalysisPageProps {
  onNavigate: (page: string) => void;
  onOpenIssue: (id: string) => void;
}

export const CommunityAnalysisPage: React.FC<CommunityAnalysisPageProps> = ({
  onNavigate,
  onOpenIssue,
}) => {
  const {
    communitySummaries,
    globalMetrics,
    setSelectedCommunityId,
    issues,
  } = useCivic();

  const handleInspectInGraph = (communityId: number) => {
    setSelectedCommunityId(communityId);
    onNavigate('network');
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header and Algorithmic Grounding */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-xl bg-slate-900/80 border border-slate-800/80">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-semibold text-purple-400">
            <Users className="w-4 h-4" />
            <span>TOPOLOGICAL MODULARITY PARTITIONING</span>
          </div>
          <h1 className="text-xl font-bold text-white tracking-tight">
            Louvain Community Clustering Analysis
          </h1>
          <p className="text-xs text-slate-400 max-w-2xl">
            Unsupervised community detection optimizing graph modularity (Q ={' '}
            <span className="font-mono text-purple-300 font-semibold">
              {globalMetrics.modularity.toFixed(3)}
            </span>
            ). Identifies densely interconnected municipal failure cohorts and their cross-boundary spillover.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 text-center">
            <div className="text-[11px] text-slate-400">Communities</div>
            <div className="text-lg font-bold font-mono text-purple-400 tabular-nums">
              {globalMetrics.communitiesCount}
            </div>
          </div>
          <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 text-center">
            <div className="text-[11px] text-slate-400">Graph Modularity</div>
            <div className="text-lg font-bold font-mono text-cyan-400 tabular-nums">
              {globalMetrics.modularity.toFixed(3)}
            </div>
          </div>
        </div>
      </div>

      {/* Community Cards Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {communitySummaries.map((comm) => {
          const color = getCommunityColor(comm.communityId);

          // Dominant category chart data
          const catChartData = comm.dominantCategories.map((c) => ({
            name: CATEGORY_COLORS[c.category]?.label || c.category,
            count: c.count,
            fill: CATEGORY_COLORS[c.category]?.hex || '#06b6d4',
          }));

          return (
            <div
              key={comm.communityId}
              className="p-5 rounded-xl bg-slate-900/80 border border-slate-800/80 flex flex-col justify-between space-y-4 hover:border-slate-700/80 transition-all shadow-lg"
            >
              {/* Card Header */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center font-mono font-bold text-base text-slate-950 shadow-md"
                    style={{ backgroundColor: color }}
                  >
                    #{comm.communityId}
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-white">
                      Community #{comm.communityId}
                    </h3>
                    <div className="flex items-center gap-2 text-xs text-slate-400">
                      <span className="font-mono text-cyan-400 font-semibold tabular-nums">
                        {comm.issueCount}
                      </span>{' '}
                      civic issues
                      <span className="text-slate-600">·</span>
                      <span className="font-mono text-slate-300 tabular-nums">
                        {comm.internalEdgesCount}
                      </span>{' '}
                      internal edges
                      <span className="text-slate-600">·</span>
                      <span className="font-mono text-amber-400 tabular-nums">
                        {comm.crossCommunityEdgesCount}
                      </span>{' '}
                      cross-boundary
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => handleInspectInGraph(comm.communityId)}
                  className="px-3 py-1.5 rounded-lg bg-slate-950 hover:bg-slate-800 text-cyan-400 hover:text-cyan-300 border border-slate-800 transition-colors text-xs font-medium flex items-center gap-1.5 shrink-0 cursor-pointer"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span>Highlight in Graph</span>
                </button>
              </div>

              {/* Dominant Categories Distribution */}
              <div className="space-y-2">
                <div className="text-xs uppercase tracking-wider font-semibold text-slate-400">
                  Dominant Infrastructure Categories
                </div>
                <div className="h-28">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={catChartData}
                      layout="vertical"
                      margin={{ top: 0, right: 20, left: 20, bottom: 0 }}
                    >
                      <XAxis type="number" hide />
                      <YAxis
                        type="category"
                        dataKey="name"
                        tick={{ fill: '#94a3b8', fontSize: 11 }}
                        width={130}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#0f172a',
                          borderColor: '#1e293b',
                          borderRadius: '8px',
                          fontSize: '11px',
                        }}
                      />
                      <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                        {catChartData.map((entry, idx) => (
                          <Cell key={`cat-${idx}`} fill={entry.fill} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Geographic Footprint & Common Sites */}
              <div className="space-y-1.5 text-xs">
                <div className="text-[11px] uppercase tracking-wider font-semibold text-slate-400 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-cyan-400" />
                  Primary Municipal Sites
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {comm.commonLocations.map((loc) => (
                    <span
                      key={loc.location}
                      className="px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-slate-300 text-[11px]"
                    >
                      {loc.location} ({loc.count})
                    </span>
                  ))}
                </div>
              </div>

              {/* Highly Connected Hub Members */}
              <div className="space-y-2 pt-2 border-t border-slate-800/80">
                <div className="text-[11px] uppercase tracking-wider font-semibold text-slate-400 flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5 text-purple-400" />
                  Key Anchor Nodes in this Community
                </div>
                <div className="space-y-1.5">
                  {comm.mostConnectedIssues.map((hub) => (
                    <div
                      key={hub.id}
                      onClick={() => onOpenIssue(hub.id)}
                      className="p-2 rounded-lg bg-slate-950/60 border border-slate-800/80 hover:border-slate-700 cursor-pointer transition-colors flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="min-w-0">
                        <div className="text-slate-200 font-medium truncate">{hub.title}</div>
                        <div className="text-[11px] text-slate-400 truncate">
                          {CATEGORY_COLORS[hub.category]?.label || hub.category}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="font-mono text-cyan-400 font-semibold tabular-nums">
                          {hub.degree}
                        </span>{' '}
                        <span className="text-[10px] text-slate-400">deg</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Status Breakdown row */}
              <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between text-[11px] text-slate-400">
                <span>Lifecycle State:</span>
                <div className="flex items-center gap-3 font-mono">
                  {Object.entries(comm.statusDistribution).map(([status, cnt]) => {
                    const stStyle = STATUS_STYLES[status as IssueStatus];
                    return (
                      <span key={status} className={stStyle ? stStyle.text : 'text-slate-400'}>
                        {status}: {cnt}
                      </span>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
