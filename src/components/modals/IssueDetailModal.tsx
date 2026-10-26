import React from 'react';
import {
  X,
  MapPin,
  Calendar,
  Building2,
  Share2,
  Trash2,
  ExternalLink,
  Tag,
  CheckCircle2,
  Clock,
  Layers,
  Activity,
} from 'lucide-react';
import { useCivic } from '../../context/CivicContext';
import {
  CATEGORY_COLORS,
  PRIORITY_STYLES,
  STATUS_STYLES,
  RELATIONSHIP_LABELS,
  formatDate,
  getCommunityColor,
} from '../../utils/styleHelpers';
import { IssueStatus } from '../../types/civic';

interface IssueDetailModalProps {
  issueId: string;
  onClose: () => void;
  onFocusInGraph?: (id: string) => void;
}

export const IssueDetailModal: React.FC<IssueDetailModalProps> = ({
  issueId,
  onClose,
  onFocusInGraph,
}) => {
  const {
    issues,
    edges,
    nodeMetrics,
    updateIssue,
    deleteIssue,
    setSelectedIssueId,
  } = useCivic();

  const issue = issues.find((i) => i.id === issueId);
  if (!issue) return null;

  const metrics = nodeMetrics.get(issueId);

  // Connected edges
  const incidentEdges = edges.filter(
    (e) => e.source === issueId || e.target === issueId
  );

  const neighborIssues = incidentEdges.map((e) => {
    const otherId = e.source === issueId ? e.target : e.source;
    const neighbor = issues.find((i) => i.id === otherId);
    return {
      edge: e,
      neighbor,
    };
  });

  const catStyle = CATEGORY_COLORS[issue.category];
  const priStyle = PRIORITY_STYLES[issue.priority];
  const statStyle = STATUS_STYLES[issue.status];
  const communityColor = metrics ? getCommunityColor(metrics.communityId) : '#06b6d4';

  const handleStatusChange = (newStatus: IssueStatus) => {
    const isNowResolved = newStatus === 'resolved' || newStatus === 'closed';
    updateIssue(issue.id, {
      status: newStatus,
      closedDate: isNowResolved ? new Date().toISOString() : null,
    });
  };

  const handleDelete = () => {
    if (confirm(`Are you sure you want to delete complaint record ${issue.externalComplaintId}?`)) {
      deleteIssue(issue.id);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-3xl max-h-[90vh] bg-slate-900 border border-slate-800 rounded-xl shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-start justify-between gap-4 bg-slate-950/60">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5 text-xs">
              <span className="font-mono text-cyan-400 font-semibold">
                {issue.externalComplaintId}
              </span>
              <span className="text-slate-600">·</span>
              <span className={`font-medium ${catStyle.text}`}>{catStyle.label}</span>
              <span className="text-slate-600">·</span>
              <span className={`font-medium ${priStyle.text}`}>{priStyle.label} Priority</span>
              <span className="text-slate-600">·</span>
              <span className={`font-medium ${statStyle.text}`}>{statStyle.label}</span>
            </div>
            <h2 className="text-lg font-semibold text-white tracking-tight">{issue.title}</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Description */}
          <div>
            <h4 className="text-xs uppercase font-semibold text-slate-400 tracking-wider mb-1.5">
              Complaint Narrative & Description
            </h4>
            <p className="text-sm text-slate-300 leading-relaxed bg-slate-950/40 p-3 rounded-lg border border-slate-800/80">
              {issue.description}
            </p>
          </div>

          {/* Metadata Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-3.5 rounded-lg bg-slate-950/40 border border-slate-800/80 space-y-2.5 text-xs">
              <div className="flex items-start gap-2.5 text-slate-300">
                <MapPin className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                <div>
                  <div className="text-slate-400 text-[11px]">Reported Location</div>
                  <div className="font-medium text-slate-200">{issue.locationName}</div>
                  {issue.latitude !== null && issue.longitude !== null ? (
                    <div className="font-mono text-[11px] text-slate-400">
                      GPS: {issue.latitude.toFixed(5)}, {issue.longitude.toFixed(5)}
                    </div>
                  ) : (
                    <div className="text-amber-400/90 text-[11px]">No GPS Coordinates Listed</div>
                  )}
                </div>
              </div>

              <div className="flex items-start gap-2.5 text-slate-300 pt-2 border-t border-slate-800/60">
                <Building2 className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                <div>
                  <div className="text-slate-400 text-[11px]">Responsible Municipal Agency</div>
                  <div className="font-medium text-slate-200">{issue.responsibleAgency}</div>
                </div>
              </div>

              {issue.infrastructureId && (
                <div className="flex items-start gap-2.5 text-slate-300 pt-2 border-t border-slate-800/60">
                  <Layers className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
                  <div>
                    <div className="text-slate-400 text-[11px]">Municipal Infrastructure ID</div>
                    <div className="font-mono text-purple-300 font-semibold">
                      {issue.infrastructureId}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="p-3.5 rounded-lg bg-slate-950/40 border border-slate-800/80 space-y-2.5 text-xs">
              <div className="flex items-start gap-2.5 text-slate-300">
                <Calendar className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                <div>
                  <div className="text-slate-400 text-[11px]">Timeline & Lifecycle</div>
                  <div className="text-slate-300">Created: {formatDate(issue.createdDate)}</div>
                  <div className="text-slate-400 text-[11px]">Updated: {formatDate(issue.updatedDate)}</div>
                  {issue.closedDate && (
                    <div className="text-emerald-400 text-[11px]">
                      Resolved: {formatDate(issue.closedDate)}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-start gap-2.5 text-slate-300 pt-2 border-t border-slate-800/60">
                <Tag className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                <div>
                  <div className="text-slate-400 text-[11px]">Classification</div>
                  <div className="text-slate-300">Subcategory: {issue.subcategory}</div>
                  <div className="text-slate-400 text-[11px]">Source: {issue.sourceDataset}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Graph Node Topology Metrics */}
          {metrics && (
            <div className="p-4 rounded-lg bg-slate-950/60 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs uppercase font-semibold text-slate-400 tracking-wider flex items-center gap-2">
                  <Activity className="w-3.5 h-3.5 text-cyan-400" />
                  Graph Analytics & Node Centrality
                </h4>
                <div className="flex items-center gap-2 text-xs">
                  <span
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: communityColor }}
                  />
                  <span className="text-slate-300 font-medium">
                    Community #{metrics.communityId}
                  </span>
                  <span className="text-slate-600">·</span>
                  <span className="text-slate-400 font-mono">
                    Component #{metrics.componentId}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="p-2.5 rounded-md bg-slate-900 border border-slate-800/80">
                  <div className="text-[11px] text-slate-400">Node Degree</div>
                  <div className="text-base font-bold font-mono text-cyan-400 tabular-nums">
                    {metrics.degree}
                  </div>
                  <div className="text-[10px] text-slate-400">direct edges</div>
                </div>
                <div className="p-2.5 rounded-md bg-slate-900 border border-slate-800/80">
                  <div className="text-[11px] text-slate-400">Degree Centrality</div>
                  <div className="text-base font-bold font-mono text-slate-200 tabular-nums">
                    {metrics.degreeCentrality.toFixed(3)}
                  </div>
                  <div className="text-[10px] text-slate-400">k / (N - 1)</div>
                </div>
                <div className="p-2.5 rounded-md bg-slate-900 border border-slate-800/80">
                  <div className="text-[11px] text-slate-400">Betweenness Centrality</div>
                  <div className="text-base font-bold font-mono text-purple-400 tabular-nums">
                    {metrics.betweennessCentrality.toFixed(4)}
                  </div>
                  <div className="text-[10px] text-slate-400">Brandes CB</div>
                </div>
              </div>
            </div>
          )}

          {/* Connected Edges & Evidence */}
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <h4 className="text-xs uppercase font-semibold text-slate-400 tracking-wider">
                Connected Issues ({neighborIssues.length})
              </h4>
              {onFocusInGraph && (
                <button
                  onClick={() => {
                    onClose();
                    onFocusInGraph(issue.id);
                  }}
                  className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1 transition-colors"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  Inspect in Graph Canvas
                </button>
              )}
            </div>

            {neighborIssues.length === 0 ? (
              <div className="p-4 rounded-lg bg-slate-950/40 border border-slate-800/80 text-center text-xs text-slate-400">
                This complaint is currently an isolated node (degree = 0). No shared infrastructure, proximity, or cascade relationships meet the threshold.
              </div>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {neighborIssues.map(({ edge, neighbor }) => {
                  if (!neighbor) return null;
                  const relMeta = RELATIONSHIP_LABELS[edge.relationshipType];
                  return (
                    <div
                      key={edge.id}
                      onClick={() => setSelectedIssueId(neighbor.id)}
                      className="p-3 rounded-lg bg-slate-950/50 border border-slate-800 hover:border-slate-700 cursor-pointer transition-colors flex items-start justify-between gap-3 text-xs"
                    >
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-cyan-400 font-semibold">
                            {neighbor.externalComplaintId}
                          </span>
                          <span className="text-slate-600">·</span>
                          <span
                            className="font-semibold text-[11px]"
                            style={{ color: relMeta.color }}
                          >
                            {relMeta.label} (w={edge.weight})
                          </span>
                          <span className="text-slate-600">·</span>
                          <span className="text-slate-400 truncate">{neighbor.category}</span>
                        </div>
                        <div className="text-slate-300 font-medium truncate">{neighbor.title}</div>
                        <div className="text-[11px] text-slate-400 italic">{edge.evidence}</div>
                      </div>
                      <ExternalLink className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-1" />
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer actions */}
        <div className="px-6 py-3.5 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">Update Status:</span>
            <select
              value={issue.status}
              onChange={(e) => handleStatusChange(e.target.value as IssueStatus)}
              className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
            >
              <option value="reported">Reported</option>
              <option value="in_progress">In Progress</option>
              <option value="under_review">Under Review</option>
              <option value="resolved">Resolved</option>
              <option value="closed">Closed</option>
            </select>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleDelete}
              className="px-3 py-1.5 text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-950/30 rounded-lg transition-colors flex items-center gap-1.5"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Delete Record
            </button>
            <button
              onClick={onClose}
              className="px-4 py-1.5 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
