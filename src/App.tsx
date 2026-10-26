import React, { useState } from 'react';
import { CivicProvider, useCivic } from './context/CivicContext';
import { TopNavigation } from './components/layout/TopNavigation';
import { Sidebar } from './components/layout/Sidebar';
import { DashboardPage } from './pages/DashboardPage';
import { CivicIssuesPage } from './pages/CivicIssuesPage';
import { NetworkExplorerPage } from './pages/NetworkExplorerPage';
import { CommunityAnalysisPage } from './pages/CommunityAnalysisPage';
import { HotspotMapPage } from './pages/HotspotMapPage';
import { TrendsPage } from './pages/TrendsPage';
import { AlertsPage } from './pages/AlertsPage';
import { DataImportPage } from './pages/DataImportPage';
import { ReportsPage } from './pages/ReportsPage';
import { SettingsPage } from './pages/SettingsPage';
import { IssueDetailModal } from './components/modals/IssueDetailModal';
import { CreateIssueModal } from './components/modals/CreateIssueModal';
import { CheckCircle2, AlertTriangle, Info, X } from 'lucide-react';

const MainLayout: React.FC = () => {
  const [currentPage, setCurrentPage] = useState<string>('dashboard');
  const [createModalOpen, setCreateModalOpen] = useState<boolean>(false);
  const [selectedModalIssueId, setSelectedModalIssueId] = useState<string | null>(null);

  const { toasts, dismissToast, setSelectedIssueId } = useCivic();

  const handleOpenIssue = (id: string) => {
    setSelectedModalIssueId(id);
  };

  const handleFocusInGraph = (id: string) => {
    setSelectedModalIssueId(null);
    setSelectedIssueId(id);
    setCurrentPage('network');
  };

  return (
    <div className="h-screen w-screen flex flex-col bg-slate-950 text-slate-100 overflow-hidden font-sans selection:bg-cyan-500/30 selection:text-cyan-200">
      {/* Top Bar following Top Bar Contract */}
      <TopNavigation
        currentPage={currentPage}
        onOpenCreateModal={() => setCreateModalOpen(true)}
        onNavigate={setCurrentPage}
      />

      {/* Main Workspace Body */}
      <div className="flex-1 flex overflow-hidden">
        {/* Collapsible Sidebar */}
        <Sidebar currentPage={currentPage} onNavigate={setCurrentPage} />

        {/* Viewport Content Area */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 bg-[#030712] relative">
          {currentPage === 'dashboard' && (
            <DashboardPage onNavigate={setCurrentPage} onOpenIssue={handleOpenIssue} />
          )}

          {currentPage === 'issues' && (
            <CivicIssuesPage
              onOpenCreateModal={() => setCreateModalOpen(true)}
              onOpenIssue={handleOpenIssue}
            />
          )}

          {currentPage === 'network' && (
            <NetworkExplorerPage onOpenIssue={handleOpenIssue} />
          )}

          {currentPage === 'communities' && (
            <CommunityAnalysisPage
              onNavigate={setCurrentPage}
              onOpenIssue={handleOpenIssue}
            />
          )}

          {currentPage === 'map' && <HotspotMapPage onOpenIssue={handleOpenIssue} />}

          {currentPage === 'trends' && <TrendsPage />}

          {currentPage === 'alerts' && (
            <AlertsPage onOpenIssue={handleOpenIssue} onNavigate={setCurrentPage} />
          )}

          {currentPage === 'import' && <DataImportPage onNavigate={setCurrentPage} />}

          {currentPage === 'reports' && <ReportsPage />}

          {currentPage === 'settings' && <SettingsPage />}
        </main>
      </div>

      {/* Modals */}
      {selectedModalIssueId && (
        <IssueDetailModal
          issueId={selectedModalIssueId}
          onClose={() => setSelectedModalIssueId(null)}
          onFocusInGraph={handleFocusInGraph}
        />
      )}

      {createModalOpen && <CreateIssueModal onClose={() => setCreateModalOpen(false)} />}

      {/* Toast Notification Container */}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto p-3.5 rounded-xl border shadow-xl flex items-start justify-between gap-3 text-xs backdrop-blur-md animate-in slide-in-from-bottom duration-150 ${
              toast.type === 'success'
                ? 'bg-slate-900/95 border-emerald-500/30 text-emerald-300'
                : toast.type === 'warning'
                ? 'bg-slate-900/95 border-amber-500/30 text-amber-300'
                : toast.type === 'error'
                ? 'bg-slate-900/95 border-rose-500/30 text-rose-300'
                : 'bg-slate-900/95 border-cyan-500/30 text-cyan-300'
            }`}
          >
            <div className="flex items-center gap-2">
              {toast.type === 'success' && <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />}
              {toast.type === 'warning' && <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400" />}
              {toast.type === 'info' && <Info className="w-4 h-4 shrink-0 text-cyan-400" />}
              <span className="font-medium text-slate-100">{toast.message}</span>
            </div>
            <button
              onClick={() => dismissToast(toast.id)}
              className="text-slate-400 hover:text-white p-0.5"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default function App() {
  return (
    <CivicProvider>
      <MainLayout />
    </CivicProvider>
  );
}
