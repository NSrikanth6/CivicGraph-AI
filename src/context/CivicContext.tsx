import React, { createContext, useContext, useState, useMemo, useEffect } from 'react';
import {
  CivicIssue,
  CivicEdge,
  GraphNodeMetrics,
  CommunitySummary,
  GlobalGraphMetrics,
  CivicAlert,
  DataQualityReport,
} from '../types/civic';
import {
  GraphBuildOptions,
  DEFAULT_GRAPH_OPTIONS,
  buildCivicEdges,
  analyzeGraph,
} from '../utils/graphEngine';
import { generateCivicAlerts, evaluateDataQuality } from '../utils/alertEngine';
import { SYNTHETIC_DEMO_ISSUES } from '../data/demoData';

interface ToastInfo {
  id: string;
  message: string;
  type: 'success' | 'info' | 'warning' | 'error';
}

interface CivicContextValue {
  // Mode & storage
  mode: 'demo' | 'connected';
  setMode: (mode: 'demo' | 'connected') => void;
  datasetName: string;
  setDatasetName: (name: string) => void;
  databaseStatus: 'not_configured' | 'connecting' | 'connected' | 'error';
  databaseError: string | null;

  // Issues & graph data
  issues: CivicIssue[];
  edges: CivicEdge[];
  nodeMetrics: Map<string, GraphNodeMetrics>;
  communitySummaries: CommunitySummary[];
  globalMetrics: GlobalGraphMetrics;
  alerts: CivicAlert[];
  dataQuality: DataQualityReport;

  // Graph options
  graphOptions: GraphBuildOptions;
  updateGraphOptions: (opts: Partial<GraphBuildOptions>) => void;

  // Selection & UI focus state
  selectedIssueId: string | null;
  setSelectedIssueId: (id: string | null) => void;
  selectedCommunityId: number | null;
  setSelectedCommunityId: (id: number | null) => void;
  highlightedNodeIds: string[];
  setHighlightedNodeIds: (ids: string[]) => void;

  // CRUD
  addIssue: (issue: Omit<CivicIssue, 'id'>) => CivicIssue;
  updateIssue: (id: string, issue: Partial<CivicIssue>) => void;
  deleteIssue: (id: string) => void;
  resetToDemoData: () => void;
  importIssues: (newIssues: CivicIssue[], datasetTitle: string) => void;

  // Toasts
  toasts: ToastInfo[];
  showToast: (message: string, type?: ToastInfo['type']) => void;
  dismissToast: (id: string) => void;
}

const CivicContext = createContext<CivicContextValue | null>(null);

const STORAGE_KEY_ISSUES = 'civicgraph_issues_v1';
const STORAGE_KEY_DATASET_NAME = 'civicgraph_dataset_name_v1';
const STORAGE_KEY_OPTIONS = 'civicgraph_graph_options_v1';

