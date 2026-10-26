import React from 'react';
import {
  FileText,
  Download,
  Share2,
  Users,
  ShieldCheck,
  Activity,
  CheckCircle2,
  Database,
} from 'lucide-react';
import { useCivic } from '../context/CivicContext';
import { exportIssuesToCsv } from '../utils/csvParser';

export const ReportsPage: React.FC = () => {
  const {
    issues,
    edges,
    nodeMetrics,
    communitySummaries,
    globalMetrics,
    dataQuality,
    datasetName,
    showToast,
  } = useCivic();

  const downloadFile = (content: string, filename: string, type: string) => {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast(`Downloaded ${filename}`, 'success');
  };

  // 1. Export Issues CSV
  const handleExportIssuesCsv = () => {
    const csv = exportIssuesToCsv(issues);
    downloadFile(csv, `civic_issues_${Date.now()}.csv`, 'text/csv;charset=utf-8;');
  };

  // 2. Export Graph Topology CSV (Node metrics + Edges)
  const handleExportTopologyCsv = () => {
    const headers = [
      'node_id',
      'complaint_id',
      'title',
      'category',
      'degree',
      'degree_centrality',
      'betweenness_centrality',
      'community_id',
      'connected_component_id',
    ];
    const rows = [headers.join(',')];

    issues.forEach((i) => {
      const m = nodeMetrics.get(i.id);
      rows.push(
        [
          `"${i.id}"`,
          `"${i.externalComplaintId}"`,
          `"${i.title.replace(/"/g, '""')}"`,
          `"${i.category}"`,
          m?.degree || 0,
          m?.degreeCentrality || 0,
          m?.betweennessCentrality || 0,
          m?.communityId || 1,
          m?.componentId || 1,
        ].join(',')
      );
    });

    downloadFile(rows.join('\n'), `civic_graph_node_metrics_${Date.now()}.csv`, 'text/csv;charset=utf-8;');
  };

  // 3. Export Graph JSON (Cytoscape / NetworkX compatible format)
  const handleExportGraphJson = () => {
    const data = {
      meta: {
        dataset: datasetName,
        exportTimestamp: new Date().toISOString(),
        nodesCount: issues.length,
        edgesCount: edges.length,
        modularity: globalMetrics.modularity,
        density: globalMetrics.density,
      },
      nodes: issues.map((i) => ({
        id: i.id,
        complaintId: i.externalComplaintId,
        title: i.title,
        category: i.category,
        metrics: nodeMetrics.get(i.id),
      })),
      edges: edges.map((e) => ({
        id: e.id,
        source: e.source,
        target: e.target,
        type: e.relationshipType,
        weight: e.weight,
        evidence: e.evidence,
        distanceMeters: e.spatialDistanceMeters,
      })),
    };

    downloadFile(
      JSON.stringify(data, null, 2),
      `civic_network_graph_${Date.now()}.json`,
      'application/json'
    );
  };

  // 4. Export Community Summaries CSV
  const handleExportCommunityCsv = () => {
    const headers = [
      'community_id',
      'issue_count',
      'internal_edges',
      'cross_community_edges',
      'dominant_categories',
      'primary_locations',
    ];
    const rows = [headers.join(',')];

    communitySummaries.forEach((c) => {
      const cats = c.dominantCategories.map((dc) => `${dc.category}:${dc.count}`).join('; ');
      const locs = c.commonLocations.map((cl) => `${cl.location}:${cl.count}`).join('; ');
      rows.push(
        [
          c.communityId,
          c.issueCount,
          c.internalEdgesCount,
          c.crossCommunityEdgesCount,
          `"${cats}"`,
          `"${locs}"`,
        ].join(',')
      );
    });

    downloadFile(rows.join('\n'), `community_summaries_${Date.now()}.csv`, 'text/csv;charset=utf-8;');
  };

  // 5. Export Data Quality Audit Report
  const handleExportDataQualityReport = () => {
    const data = {
      dataset: datasetName,
      generatedAt: new Date().toISOString(),
      summary: {
        overallScorePercent: dataQuality.overallScore,
        totalRecords: dataQuality.totalRecords,
        validRecords: dataQuality.validRecords,
        missingCoordinates: dataQuality.missingCoordinates,
        potentialDuplicates: dataQuality.potentialDuplicates,
        invalidDates: dataQuality.invalidDates,
        unassignedAgency: dataQuality.unassignedAgency,
      },
      auditIssues: dataQuality.issuesList,
    };

    downloadFile(
      JSON.stringify(data, null, 2),
      `data_quality_audit_${Date.now()}.json`,
      'application/json'
    );
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="p-5 rounded-xl bg-slate-900/80 border border-slate-800/80 space-y-1">
        <div className="flex items-center gap-2 text-xs font-semibold text-cyan-400">
          <FileText className="w-4 h-4" />
          <span>MUNICIPAL DATA GOVERNANCE & EXPORT</span>
        </div>
        <h1 className="text-xl font-bold text-white tracking-tight">
          Reports & Export Dispatcher
        </h1>
        <p className="text-xs text-slate-400 max-w-2xl">
          Extract computed graph algorithms, community modularity partitions, and cleaned records
          in standard open data formats (CSV, JSON, NetworkX graph adjacency).
        </p>
      </div>

      {/* Export Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Card 1: Filtered Issues CSV */}
        <div className="p-5 rounded-xl bg-slate-900/80 border border-slate-800/80 flex flex-col justify-between space-y-4 hover:border-slate-700 transition-colors">
          <div className="space-y-2">
            <div className="w-9 h-9 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
              <Database className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-semibold text-white">Full Civic Issues Dataset (CSV)</h3>
            <p className="text-xs text-slate-400">
              Complete tabular dump of all {issues.length} active complaint records with GPS
              coordinates, timestamps, priority, and infrastructure tags.
            </p>
          </div>
          <button
            onClick={handleExportIssuesCsv}
            className="w-full py-2 px-3 text-xs font-medium text-slate-200 bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 rounded-lg flex items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download Issues CSV</span>
          </button>
        </div>

        {/* Card 2: Graph Node Centrality CSV */}
        <div className="p-5 rounded-xl bg-slate-900/80 border border-slate-800/80 flex flex-col justify-between space-y-4 hover:border-slate-700 transition-colors">
          <div className="space-y-2">
            <div className="w-9 h-9 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
              <Activity className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-semibold text-white">Graph Node Metrics & Centrality (CSV)</h3>
            <p className="text-xs text-slate-400">
              Degree, Degree Centrality, Brandes Betweenness Centrality, Connected Component IDs,
              and Louvain Community IDs for each node.
            </p>
          </div>
          <button
            onClick={handleExportTopologyCsv}
            className="w-full py-2 px-3 text-xs font-medium text-slate-200 bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 rounded-lg flex items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download Node Metrics CSV</span>
          </button>
        </div>

        {/* Card 3: Graph Topology JSON */}
        <div className="p-5 rounded-xl bg-slate-900/80 border border-slate-800/80 flex flex-col justify-between space-y-4 hover:border-slate-700 transition-colors">
          <div className="space-y-2">
            <div className="w-9 h-9 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
              <Share2 className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-semibold text-white">Full Network Topology (GraphJSON)</h3>
            <p className="text-xs text-slate-400">
              Complete graph payload with {issues.length} nodes, {edges.length} explainable edges,
              weights, and relationship classifications for NetworkX/Gephi.
            </p>
          </div>
          <button
            onClick={handleExportGraphJson}
            className="w-full py-2 px-3 text-xs font-medium text-slate-200 bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 rounded-lg flex items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download Graph JSON</span>
          </button>
        </div>

        {/* Card 4: Community Summaries CSV */}
        <div className="p-5 rounded-xl bg-slate-900/80 border border-slate-800/80 flex flex-col justify-between space-y-4 hover:border-slate-700 transition-colors">
          <div className="space-y-2">
            <div className="w-9 h-9 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <Users className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-semibold text-white">Community Modularity Partitions (CSV)</h3>
            <p className="text-xs text-slate-400">
              Community sizes, internal edges, cross-community couplings, and dominant categories
              for all {communitySummaries.length} detected clusters.
            </p>
          </div>
          <button
            onClick={handleExportCommunityCsv}
            className="w-full py-2 px-3 text-xs font-medium text-slate-200 bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 rounded-lg flex items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download Community CSV</span>
          </button>
        </div>

        {/* Card 5: Data Quality Audit JSON */}
        <div className="p-5 rounded-xl bg-slate-900/80 border border-slate-800/80 flex flex-col justify-between space-y-4 hover:border-slate-700 transition-colors md:col-span-2">
          <div className="space-y-2">
            <div className="w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-semibold text-white">Data Quality & Schema Audit Report</h3>
            <p className="text-xs text-slate-400">
              Comprehensive integrity audit score ({dataQuality.overallScore}%), missing coordinate
              locations, duplicate ticket ID checks, and date compliance.
            </p>
          </div>
          <button
            onClick={handleExportDataQualityReport}
            className="py-2 px-3 text-xs font-medium text-slate-200 bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 rounded-lg flex items-center justify-center gap-2 transition-colors cursor-pointer max-w-xs"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download Audit Report (JSON)</span>
          </button>
        </div>
      </div>
    </div>
  );
};
