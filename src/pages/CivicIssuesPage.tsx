import React, { useState, useMemo } from 'react';
import {
  Search,
  Filter,
  Plus,
  ArrowUpDown,
  Trash2,
  Eye,
  Building2,
  Calendar,
  Layers,
  ChevronLeft,
  ChevronRight,
  Download,
} from 'lucide-react';
import { useCivic } from '../context/CivicContext';
import {
  CATEGORY_COLORS,
  PRIORITY_STYLES,
  STATUS_STYLES,
  formatDate,
} from '../utils/styleHelpers';
import { CivicCategory, IssuePriority, IssueStatus, CivicIssue } from '../types/civic';
import { exportIssuesToCsv } from '../utils/csvParser';

interface CivicIssuesPageProps {
  onOpenCreateModal: () => void;
  onOpenIssue: (id: string) => void;
}

export const CivicIssuesPage: React.FC<CivicIssuesPageProps> = ({
  onOpenCreateModal,
  onOpenIssue,
}) => {
  const { issues, deleteIssue, showToast } = useCivic();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedPriority, setSelectedPriority] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'date_desc' | 'date_asc' | 'priority' | 'title'>('date_desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Filter & Search logic
  const filteredIssues = useMemo(() => {
    return issues.filter((issue) => {
      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matches =
          issue.title.toLowerCase().includes(q) ||
          issue.description.toLowerCase().includes(q) ||
          issue.externalComplaintId.toLowerCase().includes(q) ||
          issue.locationName.toLowerCase().includes(q) ||
          (issue.infrastructureId && issue.infrastructureId.toLowerCase().includes(q)) ||
          issue.responsibleAgency.toLowerCase().includes(q);
        if (!matches) return false;
      }

      // Category
      if (selectedCategory !== 'all' && issue.category !== selectedCategory) return false;

      // Priority
      if (selectedPriority !== 'all' && issue.priority !== selectedPriority) return false;

      // Status
      if (selectedStatus !== 'all' && issue.status !== selectedStatus) return false;

      return true;
    });
  }, [issues, searchQuery, selectedCategory, selectedPriority, selectedStatus]);

  // Sort logic
  const sortedIssues = useMemo(() => {
    const list = [...filteredIssues];
    const priorityWeight: Record<IssuePriority, number> = {
      critical: 4,
      high: 3,
      medium: 2,
      low: 1,
    };

    list.sort((a, b) => {
      if (sortBy === 'date_desc') {
        return new Date(b.createdDate).getTime() - new Date(a.createdDate).getTime();
      }
      if (sortBy === 'date_asc') {
        return new Date(a.createdDate).getTime() - new Date(b.createdDate).getTime();
      }
      if (sortBy === 'priority') {
        return priorityWeight[b.priority] - priorityWeight[a.priority];
      }
      if (sortBy === 'title') {
        return a.title.localeCompare(b.title);
      }
      return 0;
    });
    return list;
  }, [filteredIssues, sortBy]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(sortedIssues.length / pageSize));
  const paginatedIssues = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedIssues.slice(start, start + pageSize);
  }, [sortedIssues, currentPage, pageSize]);

  const handleExportCsv = () => {
    const csvStr = exportIssuesToCsv(sortedIssues);
    const blob = new Blob([csvStr], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `civic_issues_export_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast(`Exported ${sortedIssues.length} issues to CSV`, 'success');
  };

  const handleDelete = (issue: CivicIssue) => {
    if (confirm(`Remove complaint ${issue.externalComplaintId}?`)) {
      deleteIssue(issue.id);
    }
  };

  return (
    <div className="space-y-5 max-w-7xl mx-auto">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">Civic Issues Registry</h1>
          <p className="text-xs text-slate-400">
            Validated municipal complaint database with category mappings and topological metadata
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleExportCsv}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-300 hover:text-white bg-slate-900 border border-slate-800 rounded-lg transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Filtered ({sortedIssues.length})</span>
          </button>

          <button
            onClick={onOpenCreateModal}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-slate-950 bg-gradient-to-r from-cyan-400 to-cyan-300 hover:from-cyan-300 hover:to-cyan-200 rounded-lg shadow-sm shadow-cyan-500/20 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Record Issue</span>
          </button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800/80 space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          {/* Search */}
          <div className="relative md:col-span-2">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Search by title, complaint ID, street, infrastructure ID..."
              className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
            />
          </div>

          {/* Category Filter */}
          <div>
            <select
              value={selectedCategory}
              onChange={(e) => {
                setSelectedCategory(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
            >
              <option value="all">All Categories</option>
              {Object.entries(CATEGORY_COLORS).map(([cat, val]) => (
                <option key={cat} value={cat}>
                  {val.label}
                </option>
              ))}
            </select>
          </div>

          {/* Sort By */}
          <div>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
            >
              <option value="date_desc">Newest First</option>
              <option value="date_asc">Oldest First</option>
              <option value="priority">Highest Priority</option>
              <option value="title">Title (A-Z)</option>
            </select>
          </div>
        </div>

        {/* Secondary filters row */}
        <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-800/60 text-xs">
          <span className="text-slate-400">Status:</span>
          {['all', 'reported', 'in_progress', 'under_review', 'resolved', 'closed'].map((st) => (
            <button
              key={st}
              onClick={() => {
                setSelectedStatus(st);
                setCurrentPage(1);
              }}
              className={`px-2.5 py-1 rounded-md transition-colors ${
                selectedStatus === st
                  ? 'bg-cyan-500/20 text-cyan-300 font-semibold border border-cyan-500/40'
                  : 'text-slate-400 hover:text-slate-200 bg-slate-950/40 border border-transparent'
              }`}
            >
              {st === 'all' ? 'All' : st.replace('_', ' ')}
            </button>
          ))}

          <span className="text-slate-600 ml-2">|</span>
          <span className="text-slate-400 ml-2">Priority:</span>
          {['all', 'critical', 'high', 'medium', 'low'].map((pr) => (
            <button
              key={pr}
              onClick={() => {
                setSelectedPriority(pr);
                setCurrentPage(1);
              }}
              className={`px-2.5 py-1 rounded-md transition-colors ${
                selectedPriority === pr
                  ? 'bg-cyan-500/20 text-cyan-300 font-semibold border border-cyan-500/40'
                  : 'text-slate-400 hover:text-slate-200 bg-slate-950/40 border border-transparent'
              }`}
            >
              {pr.toUpperCase()}
            </button>
          ))}

          {(searchQuery || selectedCategory !== 'all' || selectedPriority !== 'all' || selectedStatus !== 'all') && (
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedCategory('all');
                setSelectedPriority('all');
                setSelectedStatus('all');
                setCurrentPage(1);
              }}
              className="ml-auto text-xs text-rose-400 hover:text-rose-300 underline"
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* Main Table */}
      <div className="rounded-xl bg-slate-900/80 border border-slate-800/80 overflow-hidden shadow-lg">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/60 border-b border-slate-800 text-slate-400">
              <tr>
                <th className="py-3 px-4 font-medium">Complaint ID</th>
                <th className="py-3 px-4 font-medium">Title & Location</th>
                <th className="py-3 px-4 font-medium">Category</th>
                <th className="py-3 px-4 font-medium">Priority</th>
                <th className="py-3 px-4 font-medium">Status</th>
                <th className="py-3 px-4 font-medium">Agency & Asset</th>
                <th className="py-3 px-4 font-medium">Reported Date</th>
                <th className="py-3 px-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {paginatedIssues.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    No civic issues matching current search or filters.
                  </td>
                </tr>
              ) : (
                paginatedIssues.map((issue) => {
                  const cat = CATEGORY_COLORS[issue.category];
                  const pri = PRIORITY_STYLES[issue.priority];
                  const stat = STATUS_STYLES[issue.status];

                  return (
                    <tr
                      key={issue.id}
                      className="hover:bg-slate-800/40 transition-colors group"
                    >
                      <td className="py-3 px-4 font-mono text-cyan-400 font-semibold whitespace-nowrap">
                        {issue.externalComplaintId}
                      </td>
                      <td className="py-3 px-4 max-w-xs">
                        <div className="text-slate-200 font-medium truncate">{issue.title}</div>
                        <div className="text-slate-400 text-[11px] truncate">
                          {issue.locationName}
                        </div>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className={`font-medium ${cat.text}`}>{cat.label}</span>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className={`font-semibold ${pri.text}`}>{pri.label}</span>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className={`font-medium ${stat.text}`}>{stat.label}</span>
                      </td>
                      <td className="py-3 px-4 max-w-[200px]">
                        <div className="text-slate-300 truncate">{issue.responsibleAgency}</div>
                        {issue.infrastructureId && (
                          <div className="font-mono text-[10px] text-purple-400 truncate">
                            {issue.infrastructureId}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-400 whitespace-nowrap">
                        {formatDate(issue.createdDate)}
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => onOpenIssue(issue.id)}
                            className="p-1 rounded text-slate-400 hover:text-cyan-400 hover:bg-slate-800 transition-colors"
                            title="Inspect details & graph connectivity"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(issue)}
                            className="p-1 rounded text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors"
                            title="Delete issue"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="px-4 py-3 bg-slate-950/60 border-t border-slate-800 flex items-center justify-between gap-4 text-xs">
          <div className="text-slate-400">
            Showing{' '}
            <span className="font-mono text-slate-200 font-semibold tabular-nums">
              {sortedIssues.length > 0 ? (currentPage - 1) * pageSize + 1 : 0}
            </span>{' '}
            to{' '}
            <span className="font-mono text-slate-200 font-semibold tabular-nums">
              {Math.min(currentPage * pageSize, sortedIssues.length)}
            </span>{' '}
            of{' '}
            <span className="font-mono text-slate-200 font-semibold tabular-nums">
              {sortedIssues.length}
            </span>{' '}
            filtered issues
          </div>

          <div className="flex items-center gap-3">
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="px-2 py-1 bg-slate-900 border border-slate-800 rounded text-slate-300"
            >
              <option value={10}>10 per page</option>
              <option value={25}>25 per page</option>
              <option value={50}>50 per page</option>
            </select>

            <div className="flex items-center gap-1">
              <button
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="p-1.5 rounded bg-slate-900 border border-slate-800 text-slate-400 hover:text-white disabled:opacity-40 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="px-2 font-mono text-slate-300 tabular-nums">
                {currentPage} / {totalPages}
              </span>
              <button
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="p-1.5 rounded bg-slate-900 border border-slate-800 text-slate-400 hover:text-white disabled:opacity-40 transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
