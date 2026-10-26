import React, { useState } from 'react';
import {
  Bell,
  AlertTriangle,
  Info,
  ShieldAlert,
  Clock,
  MapPin,
  ExternalLink,
  Filter,
  CheckCircle2,
  Code2,
} from 'lucide-react';
import { useCivic } from '../context/CivicContext';
import { formatDate } from '../utils/styleHelpers';

interface AlertsPageProps {
  onOpenIssue: (id: string) => void;
  onNavigate: (page: string) => void;
}

export const AlertsPage: React.FC<AlertsPageProps> = ({ onOpenIssue, onNavigate }) => {
  const { alerts, issues } = useCivic();
  const [severityFilter, setSeverityFilter] = useState<'all' | 'critical' | 'warning' | 'info'>('all');

  const filteredAlerts = alerts.filter((a) => {
    if (severityFilter !== 'all' && a.severity !== severityFilter) return false;
    return true;
  });

  const getSeverityBadge = (severity: 'info' | 'warning' | 'critical') => {
    switch (severity) {
      case 'critical':
        return {
          bg: 'bg-rose-500/10',
          text: 'text-rose-400',
          border: 'border-rose-500/30',
          label: 'Critical Alert',
          icon: ShieldAlert,
        };
      case 'warning':
        return {
          bg: 'bg-amber-500/10',
          text: 'text-amber-400',
          border: 'border-amber-500/30',
          label: 'Operational Warning',
          icon: AlertTriangle,
        };
      case 'info':
        return {
          bg: 'bg-blue-500/10',
          text: 'text-blue-400',
          border: 'border-blue-500/30',
          label: 'Audit Notice',
          icon: Info,
        };
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-xl bg-slate-900/80 border border-slate-800/80">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-semibold text-rose-400">
            <Bell className="w-4 h-4" />
            <span>TRANSPARENT DETERMINISTIC SURVEILLANCE</span>
          </div>
          <h1 className="text-xl font-bold text-white tracking-tight">
            Municipal Operations Rule-Based Alerts
          </h1>
          <p className="text-xs text-slate-400 max-w-2xl">
            Strictly rule-governed event triggers. Every alert explicitly exposes its deterministic
            mathematical invariant and topological threshold — with zero black-box pseudo-AI hallucinations.
          </p>
        </div>

        {/* Severity Filter Tabs */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-950 border border-slate-800 rounded-lg text-xs shrink-0">
          {(['all', 'critical', 'warning', 'info'] as const).map((sev) => (
            <button
              key={sev}
              onClick={() => setSeverityFilter(sev)}
              className={`px-3 py-1.5 rounded-md font-medium transition-colors uppercase text-[11px] ${
                severityFilter === sev
                  ? 'bg-slate-800 text-white font-semibold shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {sev}
            </button>
          ))}
        </div>
      </div>

      {/* Alert Feed */}
      {filteredAlerts.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-slate-900/40 border border-slate-800 space-y-2">
          <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto" />
          <h3 className="text-base font-semibold text-white">All Invariants Nominal</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            No active municipal rule violations match current filter criteria.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredAlerts.map((alert) => {
            const badge = getSeverityBadge(alert.severity);
            const Icon = badge.icon;

            const relatedIssues = alert.affectedIssues
              .map((id) => issues.find((i) => i.id === id))
              .filter(Boolean);

            return (
              <div
                key={alert.id}
                className="p-5 rounded-xl bg-slate-900/80 border border-slate-800/80 space-y-4 hover:border-slate-700/80 transition-all shadow-lg"
              >
                {/* Header row */}
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-lg ${badge.bg} border ${badge.border} mt-0.5`}>
                      <Icon className={`w-4 h-4 ${badge.text}`} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 text-xs">
                        <span className={`font-semibold ${badge.text}`}>{badge.label}</span>
                        <span className="text-slate-600">·</span>
                        <span className="text-slate-400 font-mono text-[11px]">
                          {formatDate(alert.timestamp)}
                        </span>
                      </div>
                      <h3 className="text-base font-semibold text-white mt-0.5">{alert.title}</h3>
                    </div>
                  </div>
                </div>

                {/* Narrative description */}
                <p className="text-xs text-slate-300 leading-relaxed pl-11">
                  {alert.description}
                </p>

                {/* Algorithmic rule explanation box */}
                <div className="ml-11 p-3 rounded-lg bg-slate-950/80 border border-slate-800/80 text-xs space-y-1">
                  <div className="text-[11px] font-semibold text-cyan-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Code2 className="w-3.5 h-3.5" />
                    Exact Mathematical Invariant Trigger
                  </div>
                  <div className="font-mono text-[11px] text-slate-300">
                    {alert.ruleExplanation}
                  </div>
                </div>

                {/* Affected tickets */}
                {relatedIssues.length > 0 && (
                  <div className="ml-11 pt-2 border-t border-slate-800/60 space-y-2">
                    <div className="text-[11px] uppercase tracking-wider font-semibold text-slate-400">
                      Flagged Complaint Records ({relatedIssues.length})
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                      {relatedIssues.slice(0, 6).map((issue: any) => (
                        <div
                          key={issue.id}
                          onClick={() => onOpenIssue(issue.id)}
                          className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800 hover:border-slate-700 cursor-pointer transition-colors flex items-center justify-between gap-2 text-xs"
                        >
                          <div className="min-w-0">
                            <span className="font-mono text-cyan-400 font-semibold text-[11px]">
                              {issue.externalComplaintId}
                            </span>
                            <div className="text-slate-300 truncate font-medium">{issue.title}</div>
                          </div>
                          <ExternalLink className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
