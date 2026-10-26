import React from 'react';
import { Database, Sparkles, Plus, Download, RefreshCw } from 'lucide-react';
import { useCivic } from '../../context/CivicContext';

interface TopNavigationProps {
  currentPage: string;
  onOpenCreateModal: () => void;
  onNavigate: (page: string) => void;
}

export const TopNavigation: React.FC<TopNavigationProps> = ({
  currentPage,
  onOpenCreateModal,
  onNavigate,
}) => {
  const { mode, datasetName, resetToDemoData, issues } = useCivic();

  const getPageTitle = (page: string) => {
    switch (page) {
      case 'dashboard':
        return 'Executive Dashboard';
      case 'issues':
        return 'Civic Issues Registry';
      case 'network':
        return 'Network Explorer';
      case 'communities':
        return 'Community Analysis';
      case 'map':
        return 'Hotspot Map';
      case 'trends':
        return 'Trends & Predictive Signals';
      case 'alerts':
        return 'Rule-Based Civic Alerts';
      case 'import':
        return 'Data Import Wizard';
      case 'reports':
        return 'Reports & Data Export';
      case 'settings':
        return 'System & Graph Configuration';
      default:
        return 'Overview';
    }
  };

  return (
    <header className="h-16 border-b border-slate-800/80 bg-slate-950/90 backdrop-blur-md px-6 flex items-center justify-between gap-8 z-30 shrink-0">
      {/* Zone 1: Brand title & breadcrumb trail */}
      <div className="flex items-center gap-4 min-w-0">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
            <span className="font-bold text-white text-base tracking-tighter">CG</span>
          </div>
          <span className="font-bold text-base tracking-tight text-white whitespace-nowrap">
            CivicGraph AI
          </span>
        </div>
        <span className="text-slate-700 hidden sm:inline" aria-hidden="true">/</span>
        <div className="hidden sm:flex items-center gap-2 text-xs text-slate-400 min-w-0">
          <span className="text-slate-200 font-medium whitespace-nowrap">{getPageTitle(currentPage)}</span>
          <span className="text-slate-600">·</span>
          <span className="text-slate-400 truncate max-w-[220px]" title={datasetName}>
            {datasetName}
          </span>
          <span className="text-slate-600">·</span>
          <span className="font-mono text-cyan-400 tabular-nums">{issues.length} records</span>
        </div>
      </div>

      {/* Zone 2: Navigation Links or Contextual Quick Switchers */}
      <nav className="hidden lg:flex items-center gap-6 text-sm font-medium text-slate-400">
        <button
          onClick={() => onNavigate('dashboard')}
          className={`transition-colors whitespace-nowrap shrink-0 ${currentPage === 'dashboard' ? 'text-cyan-400 font-semibold' : 'hover:text-slate-200'}`}
        >
          Dashboard
        </button>
        <button
          onClick={() => onNavigate('network')}
          className={`transition-colors whitespace-nowrap shrink-0 ${currentPage === 'network' ? 'text-cyan-400 font-semibold' : 'hover:text-slate-200'}`}
        >
          Graph
        </button>
        <button
          onClick={() => onNavigate('communities')}
          className={`transition-colors whitespace-nowrap shrink-0 ${currentPage === 'communities' ? 'text-cyan-400 font-semibold' : 'hover:text-slate-200'}`}
        >
          Communities
        </button>
        <button
          onClick={() => onNavigate('map')}
          className={`transition-colors whitespace-nowrap shrink-0 ${currentPage === 'map' ? 'text-cyan-400 font-semibold' : 'hover:text-slate-200'}`}
        >
          Map
        </button>
        <button
          onClick={() => onNavigate('reports')}
          className={`transition-colors whitespace-nowrap shrink-0 ${currentPage === 'reports' ? 'text-cyan-400 font-semibold' : 'hover:text-slate-200'}`}
        >
          Reports
        </button>
      </nav>

      {/* Zone 3: Primary Actions and User Profile */}
      <div className="flex items-center gap-3 shrink-0">
        {/* Mode badge */}
        <div
          onClick={() => onNavigate('settings')}
          className="cursor-pointer hidden md:flex items-center gap-2 px-2.5 py-1 rounded-md bg-slate-900 border border-slate-800 text-xs text-slate-300 hover:border-slate-700 transition-colors"
          title="Click to view Demo / Database Mode settings"
        >
          {mode === 'demo' ? (
            <>
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              <span className="font-medium text-cyan-300">Synthetic Demo Mode</span>
            </>
          ) : (
            <>
              <Database className="w-3.5 h-3.5 text-emerald-400" />
              <span className="font-medium text-emerald-300">Firestore Connected</span>
            </>
          )}
        </div>

        {/* Quick Reset Button if customized */}
        <button
          onClick={resetToDemoData}
          title="Reload reproducible synthetic dataset"
          className="p-2 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
        </button>

        {/* New Issue CTA */}
        <button
          onClick={onOpenCreateModal}
          className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-slate-950 bg-gradient-to-r from-cyan-400 to-cyan-300 hover:from-cyan-300 hover:to-cyan-200 rounded-lg shadow-sm shadow-cyan-500/20 transition-all whitespace-nowrap shrink-0 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>New Issue</span>
        </button>

        {/* Analyst Profile Avatar */}
        <div className="relative pl-2 border-l border-slate-800 flex items-center gap-2.5">
          <img
            src="/src/assets/images/avatar_municipal_analyst_1791820577410.jpg"
            alt="Municipal Operations Analyst"
            className="w-8 h-8 rounded-full object-cover border border-slate-700 ring-1 ring-cyan-500/30"
          />
        </div>
      </div>
    </header>
  );
};
