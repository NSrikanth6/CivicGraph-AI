import React, { useState } from 'react';
import {
  Settings,
  Database,
  Sparkles,
  Sliders,
  Server,
  Code2,
  CheckCircle2,
  RefreshCw,
  ExternalLink,
  Shield,
  Layers,
} from 'lucide-react';
import { useCivic } from '../context/CivicContext';

export const SettingsPage: React.FC = () => {
  const {
    mode,
    setMode,
    databaseStatus,
    databaseError,
    graphOptions,
    updateGraphOptions,
    resetToDemoData,
    showToast,
  } = useCivic();

  const [pythonServiceUrl, setPythonServiceUrl] = useState('http://localhost:8000');
  const [pythonStatus, setPythonStatus] = useState<'idle' | 'checking' | 'offline' | 'connected'>('idle');

  const handleTestPythonService = async () => {
    setPythonStatus('checking');
    try {
      const res = await fetch(`${pythonServiceUrl}/health`, { signal: AbortSignal.timeout(3000) });
      if (res.ok) {
        setPythonStatus('connected');
        showToast('Successfully connected to external FastAPI NetworkX service', 'success');
      } else {
        setPythonStatus('offline');
        showToast(`Service returned status ${res.status}`, 'warning');
      }
    } catch {
      setPythonStatus('offline');
      showToast('FastAPI NetworkX service is offline or unreachable at this URL', 'info');
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="p-5 rounded-xl bg-slate-900/80 border border-slate-800/80 space-y-1">
        <div className="flex items-center gap-2 text-xs font-semibold text-cyan-400">
          <Settings className="w-4 h-4" />
          <span>SYSTEM & ALGORITHM CONFIGURATION</span>
        </div>
        <h1 className="text-xl font-bold text-white tracking-tight">Platform Settings</h1>
        <p className="text-xs text-slate-400 max-w-2xl">
          Manage runtime storage modes, fine-tune topological graph construction rules, and
          configure external graph analysis engines.
        </p>
      </div>

      {/* Section 1: Storage & Operational Modes */}
      <div className="p-5 rounded-xl bg-slate-900/80 border border-slate-800/80 space-y-4">
        <div>
          <h2 className="text-base font-semibold text-white flex items-center gap-2">
            <Database className="w-4 h-4 text-cyan-400" />
            Storage & Environment Mode
          </h2>
          <p className="text-xs text-slate-400">
            Switch between offline reproducible synthetic demo mode and persistent cloud database mode.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          {/* Demo Mode Option */}
          <div
            onClick={() => setMode('demo')}
            className={`p-4 rounded-xl border cursor-pointer transition-all ${
              mode === 'demo'
                ? 'bg-cyan-500/10 border-cyan-500/40 shadow-sm shadow-cyan-950/50'
                : 'bg-slate-950/40 border-slate-800 hover:border-slate-700'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-semibold text-sm text-cyan-300">
                <Sparkles className="w-4 h-4" />
                <span>Synthetic Demo Mode</span>
              </div>
              {mode === 'demo' && (
                <span className="text-[11px] font-mono bg-cyan-500/20 text-cyan-300 px-2 py-0.5 rounded">
                  Active
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 mt-2 leading-relaxed">
              Operates self-contained with verified synthetic metro infrastructure datasets and
              in-browser Graphology + Louvain algorithms. Zero cloud credentials required.
            </p>
            <div className="mt-3 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
              <span className="text-slate-400">Reproducible benchmark:</span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  resetToDemoData();
                }}
                className="text-cyan-400 hover:text-cyan-300 underline font-medium"
              >
                Reset Demo Dataset
              </button>
            </div>
          </div>

          {/* Connected Database Option */}
          <div
            onClick={() => {
              showToast(
                'Firebase credentials not provisioned yet. The application will continue running in high-performance Demo mode.',
                'info'
              );
            }}
            className={`p-4 rounded-xl border cursor-pointer transition-all ${
              mode === 'connected'
                ? 'bg-emerald-500/10 border-emerald-500/40'
                : 'bg-slate-950/40 border-slate-800 hover:border-slate-700'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-semibold text-sm text-slate-300">
                <Database className="w-4 h-4 text-emerald-400" />
                <span>Cloud Firestore Connected Mode</span>
              </div>
              <span className="text-[10px] font-mono bg-slate-800 text-slate-400 px-2 py-0.5 rounded">
                Configurable
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-2 leading-relaxed">
              Connect to Google Cloud Firestore and Firebase Authentication for persistent multi-user
              RBAC ticket tracking and cloud sync across municipal operations devices.
            </p>
            <div className="mt-3 pt-3 border-t border-slate-800/80 text-[11px] text-slate-400 flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-slate-400" />
              <span>Status: Demo Mode Active (Ready for Firestore integration)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Section 2: Graph Algorithm Parameter Tuning */}
      <div className="p-5 rounded-xl bg-slate-900/80 border border-slate-800/80 space-y-5">
        <div>
          <h2 className="text-base font-semibold text-white flex items-center gap-2">
            <Sliders className="w-4 h-4 text-purple-400" />
            Graph Topology Construction Rules
          </h2>
          <p className="text-xs text-slate-400">
            Edges between civic issues are established only when meeting explainable spatial, temporal,
            or asset criteria. Adjust these hyperparameters to see network density adapt live.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
          {/* Spatial Threshold */}
          <div className="space-y-2 p-4 rounded-lg bg-slate-950/60 border border-slate-800">
            <div className="flex justify-between items-center">
              <span className="font-medium text-slate-300">Spatial Proximity Threshold</span>
              <span className="font-mono text-cyan-400 font-bold tabular-nums">
                {graphOptions.spatialThresholdMeters} meters
              </span>
            </div>
            <input
              type="range"
              min="100"
              max="1000"
              step="50"
              value={graphOptions.spatialThresholdMeters}
              onChange={(e) =>
                updateGraphOptions({ spatialThresholdMeters: Number(e.target.value) })
              }
              className="w-full accent-cyan-400 cursor-pointer"
            />
            <p className="text-[11px] text-slate-400">
              Maximum physical distance (Haversine formula) within which co-occurring issues can form an edge.
            </p>
          </div>

          {/* Temporal Window */}
          <div className="space-y-2 p-4 rounded-lg bg-slate-950/60 border border-slate-800">
            <div className="flex justify-between items-center">
              <span className="font-medium text-slate-300">Temporal Co-occurrence Window</span>
              <span className="font-mono text-cyan-400 font-bold tabular-nums">
                {graphOptions.temporalWindowDays} days
              </span>
            </div>
            <input
              type="range"
              min="3"
              max="60"
              step="1"
              value={graphOptions.temporalWindowDays}
              onChange={(e) =>
                updateGraphOptions({ temporalWindowDays: Number(e.target.value) })
              }
              className="w-full accent-cyan-400 cursor-pointer"
            />
            <p className="text-[11px] text-slate-400">
              Time elapsed between complaint timestamps to be considered linked events.
            </p>
          </div>

          {/* Minimum Edge Weight */}
          <div className="space-y-2 p-4 rounded-lg bg-slate-950/60 border border-slate-800">
            <div className="flex justify-between items-center">
              <span className="font-medium text-slate-300">Minimum Edge Weight Filter</span>
              <span className="font-mono text-cyan-400 font-bold tabular-nums">
                w ≥ {graphOptions.minEdgeWeight}
              </span>
            </div>
            <input
              type="range"
              min="0.1"
              max="0.8"
              step="0.05"
              value={graphOptions.minEdgeWeight}
              onChange={(e) =>
                updateGraphOptions({ minEdgeWeight: Number(e.target.value) })
              }
              className="w-full accent-cyan-400 cursor-pointer"
            />
            <p className="text-[11px] text-slate-400">
              Prunes edges whose combined similarity, proximity, and infrastructure confidence falls below threshold.
            </p>
          </div>

          {/* Toggle Switches */}
          <div className="p-4 rounded-lg bg-slate-950/60 border border-slate-800 space-y-3">
            <div className="font-medium text-slate-300">Enabled Edge Inference Modules</div>

            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-slate-300">Spatial Proximity Linkage</span>
              <input
                type="checkbox"
                checked={graphOptions.enableProximityEdges}
                onChange={(e) =>
                  updateGraphOptions({ enableProximityEdges: e.target.checked })
                }
                className="accent-cyan-400"
              />
            </label>

            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-slate-300">Shared Infrastructure ID Linkage</span>
              <input
                type="checkbox"
                checked={graphOptions.enableInfrastructureEdges}
                onChange={(e) =>
                  updateGraphOptions({ enableInfrastructureEdges: e.target.checked })
                }
                className="accent-cyan-400"
              />
            </label>

            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-slate-300">Cross-Category Cascade Failure Logic</span>
              <input
                type="checkbox"
                checked={graphOptions.enableCorrelatedFailures}
                onChange={(e) =>
                  updateGraphOptions({ enableCorrelatedFailures: e.target.checked })
                }
                className="accent-cyan-400"
              />
            </label>
          </div>
        </div>
      </div>

      {/* Section 3: External Python FastAPI & NetworkX Service Config */}
      <div className="p-5 rounded-xl bg-slate-900/80 border border-slate-800/80 space-y-4">
        <div>
          <h2 className="text-base font-semibold text-white flex items-center gap-2">
            <Server className="w-4 h-4 text-emerald-400" />
            External Python FastAPI + NetworkX Microservice
          </h2>
          <p className="text-xs text-slate-400">
            For advanced research workflows requiring NetworkX or GPU-accelerated cuGraph, a standalone
            FastAPI microservice code bundle is included in the project under{' '}
            <span className="font-mono text-cyan-400">/python-graph-service</span>.
          </p>
        </div>

        <div className="p-4 rounded-lg bg-slate-950/60 border border-slate-800 space-y-3 text-xs">
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <div className="flex-1 w-full">
              <label className="block text-[11px] text-slate-400 mb-1">
                FastAPI Graph Service Endpoint URL
              </label>
              <input
                type="text"
                value={pythonServiceUrl}
                onChange={(e) => setPythonServiceUrl(e.target.value)}
                placeholder="http://localhost:8000"
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-200 font-mono focus:outline-none"
              />
            </div>
            <button
              onClick={handleTestPythonService}
              className="mt-5 w-full sm:w-auto px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium rounded-lg border border-slate-700 transition-colors whitespace-nowrap cursor-pointer"
            >
              Test Service Health
            </button>
          </div>

          <div className="flex items-center gap-2 text-[11px]">
            <span className="text-slate-400">Status:</span>
            {pythonStatus === 'idle' && (
              <span className="text-slate-400">Ready to test connection</span>
            )}
            {pythonStatus === 'checking' && (
              <span className="text-cyan-400 flex items-center gap-1">
                <RefreshCw className="w-3 h-3 animate-spin" /> Pinging /health...
              </span>
            )}
            {pythonStatus === 'connected' && (
              <span className="text-emerald-400 font-semibold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Online & Responsive
              </span>
            )}
            {pythonStatus === 'offline' && (
              <span className="text-slate-400">
                Service currently offline (JavaScript native Graphology engine is handling all analytics)
              </span>
            )}
          </div>
        </div>

        {/* Python Service Deployment Instructions */}
        <div className="p-4 rounded-lg bg-slate-950/40 border border-slate-800 space-y-2 text-xs">
          <div className="text-[11px] uppercase tracking-wider font-semibold text-slate-400 flex items-center gap-1.5">
            <Code2 className="w-3.5 h-3.5 text-cyan-400" />
            FastAPI Run Instructions (Optional)
          </div>
          <p className="text-slate-400 text-[11px]">
            To run the Python NetworkX microservice locally or in a container:
          </p>
          <pre className="p-3 bg-slate-950 rounded-lg border border-slate-800 text-[11px] font-mono text-cyan-300 overflow-x-auto">
{`cd python-graph-service
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8000 --reload`}
          </pre>
        </div>
      </div>
    </div>
  );
};
