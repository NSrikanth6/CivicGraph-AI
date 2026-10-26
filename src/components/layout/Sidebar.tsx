import React, { useState } from 'react';
import {
  LayoutDashboard,
  FileSpreadsheet,
  Network,
  Users,
  MapPin,
  TrendingUp,
  Bell,
  UploadCloud,
  FileText,
  Settings,
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
} from 'lucide-react';
import { useCivic } from '../../context/CivicContext';

interface SidebarProps {
  currentPage: string;
  onNavigate: (page: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentPage, onNavigate }) => {
  const [collapsed, setCollapsed] = useState(false);
  const { alerts, globalMetrics } = useCivic();

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'issues', label: 'Civic Issues', icon: FileSpreadsheet },
    { id: 'network', label: 'Network Explorer', icon: Network },
    { id: 'communities', label: 'Community Analysis', icon: Users },
    { id: 'map', label: 'Hotspot Map', icon: MapPin },
    { id: 'trends', label: 'Trends & Insights', icon: TrendingUp },
    {
      id: 'alerts',
      label: 'Alerts',
      icon: Bell,
      badge: alerts.length > 0 ? alerts.length : null,
      badgeColor: alerts.some((a) => a.severity === 'critical')
        ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
        : 'bg-amber-500/20 text-amber-300 border-amber-500/40',
    },
    { id: 'import', label: 'Data Import', icon: UploadCloud },
    { id: 'reports', label: 'Reports', icon: FileText },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <aside
      className={`relative flex flex-col border-r border-slate-800/80 bg-slate-950/95 transition-all duration-200 z-20 shrink-0 ${
        collapsed ? 'w-18' : 'w-64'
      }`}
    >
      {/* Sidebar Header / Brand collapse button */}
      <div className="h-14 flex items-center justify-between px-4 border-b border-slate-800/60">
        {!collapsed && (
          <div className="flex items-center gap-2">
            <span className="text-xs uppercase tracking-wider font-semibold text-slate-400">
              City Graph Operations
            </span>
          </div>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className={`p-1.5 rounded-md hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors ${
            collapsed ? 'mx-auto' : ''
          }`}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Navigation items */}
      <div className="flex-1 overflow-y-auto py-3 px-2 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentPage === item.id;

          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-medium transition-all group ${
                isActive
                  ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/25 shadow-sm shadow-cyan-950/40'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900 border border-transparent'
              }`}
              title={collapsed ? item.label : undefined}
            >
              <Icon
                className={`w-4 h-4 shrink-0 transition-colors ${
                  isActive ? 'text-cyan-400' : 'text-slate-400 group-hover:text-slate-200'
                }`}
              />
              {!collapsed && (
                <div className="flex-1 flex items-center justify-between overflow-hidden">
                  <span className="truncate whitespace-nowrap text-left">{item.label}</span>
                  {item.badge !== undefined && item.badge !== null && (
                    <span
                      className={`ml-2 px-1.5 py-0.2 rounded font-mono text-[10px] font-semibold border ${item.badgeColor}`}
                    >
                      {item.badge}
                    </span>
                  )}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Mini System Topology Stats Footer */}
      {!collapsed && (
        <div className="p-3 m-2 rounded-lg bg-slate-900/60 border border-slate-800/80 text-[11px] text-slate-400 space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-slate-400">Graph Edges</span>
            <span className="font-mono text-cyan-400 font-semibold tabular-nums">
              {globalMetrics.totalEdges}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-400">Louvain Modularity</span>
            <span className="font-mono text-slate-200 tabular-nums">
              Q = {globalMetrics.modularity.toFixed(3)}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-400">Components</span>
            <span className="font-mono text-slate-200 tabular-nums">
              {globalMetrics.connectedComponentsCount}
            </span>
          </div>
        </div>
      )}
    </aside>
  );
};