export const CivicProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [mode, setMode] = useState<'demo' | 'connected'>('demo');
  const [datasetName, setDatasetName] = useState<string>(() => {
    try {
      return localStorage.getItem(STORAGE_KEY_DATASET_NAME) || 'Synthetic Demo Metro Dataset';
    } catch {
      return 'Synthetic Demo Metro Dataset';
    }
  });

  const [databaseStatus] = useState<'not_configured' | 'connecting' | 'connected' | 'error'>('not_configured');
  const [databaseError] = useState<string | null>(null);

  const [issues, setIssuesState] = useState<CivicIssue[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_ISSUES);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn('Could not load cached issues from localStorage:', e);
    }
    return SYNTHETIC_DEMO_ISSUES;
  });

  const [graphOptions, setGraphOptions] = useState<GraphBuildOptions>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_OPTIONS);
      if (saved) {
        return { ...DEFAULT_GRAPH_OPTIONS, ...JSON.parse(saved) };
      }
    } catch (e) {
      console.warn('Could not load cached graph options:', e);
    }
    return DEFAULT_GRAPH_OPTIONS;
  });

  // UI Selection states
  const [selectedIssueId, setSelectedIssueId] = useState<string | null>(null);
  const [selectedCommunityId, setSelectedCommunityId] = useState<number | null>(null);
  const [highlightedNodeIds, setHighlightedNodeIds] = useState<string[]>([]);

  // Toast notifications
  const [toasts, setToasts] = useState<ToastInfo[]>([]);

  const showToast = (message: string, type: ToastInfo['type'] = 'info') => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  };

  const dismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Sync to local storage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_ISSUES, JSON.stringify(issues));
      localStorage.setItem(STORAGE_KEY_DATASET_NAME, datasetName);
    } catch (e) {
      console.warn('Failed to persist issues to localStorage:', e);
    }
  }, [issues, datasetName]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_OPTIONS, JSON.stringify(graphOptions));
    } catch (e) {
      console.warn('Failed to persist graph options:', e);
    }
  }, [graphOptions]);

  // Reactive graph pipeline execution
  const edges = useMemo(() => {
    return buildCivicEdges(issues, graphOptions);
  }, [issues, graphOptions]);

  const { nodeMetrics, communitySummaries, globalMetrics } = useMemo(() => {
    return analyzeGraph(issues, edges);
  }, [issues, edges]);

  const dataQuality = useMemo(() => {
    return evaluateDataQuality(issues);
  }, [issues]);

  const alerts = useMemo(() => {
    return generateCivicAlerts(issues, edges, nodeMetrics, dataQuality);
  }, [issues, edges, nodeMetrics, dataQuality]);

  // Actions
  const updateGraphOptions = (opts: Partial<GraphBuildOptions>) => {
    setGraphOptions((prev) => ({ ...prev, ...opts }));
    showToast('Graph algorithm thresholds updated', 'info');
  };

  const addIssue = (issueData: Omit<CivicIssue, 'id'>): CivicIssue => {
    const newIssue: CivicIssue = {
      ...issueData,
      id: `issue-user-${Date.now()}`,
      createdDate: issueData.createdDate || new Date().toISOString(),
      updatedDate: new Date().toISOString(),
    };
    setIssuesState((prev) => [newIssue, ...prev]);
    showToast(`Created issue ticket ${newIssue.externalComplaintId}`, 'success');
    return newIssue;
  };

  const updateIssue = (id: string, updates: Partial<CivicIssue>) => {
    setIssuesState((prev) =>
      prev.map((item) =>
        item.id === id
          ? {
              ...item,
              ...updates,
              updatedDate: new Date().toISOString(),
            }
          : item
      )
    );
    showToast('Civic complaint record updated', 'success');
  };

  const deleteIssue = (id: string) => {
    setIssuesState((prev) => prev.filter((item) => item.id !== id));
    if (selectedIssueId === id) setSelectedIssueId(null);
    showToast('Civic complaint record removed', 'info');
  };

  const resetToDemoData = () => {
    setIssuesState(SYNTHETIC_DEMO_ISSUES);
    setDatasetName('Synthetic Demo Metro Dataset');
    setSelectedIssueId(null);
    setSelectedCommunityId(null);
    setHighlightedNodeIds([]);
    showToast('Reset to reproducible synthetic municipal dataset', 'info');
  };

  const importIssues = (newIssues: CivicIssue[], datasetTitle: string) => {
    setIssuesState(newIssues);
    setDatasetName(datasetTitle);
    setSelectedIssueId(null);
    setSelectedCommunityId(null);
    setHighlightedNodeIds([]);
    showToast(`Successfully activated dataset with ${newIssues.length} records`, 'success');
  };

  const value: CivicContextValue = {
    mode,
    setMode,
    datasetName,
    setDatasetName,
    databaseStatus,
    databaseError,
    issues,
    edges,
    nodeMetrics,
    communitySummaries,
    globalMetrics,
    alerts,
    dataQuality,
    graphOptions,
    updateGraphOptions,
    selectedIssueId,
    setSelectedIssueId,
    selectedCommunityId,
    setSelectedCommunityId,
    highlightedNodeIds,
    setHighlightedNodeIds,
    addIssue,
    updateIssue,
    deleteIssue,
    resetToDemoData,
    importIssues,
    toasts,
    showToast,
    dismissToast,
  };

  return <CivicContext.Provider value={value}>{children}</CivicContext.Provider>;
};

export const useCivic = (): CivicContextValue => {
  const context = useContext(CivicContext);
  if (!context) {
    throw new Error('useCivic must be used within a CivicProvider');
  }
  return context;
};
