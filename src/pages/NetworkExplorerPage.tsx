import React, { useEffect, useRef, useState, useMemo } from 'react';
import cytoscape, { Core, EventObject } from 'cytoscape';
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  RefreshCw,
  Search,
  Filter,
  Layers,
  Palette,
  Eye,
  Info,
  Activity,
  Sliders,
  Share2,
} from 'lucide-react';
import { useCivic } from '../context/CivicContext';
import {
  CATEGORY_COLORS,
  RELATIONSHIP_LABELS,
  PRIORITY_STYLES,
  STATUS_STYLES,
  getCommunityColor,
} from '../utils/styleHelpers';
import {
  CivicCategory,
  IssuePriority,
  IssueStatus,
  RelationshipType,
} from '../types/civic';

interface NetworkExplorerPageProps {
  onOpenIssue: (id: string) => void;
}

export const NetworkExplorerPage: React.FC<NetworkExplorerPageProps> = ({
  onOpenIssue,
}) => {
  const {
    issues,
    edges,
    nodeMetrics,
    communitySummaries,
    globalMetrics,
    selectedIssueId,
    setSelectedIssueId,
    selectedCommunityId,
    setSelectedCommunityId,
  } = useCivic();

  const containerRef = useRef<HTMLDivElement>(null);
  const cyRef = useRef<Core | null>(null);

  // Controls state
  const [layoutName, setLayoutName] = useState<
    'cose' | 'concentric' | 'circle' | 'breadthfirst' | 'grid'
  >('cose');
  const [colorMode, setColorMode] = useState<'category' | 'community'>('category');
  const [sizeMode, setSizeMode] = useState<'degree' | 'betweenness' | 'uniform'>('degree');

  // Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedPriority, setSelectedPriority] = useState<string>('all');
  const [selectedRelType, setSelectedRelType] = useState<string>('all');
  const [minDegree, setMinDegree] = useState<number>(0);

  // Inspector panel
  const [activeInspectorNodeId, setActiveInspectorNodeId] = useState<string | null>(
    selectedIssueId
  );

  // Sync selectedIssueId from context if changed from outside
  useEffect(() => {
    if (selectedIssueId) {
      setActiveInspectorNodeId(selectedIssueId);
    }
  }, [selectedIssueId]);

  // Compute filtered subset of issues and edges
  const filteredIssues = useMemo(() => {
    return issues.filter((issue) => {
      if (selectedCategory !== 'all' && issue.category !== selectedCategory) return false;
      if (selectedStatus !== 'all' && issue.status !== selectedStatus) return false;
      if (selectedPriority !== 'all' && issue.priority !== selectedPriority) return false;
      if (selectedCommunityId !== null && selectedCommunityId !== 'all' as any) {
        const m = nodeMetrics.get(issue.id);
        if (m && m.communityId !== selectedCommunityId) return false;
      }
      if (minDegree > 0) {
        const m = nodeMetrics.get(issue.id);
        if (!m || m.degree < minDegree) return false;
      }
      return true;
    });
  }, [
    issues,
    selectedCategory,
    selectedStatus,
    selectedPriority,
    selectedCommunityId,
    minDegree,
    nodeMetrics,
  ]);

  const filteredNodeIdSet = useMemo(
    () => new Set(filteredIssues.map((i) => i.id)),
    [filteredIssues]
  );

  const filteredEdges = useMemo(() => {
    return edges.filter((edge) => {
      if (!filteredNodeIdSet.has(edge.source) || !filteredNodeIdSet.has(edge.target)) {
        return false;
      }
      if (selectedRelType !== 'all' && edge.relationshipType !== selectedRelType) {
        return false;
      }
      return true;
    });
  }, [edges, filteredNodeIdSet, selectedRelType]);

  // Build Cytoscape elements
  const cyElements = useMemo(() => {
    const nodes = filteredIssues.map((issue) => {
      const metric = nodeMetrics.get(issue.id);
      const degree = metric?.degree || 0;
      const betweenness = metric?.betweennessCentrality || 0;
      const communityId = metric?.communityId || 1;

      // Color
      let nodeColor = CATEGORY_COLORS[issue.category]?.hex || '#06b6d4';
      if (colorMode === 'community') {
        nodeColor = getCommunityColor(communityId);
      }

      // Size
      let nodeSize = 32;
      if (sizeMode === 'degree') {
        nodeSize = Math.max(24, Math.min(64, 24 + degree * 7));
      } else if (sizeMode === 'betweenness') {
        nodeSize = Math.max(24, Math.min(68, 24 + betweenness * 350));
      }

      return {
        data: {
          id: issue.id,
          label: issue.externalComplaintId,
          title: issue.title,
          category: issue.category,
          communityId,
          color: nodeColor,
          size: nodeSize,
          degree,
        },
      };
    });

    const cyEdges = filteredEdges.map((edge) => {
      const relMeta = RELATIONSHIP_LABELS[edge.relationshipType];
      return {
        data: {
          id: edge.id,
          source: edge.source,
          target: edge.target,
          weight: edge.weight,
          type: edge.relationshipType,
          color: relMeta?.color || '#38bdf8',
          width: Math.max(1.5, Math.min(6, (edge.weight || 0.5) * 4.5)),
        },
      };
    });

    return [...nodes, ...cyEdges];
  }, [filteredIssues, filteredEdges, nodeMetrics, colorMode, sizeMode]);

  // Initialize and update Cytoscape
  useEffect(() => {
    if (!containerRef.current) return;

    if (cyRef.current) {
      cyRef.current.destroy();
    }

    const cy = cytoscape({
      container: containerRef.current,
      elements: cyElements,
      style: [
        {
          selector: 'node',
          style: {
            'background-color': 'data(color)',
            label: 'data(label)',
            width: 'data(size)',
            height: 'data(size)',
            color: '#f8fafc',
            'font-family': 'Plus Jakarta Sans, sans-serif',
            'font-size': '10px',
            'font-weight': 600,
            'text-valign': 'bottom',
            'text-margin-y': 4,
            'border-width': 2,
            'border-color': '#0f172a',
            'text-outline-color': '#020617',
            'text-outline-width': 2,
            'transition-property': 'background-color, line-color, target-arrow-color, opacity, width, height',
            'transition-duration': 150,
          },
        },
        {
          selector: 'node:selected',
          style: {
            'border-width': 4,
            'border-color': '#38bdf8',
          },
        },
        {
          selector: 'edge',
          style: {
            width: 'data(width)',
            'line-color': 'data(color)',
            opacity: 0.65,
            'curve-style': 'bezier',
          },
        },
        {
          selector: '.faded',
          style: {
            opacity: 0.15,
          },
        },
        {
          selector: '.highlighted-node',
          style: {
            'border-width': 3,
            'border-color': '#38bdf8',
            opacity: 1,
          },
        },
        {
          selector: '.highlighted-edge',
          style: {
            opacity: 1,
            width: 4,
            'line-color': '#38bdf8',
          },
        },
      ],
      layout: {
        name: layoutName,
        animate: false,
        padding: 50,
        randomize: false,
      } as any,
    });

    cy.on('tap', 'node', (evt: EventObject) => {
      const node = evt.target;
      const id = node.id();
      setActiveInspectorNodeId(id);
      setSelectedIssueId(id);

      // Highlight neighbors
      cy.batch(() => {
        cy.elements().removeClass('highlighted-node highlighted-edge faded');
        const connectedEdges = node.connectedEdges();
        const neighbors = connectedEdges.connectedNodes();

        cy.elements().difference(node.union(connectedEdges).union(neighbors)).addClass('faded');
        node.addClass('highlighted-node');
        neighbors.addClass('highlighted-node');
        connectedEdges.addClass('highlighted-edge');
      });
    });

    cy.on('tap', (evt: EventObject) => {
      if (evt.target === cy) {
        cy.batch(() => {
          cy.elements().removeClass('highlighted-node highlighted-edge faded');
        });
        setActiveInspectorNodeId(null);
        setSelectedIssueId(null);
      }
    });

    cyRef.current = cy;

    return () => {
      cy.destroy();
    };
  }, [cyElements, layoutName]);

  // Run layout when layoutName changes
  const applyLayout = (name: 'cose' | 'concentric' | 'circle' | 'breadthfirst' | 'grid') => {
    setLayoutName(name);
    if (cyRef.current) {
      cyRef.current.layout({ name, animate: true, animationDuration: 400, padding: 50 } as any).run();
    }
  };

  // Search node focus
  useEffect(() => {
    if (!searchQuery.trim() || !cyRef.current) return;
    const q = searchQuery.toLowerCase();
    const match = cyRef.current.nodes().filter((n) => {
      const label = n.data('label')?.toLowerCase() || '';
      const title = n.data('title')?.toLowerCase() || '';
      return label.includes(q) || title.includes(q);
    });

    if (match.length > 0) {
      const first = match[0];
      cyRef.current.animate({
        center: { eles: first },
        zoom: 1.8,
        duration: 350,
      });
      setActiveInspectorNodeId(first.id());
      first.select();
    }
  }, [searchQuery]);

  // Active inspector node details
  const inspectorIssue = issues.find((i) => i.id === activeInspectorNodeId);
  const inspectorMetric = activeInspectorNodeId ? nodeMetrics.get(activeInspectorNodeId) : null;

  return (
    <div className="space-y-4 max-w-7xl mx-auto">
      {/* Top Controls Bar */}
      <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 flex flex-wrap items-center justify-between gap-4">
        {/* Left search & summary */}
        <div className="flex items-center gap-3 flex-1 min-w-[280px]">
          <div className="relative flex-1 max-w-xs">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search complaint ID or node..."
              className="w-full pl-9 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div className="hidden sm:flex items-center gap-2 text-xs text-slate-400">
            <span className="font-mono text-cyan-400 font-semibold tabular-nums">
              {filteredIssues.length}
            </span>{' '}
            nodes
            <span className="text-slate-600">·</span>
            <span className="font-mono text-cyan-400 font-semibold tabular-nums">
              {filteredEdges.length}
            </span>{' '}
            edges
          </div>
        </div>

        {/* View Layout & Modes */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Layout switcher */}
          <div className="flex items-center bg-slate-950 border border-slate-800 rounded-lg p-1 text-xs">
            {(['cose', 'concentric', 'circle', 'breadthfirst', 'grid'] as const).map((l) => (
              <button
                key={l}
                onClick={() => applyLayout(l)}
                className={`px-2.5 py-1 rounded transition-colors uppercase text-[10px] font-semibold ${
                  layoutName === l
                    ? 'bg-cyan-500/20 text-cyan-300 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {l}
              </button>
            ))}
          </div>

          {/* Color Mode */}
          <div className="flex items-center bg-slate-950 border border-slate-800 rounded-lg p-1 text-xs">
            <button
              onClick={() => setColorMode('category')}
              className={`px-2.5 py-1 rounded transition-colors text-[10px] font-medium ${
                colorMode === 'category'
                  ? 'bg-slate-800 text-white font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Category
            </button>
            <button
              onClick={() => setColorMode('community')}
              className={`px-2.5 py-1 rounded transition-colors text-[10px] font-medium ${
                colorMode === 'community'
                  ? 'bg-purple-900/60 text-purple-200 font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Community
            </button>
          </div>

          {/* Size Mode */}
          <div className="flex items-center bg-slate-950 border border-slate-800 rounded-lg p-1 text-xs">
            <button
              onClick={() => setSizeMode('degree')}
              className={`px-2 py-1 rounded transition-colors text-[10px] ${
                sizeMode === 'degree' ? 'bg-slate-800 text-cyan-300 font-semibold' : 'text-slate-400'
              }`}
            >
              Degree Size
            </button>
            <button
              onClick={() => setSizeMode('betweenness')}
              className={`px-2 py-1 rounded transition-colors text-[10px] ${
                sizeMode === 'betweenness' ? 'bg-slate-800 text-cyan-300 font-semibold' : 'text-slate-400'
              }`}
            >
              Centrality Size
            </button>
            <button
              onClick={() => setSizeMode('uniform')}
              className={`px-2 py-1 rounded transition-colors text-[10px] ${
                sizeMode === 'uniform' ? 'bg-slate-800 text-cyan-300 font-semibold' : 'text-slate-400'
              }`}
            >
              Uniform
            </button>
          </div>

          {/* Canvas Navigation Tools */}
          <div className="flex items-center gap-1 border-l border-slate-800 pl-2">
            <button
              onClick={() => cyRef.current?.zoom(cyRef.current.zoom() * 1.25)}
              className="p-1.5 rounded-lg bg-slate-950 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800 transition-colors"
              title="Zoom In"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <button
              onClick={() => cyRef.current?.zoom(cyRef.current.zoom() * 0.8)}
              className="p-1.5 rounded-lg bg-slate-950 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800 transition-colors"
              title="Zoom Out"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <button
              onClick={() => cyRef.current?.fit(undefined, 40)}
              className="p-1.5 rounded-lg bg-slate-950 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800 transition-colors"
              title="Fit to screen"
            >
              <Maximize2 className="w-4 h-4" />
            </button>
            <button
              onClick={() => {
                cyRef.current?.reset();
                applyLayout(layoutName);
              }}
              className="p-1.5 rounded-lg bg-slate-950 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800 transition-colors"
              title="Reset View"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800/80 flex flex-wrap items-center gap-3 text-xs">
        <div className="flex items-center gap-1.5 text-slate-400 font-medium">
          <Filter className="w-3.5 h-3.5" />
          <span>Filters:</span>
        </div>

        {/* Category */}
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="px-2.5 py-1 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none"
        >
          <option value="all">All Categories</option>
          {Object.entries(CATEGORY_COLORS).map(([c, val]) => (
            <option key={c} value={c}>
              {val.label}
            </option>
          ))}
        </select>

        {/* Community */}
        <select
          value={selectedCommunityId === null ? 'all' : String(selectedCommunityId)}
          onChange={(e) =>
            setSelectedCommunityId(e.target.value === 'all' ? null : Number(e.target.value))
          }
          className="px-2.5 py-1 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none"
        >
          <option value="all">All Communities</option>
          {communitySummaries.map((comm) => (
            <option key={comm.communityId} value={comm.communityId}>
              Community #{comm.communityId} ({comm.issueCount} nodes)
            </option>
          ))}
        </select>

        {/* Relationship Type */}
        <select
          value={selectedRelType}
          onChange={(e) => setSelectedRelType(e.target.value)}
          className="px-2.5 py-1 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none"
        >
          <option value="all">All Edge Types</option>
          {Object.entries(RELATIONSHIP_LABELS).map(([t, val]) => (
            <option key={t} value={t}>
              {val.label}
            </option>
          ))}
        </select>

        {/* Min Degree Filter */}
        <div className="flex items-center gap-2 bg-slate-950 px-2.5 py-1 border border-slate-800 rounded-lg">
          <span className="text-slate-400">Min Degree:</span>
          <span className="font-mono text-cyan-400 font-semibold">{minDegree}</span>
          <input
            type="range"
            min="0"
            max="6"
            value={minDegree}
            onChange={(e) => setMinDegree(Number(e.target.value))}
            className="w-16 accent-cyan-400 cursor-pointer"
          />
        </div>

        {/* Clear filters */}
        {(selectedCategory !== 'all' ||
          selectedCommunityId !== null ||
          selectedRelType !== 'all' ||
          minDegree > 0) && (
          <button
            onClick={() => {
              setSelectedCategory('all');
              setSelectedCommunityId(null);
              setSelectedRelType('all');
              setMinDegree(0);
            }}
            className="text-rose-400 hover:text-rose-300 underline ml-auto"
          >
            Clear Filters
          </button>
        )}
      </div>

      {/* Main Graph Area + Inspector Drawer */}
      <div className="relative h-[640px] rounded-2xl bg-slate-950 border border-slate-800 overflow-hidden shadow-2xl flex">
        {/* Cytoscape Canvas Container */}
        <div
          ref={containerRef}
          className="w-full h-full cytoscape-container bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:24px_24px]"
        />

        {/* Empty state if 0 nodes */}
        {filteredIssues.length === 0 && (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-slate-950/90 z-10">
            <Info className="w-10 h-10 text-slate-600 mb-3" />
            <h3 className="text-base font-semibold text-white">No Issues Found</h3>
            <p className="text-xs text-slate-400 max-w-sm mt-1">
              Active filters exclude all records in current dataset. Reset filters to restore network.
            </p>
            <button
              onClick={() => {
                setSelectedCategory('all');
                setSelectedCommunityId(null);
                setSelectedRelType('all');
                setMinDegree(0);
              }}
              className="mt-4 px-4 py-2 text-xs font-semibold text-slate-950 bg-cyan-400 hover:bg-cyan-300 rounded-lg transition-colors"
            >
              Reset Filters
            </button>
          </div>
        )}

        {/* Node & Edge Legends Overlay */}
        <div className="absolute top-4 left-4 z-10 bg-slate-900/90 backdrop-blur-md border border-slate-800 rounded-xl p-3.5 max-w-xs shadow-xl space-y-3 pointer-events-auto text-xs hidden md:block">
          <div>
            <div className="text-[11px] uppercase tracking-wider font-semibold text-slate-400 mb-2">
              {colorMode === 'category' ? 'Category Color Codes' : 'Community Clusters'}
            </div>
            <div className="grid grid-cols-2 gap-1.5 max-h-36 overflow-y-auto">
              {colorMode === 'category'
                ? Object.entries(CATEGORY_COLORS).map(([c, val]) => (
                    <div key={c} className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: val.hex }} />
                      <span className="text-slate-300 text-[11px] truncate">{val.label}</span>
                    </div>
                  ))
                : communitySummaries.map((comm) => (
                    <div key={comm.communityId} className="flex items-center gap-1.5">
                      <span
                        className="w-2.5 h-2.5 rounded-sm"
                        style={{ backgroundColor: getCommunityColor(comm.communityId) }}
                      />
                      <span className="text-slate-300 text-[11px] truncate">
                        Comm #{comm.communityId} ({comm.issueCount})
                      </span>
                    </div>
                  ))}
            </div>
          </div>

          <div className="pt-2 border-t border-slate-800/80">
            <div className="text-[11px] uppercase tracking-wider font-semibold text-slate-400 mb-1.5">
              Explainable Edge Rules
            </div>
            <div className="space-y-1">
              {Object.entries(RELATIONSHIP_LABELS).map(([t, val]) => (
                <div key={t} className="flex items-center gap-2">
                  <span className="w-4 h-0.5" style={{ backgroundColor: val.color }} />
                  <span className="text-slate-300 text-[11px]">{val.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Selected Node Inspector Drawer */}
        {inspectorIssue && (
          <div className="absolute top-4 right-4 bottom-4 w-80 z-20 bg-slate-900/95 backdrop-blur-lg border border-slate-800 rounded-xl p-4 shadow-2xl flex flex-col justify-between overflow-y-auto text-xs space-y-4 animate-in slide-in-from-right duration-200">
            <div className="space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <div className="font-mono text-cyan-400 font-semibold text-xs">
                    {inspectorIssue.externalComplaintId}
                  </div>
                  <h3 className="font-semibold text-white text-sm mt-0.5 leading-snug">
                    {inspectorIssue.title}
                  </h3>
                </div>
                <button
                  onClick={() => setActiveInspectorNodeId(null)}
                  className="text-slate-400 hover:text-white p-1"
                >
                  ✕
                </button>
              </div>

              {/* Status and category tags */}
              <div className="flex items-center gap-2 text-[11px]">
                <span className={CATEGORY_COLORS[inspectorIssue.category]?.text}>
                  {CATEGORY_COLORS[inspectorIssue.category]?.label}
                </span>
                <span className="text-slate-600">·</span>
                <span className={PRIORITY_STYLES[inspectorIssue.priority]?.text}>
                  {PRIORITY_STYLES[inspectorIssue.priority]?.label}
                </span>
                <span className="text-slate-600">·</span>
                <span className={STATUS_STYLES[inspectorIssue.status]?.text}>
                  {STATUS_STYLES[inspectorIssue.status]?.label}
                </span>
              </div>

              {/* Description */}
              <p className="text-slate-300 text-[11px] bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/80 leading-relaxed">
                {inspectorIssue.description}
              </p>

              {/* Location and Agency */}
              <div className="space-y-1.5 text-slate-300 text-[11px]">
                <div>
                  <span className="text-slate-400">Site: </span>
                  <span className="font-medium text-slate-200">{inspectorIssue.locationName}</span>
                </div>
                <div>
                  <span className="text-slate-400">Agency: </span>
                  <span>{inspectorIssue.responsibleAgency}</span>
                </div>
                {inspectorIssue.infrastructureId && (
                  <div>
                    <span className="text-slate-400">Infrastructure ID: </span>
                    <span className="font-mono text-purple-300 font-semibold">
                      {inspectorIssue.infrastructureId}
                    </span>
                  </div>
                )}
              </div>

              {/* Real Graph Metrics */}
              {inspectorMetric && (
                <div className="p-3 rounded-lg bg-slate-950/80 border border-slate-800 space-y-2">
                  <div className="text-[11px] font-semibold text-cyan-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Activity className="w-3.5 h-3.5" />
                    Topological Centrality
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-center text-[11px]">
                    <div className="p-2 bg-slate-900 rounded border border-slate-800">
                      <div className="text-slate-400">Degree</div>
                      <div className="text-base font-bold font-mono text-cyan-400">
                        {inspectorMetric.degree}
                      </div>
                    </div>
                    <div className="p-2 bg-slate-900 rounded border border-slate-800">
                      <div className="text-slate-400">Betweenness</div>
                      <div className="text-base font-bold font-mono text-purple-400">
                        {inspectorMetric.betweennessCentrality.toFixed(4)}
                      </div>
                    </div>
                  </div>
                  <div className="text-[11px] text-slate-400 flex justify-between pt-1">
                    <span>Louvain Community:</span>
                    <span className="font-mono text-slate-200 font-semibold">
                      #{inspectorMetric.communityId}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400 flex justify-between">
                    <span>Connected Component:</span>
                    <span className="font-mono text-slate-200 font-semibold">
                      #{inspectorMetric.componentId}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Inspect Modal Trigger */}
            <button
              onClick={() => onOpenIssue(inspectorIssue.id)}
              className="w-full py-2 px-3 text-xs font-semibold text-slate-950 bg-gradient-to-r from-cyan-400 to-cyan-300 hover:from-cyan-300 hover:to-cyan-200 rounded-lg shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Eye className="w-4 h-4" />
              <span>Open Detailed Ticket View</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
