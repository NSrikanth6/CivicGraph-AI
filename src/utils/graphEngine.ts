import Graph from 'graphology';
import louvain from 'graphology-communities-louvain';
import {
  CivicIssue,
  CivicEdge,
  GraphNodeMetrics,
  CommunitySummary,
  GlobalGraphMetrics,
  RelationshipType,
  CivicCategory,
} from '../types/civic';

export interface GraphBuildOptions {
  spatialThresholdMeters: number; // default 250m
  temporalWindowDays: number; // default 14 days
  enableProximityEdges: boolean;
  enableInfrastructureEdges: boolean;
  enableCorrelatedFailures: boolean;
  minEdgeWeight: number; // default 0.2
}

export const DEFAULT_GRAPH_OPTIONS: GraphBuildOptions = {
  spatialThresholdMeters: 300,
  temporalWindowDays: 21,
  enableProximityEdges: true,
  enableInfrastructureEdges: true,
  enableCorrelatedFailures: true,
  minEdgeWeight: 0.2,
};

/**
 * Calculates Haversine distance in meters between two lat/lng coordinates.
 */
export function calculateHaversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3; // Earth radius in meters
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

/**
 * Normalizes location string for comparison (removes noise, trims, lowercase).
 */
export function normalizeLocation(loc: string): string {
  return loc
    .toLowerCase()
    .replace(/[,\.\-\/\\#]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Determines whether two categories are known cascade failure pairs.
 */
function isCascadePair(c1: CivicCategory, c2: CivicCategory): boolean {
  const cascadeRules = [
    ['water_supply', 'potholes'],
    ['water_supply', 'roads'],
    ['water_supply', 'drainage'],
    ['drainage', 'roads'],
    ['drainage', 'potholes'],
    ['streetlights', 'traffic_safety'],
    ['garbage_collection', 'sanitation'],
    ['public_infrastructure', 'roads'],
  ];
  return cascadeRules.some(
    ([a, b]) => (c1 === a && c2 === b) || (c1 === b && c2 === a)
  );
}

/**
 * Constructs explainable edges between issues based on domain rules.
 */
export function buildCivicEdges(
  issues: CivicIssue[],
  options: GraphBuildOptions = DEFAULT_GRAPH_OPTIONS
): CivicEdge[] {
  const edges: CivicEdge[] = [];
  const edgeSet = new Set<string>();

  const addEdge = (
    u: string,
    v: string,
    type: RelationshipType,
    evidence: string,
    weight: number,
    dist?: number,
    hours?: number
  ) => {
    if (u === v) return;
    const [source, target] = u < v ? [u, v] : [v, u];
    const key = `${source}:::${target}`;
    if (edgeSet.has(key)) return;
    if (weight < options.minEdgeWeight) return;

    edgeSet.add(key);
    edges.push({
      id: `edge-${source}-${target}`,
      source,
      target,
      relationshipType: type,
      evidence,
      weight: Math.round(weight * 100) / 100,
      spatialDistanceMeters: dist !== undefined ? Math.round(dist) : undefined,
      temporalGapHours: hours !== undefined ? Math.round(hours) : undefined,
    });
  };

  const n = issues.length;
  for (let i = 0; i < n; i++) {
    const a = issues[i];
    const timeA = new Date(a.createdDate).getTime();
    const locA = normalizeLocation(a.locationName);

    for (let j = i + 1; j < n; j++) {
      const b = issues[j];
      const timeB = new Date(b.createdDate).getTime();
      const hoursDiff = Math.abs(timeA - timeB) / (1000 * 60 * 60);
      const daysDiff = hoursDiff / 24;

      // 1. Explicit cross-link in text/metadata
      const aMentionsB =
        a.description.includes(b.externalComplaintId) ||
        a.description.includes(b.id) ||
        a.title.includes(b.externalComplaintId);
      const bMentionsA =
        b.description.includes(a.externalComplaintId) ||
        b.description.includes(a.id) ||
        b.title.includes(a.externalComplaintId);

      if (aMentionsB || bMentionsA) {
        addEdge(
          a.id,
          b.id,
          'EXPLICIT_LINK',
          `Direct cross-complaint reference between ${a.externalComplaintId} and ${b.externalComplaintId}`,
          0.95,
          undefined,
          hoursDiff
        );
        continue;
      }

      // 2. Shared infrastructure ID
      if (
        options.enableInfrastructureEdges &&
        a.infrastructureId &&
        b.infrastructureId &&
        a.infrastructureId.trim() !== '' &&
        a.infrastructureId.toLowerCase() === b.infrastructureId.toLowerCase()
      ) {
        addEdge(
          a.id,
          b.id,
          'SHARED_INFRASTRUCTURE',
          `Verified shared asset identifier: ${a.infrastructureId}`,
          0.92,
          undefined,
          hoursDiff
        );
        continue;
      }

      // Spatial calculations if both have valid coordinates
      let distMeters: number | null = null;
      if (
        a.latitude !== null &&
        a.longitude !== null &&
        b.latitude !== null &&
        b.longitude !== null
      ) {
        distMeters = calculateHaversineDistance(
          a.latitude,
          a.longitude,
          b.latitude,
          b.longitude
        );
      }

      // 3. Normalized location match
      if (locA.length > 3 && locA === normalizeLocation(b.locationName)) {
        if (daysDiff <= options.temporalWindowDays * 2) {
          const weight = Math.max(0.65, 0.88 - (daysDiff / 30) * 0.2);
          addEdge(
            a.id,
            b.id,
            'NORMALIZED_LOCATION',
            `Matching municipal site "${a.locationName}" reported within ${Math.round(daysDiff)} days`,
            weight,
            distMeters || 0,
            hoursDiff
          );
          continue;
        }
      }

      // 4. Correlated cascade failure (cross-category with proximity & temporal window)
      if (
        options.enableCorrelatedFailures &&
        distMeters !== null &&
        distMeters <= 200 &&
        daysDiff <= 7 &&
        isCascadePair(a.category, b.category)
      ) {
        const weight = 0.85 * (1 - distMeters / 250);
        addEdge(
          a.id,
          b.id,
          'CORRELATED_FAILURE',
          `Cascade failure interaction (${a.category} ↔ ${b.category}) within ${Math.round(distMeters)}m and ${Math.round(hoursDiff)}h`,
          weight,
          distMeters,
          hoursDiff
        );
        continue;
      }

      // 5. Spatial proximity with temporal window
      if (
        options.enableProximityEdges &&
        distMeters !== null &&
        distMeters <= options.spatialThresholdMeters &&
        daysDiff <= options.temporalWindowDays
      ) {
        // Higher weight if same category
        const sameCategoryBonus = a.category === b.category ? 0.2 : 0;
        const spatialFactor = 1 - distMeters / options.spatialThresholdMeters;
        const temporalFactor = 1 - daysDiff / options.temporalWindowDays;
        const weight = Math.min(0.9, 0.3 + spatialFactor * 0.4 + temporalFactor * 0.2 + sameCategoryBonus);

        addEdge(
          a.id,
          b.id,
          'SPATIAL_PROXIMITY',
          `Proximity co-occurrence: ${Math.round(distMeters)}m apart within ${Math.round(daysDiff)} days (${a.category}${a.category === b.category ? '' : ` / ${b.category}`})`,
          weight,
          distMeters,
          hoursDiff
        );
      }
    }
  }

  return edges;
}

/**
 * Calculates Brandes' betweenness centrality for all nodes in an undirected graph.
 */
function calculateBetweennessCentrality(
  nodeIds: string[],
  adj: Map<string, string[]>
): Map<string, number> {
  const cb = new Map<string, number>();
  nodeIds.forEach((id) => cb.set(id, 0));
  const n = nodeIds.length;
  if (n <= 2) return cb;

  for (const s of nodeIds) {
    const stack: string[] = [];
    const p = new Map<string, string[]>();
    nodeIds.forEach((id) => p.set(id, []));

    const sigma = new Map<string, number>();
    nodeIds.forEach((id) => sigma.set(id, 0));
    sigma.set(s, 1);

    const d = new Map<string, number>();
    nodeIds.forEach((id) => d.set(id, -1));
    d.set(s, 0);

    const q: string[] = [s];

    while (q.length > 0) {
      const v = q.shift()!;
      stack.push(v);
      const vDist = d.get(v)!;
      const neighbors = adj.get(v) || [];

      for (const w of neighbors) {
        // w found for first time?
        if (d.get(w)! < 0) {
          d.set(w, vDist + 1);
          q.push(w);
        }
        // shortest path to w via v?
        if (d.get(w)! === vDist + 1) {
          sigma.set(w, sigma.get(w)! + sigma.get(v)!);
          p.get(w)!.push(v);
        }
      }
    }

    const delta = new Map<string, number>();
    nodeIds.forEach((id) => delta.set(id, 0));

    while (stack.length > 0) {
      const w = stack.pop()!;
      for (const v of p.get(w)!) {
        const c = (sigma.get(v)! / sigma.get(w)!) * (1 + delta.get(w)!);
        delta.set(v, delta.get(v)! + c);
      }
      if (w !== s) {
        cb.set(w, cb.get(w)! + delta.get(w)!);
      }
    }
  }

  // Undirected graph normalization: divide by 2, then by (n-1)*(n-2)/2
  const normFactor = (n - 1) * (n - 2);
  if (normFactor > 0) {
    nodeIds.forEach((id) => {
      const raw = cb.get(id)! / 2;
      cb.set(id, Math.round((raw / ((n - 1) * (n - 2) / 2)) * 10000) / 10000);
    });
  }

  return cb;
}

/**
 * Computes connected components using Breadth-First Search (BFS).
 */
function computeConnectedComponents(
  nodeIds: string[],
  adj: Map<string, string[]>
): { componentMap: Map<string, number>; componentCount: number } {
  const componentMap = new Map<string, number>();
  let currentComponent = 0;
  const visited = new Set<string>();

  for (const node of nodeIds) {
    if (!visited.has(node)) {
      currentComponent++;
      const queue = [node];
      visited.add(node);
      componentMap.set(node, currentComponent);

      while (queue.length > 0) {
        const curr = queue.shift()!;
        const neighbors = adj.get(curr) || [];
        for (const neighbor of neighbors) {
          if (!visited.has(neighbor)) {
            visited.add(neighbor);
            componentMap.set(neighbor, currentComponent);
            queue.push(neighbor);
          }
        }
      }
    }
  }

  return { componentMap, componentCount: currentComponent };
}

/**
 * Computes Louvain Community Detection using Graphology.
 */
function computeLouvainCommunities(
  nodeIds: string[],
  edges: CivicEdge[]
): { communityMap: Map<string, number>; communityCount: number; modularity: number } {
  const communityMap = new Map<string, number>();

  if (nodeIds.length === 0) {
    return { communityMap, communityCount: 0, modularity: 0 };
  }

  try {
    const graph = new Graph({ type: 'undirected', multi: false });

    nodeIds.forEach((id) => graph.addNode(id));

    edges.forEach((edge) => {
      if (
        graph.hasNode(edge.source) &&
        graph.hasNode(edge.target) &&
        !graph.hasEdge(edge.source, edge.target)
      ) {
        graph.addEdge(edge.source, edge.target, { weight: edge.weight });
      }
    });

    if (edges.length === 0) {
      // Each node in its own community
      nodeIds.forEach((id, idx) => communityMap.set(id, idx + 1));
      return { communityMap, communityCount: nodeIds.length, modularity: 0 };
    }

    // Run louvain
    const communities = louvain(graph, {
      getEdgeWeight: 'weight',
    });

    const uniqueCommunityIds = Array.from(new Set(Object.values(communities))).sort();
    const communityIndexMap = new Map<string | number, number>();
    uniqueCommunityIds.forEach((rawId, idx) => communityIndexMap.set(rawId, idx + 1));

    nodeIds.forEach((id) => {
      const rawComm = communities[id];
      communityMap.set(id, communityIndexMap.get(rawComm) || 1);
    });

    // Compute modularity Q:
    // Q = 1/(2m) * sum_ij [ A_ij - (k_i * k_j)/(2m) ] * delta(c_i, c_j)
    const m = edges.reduce((acc, e) => acc + (e.weight || 1), 0);
    let q = 0;
    if (m > 0) {
      const degrees = new Map<string, number>();
      nodeIds.forEach((id) => degrees.set(id, 0));
      edges.forEach((e) => {
        const w = e.weight || 1;
        degrees.set(e.source, (degrees.get(e.source) || 0) + w);
        degrees.set(e.target, (degrees.get(e.target) || 0) + w);
      });

      // Internal edge weights per community
      const commEdgeSum = new Map<number, number>();
      const commDegSum = new Map<number, number>();

      edges.forEach((e) => {
        const c1 = communityMap.get(e.source);
        const c2 = communityMap.get(e.target);
        if (c1 === c2 && c1 !== undefined) {
          commEdgeSum.set(c1, (commEdgeSum.get(c1) || 0) + (e.weight || 1));
        }
      });

      nodeIds.forEach((id) => {
        const c = communityMap.get(id);
        if (c !== undefined) {
          commDegSum.set(c, (commDegSum.get(c) || 0) + (degrees.get(id) || 0));
        }
      });

      const uniqueCommunities = Array.from(communityIndexMap.values());
      for (const c of uniqueCommunities) {
        const lc = commEdgeSum.get(c) || 0;
        const dc = commDegSum.get(c) || 0;
        q += lc / m - Math.pow(dc / (2 * m), 2);
      }
    }

    return {
      communityMap,
      communityCount: uniqueCommunityIds.length,
      modularity: Math.max(0, Math.round(q * 1000) / 1000),
    };
  } catch (err) {
    console.warn('Louvain community calculation fallback:', err);
    // Fallback: 1 community
    nodeIds.forEach((id) => communityMap.set(id, 1));
    return { communityMap, communityCount: 1, modularity: 0 };
  }
}

/**
 * Complete graph metrics pipeline. Runs real graph algorithms over the active dataset and edge list.
 */
export function analyzeGraph(
  issues: CivicIssue[],
  edges: CivicEdge[]
): {
  nodeMetrics: Map<string, GraphNodeMetrics>;
  communitySummaries: CommunitySummary[];
  globalMetrics: GlobalGraphMetrics;
} {
  const nodeIds = issues.map((i) => i.id);
  const issuesMap = new Map<string, CivicIssue>(issues.map((i) => [i.id, i]));
  const n = nodeIds.length;

  // Build Adjacency List
  const adj = new Map<string, string[]>();
  nodeIds.forEach((id) => adj.set(id, []));

  edges.forEach((edge) => {
    if (adj.has(edge.source) && adj.has(edge.target)) {
      adj.get(edge.source)!.push(edge.target);
      adj.get(edge.target)!.push(edge.source);
    }
  });

  // 1. Connected Components (BFS)
  const { componentMap, componentCount } = computeConnectedComponents(nodeIds, adj);

  // 2. Degree and Degree Centrality
  const degreeMap = new Map<string, number>();
  const degreeCentralityMap = new Map<string, number>();

  nodeIds.forEach((id) => {
    const deg = adj.get(id)?.length || 0;
    degreeMap.set(id, deg);
    const centrality = n > 1 ? deg / (n - 1) : 0;
    degreeCentralityMap.set(id, Math.round(centrality * 1000) / 1000);
  });

  // 3. Betweenness Centrality (Brandes Algorithm)
  const betweennessMap = calculateBetweennessCentrality(nodeIds, adj);

  // 4. Louvain Community Detection
  const { communityMap, communityCount, modularity } = computeLouvainCommunities(
    nodeIds,
    edges
  );

  // Combine node metrics
  const nodeMetrics = new Map<string, GraphNodeMetrics>();
  nodeIds.forEach((id) => {
    nodeMetrics.set(id, {
      degree: degreeMap.get(id) || 0,
      degreeCentrality: degreeCentralityMap.get(id) || 0,
      betweennessCentrality: betweennessMap.get(id) || 0,
      communityId: communityMap.get(id) || 1,
      componentId: componentMap.get(id) || 1,
      neighbors: adj.get(id) || [],
    });
  });

  // 5. Global Metrics
  const totalEdges = edges.length;
  const maxPossibleEdges = n > 1 ? (n * (n - 1)) / 2 : 1;
  const density = n > 1 ? Math.round((totalEdges / maxPossibleEdges) * 10000) / 10000 : 0;
  const averageDegree = n > 0 ? Math.round(((totalEdges * 2) / n) * 100) / 100 : 0;
  const isolatedNodesCount = Array.from(degreeMap.values()).filter((d) => d === 0).length;

  const globalMetrics: GlobalGraphMetrics = {
    totalNodes: n,
    totalEdges,
    connectedComponentsCount: componentCount,
    communitiesCount: communityCount,
    density,
    modularity,
    averageDegree,
    isolatedNodesCount,
  };

  // 6. Community Summaries
  const communitySummariesMap = new Map<
    number,
    {
      communityId: number;
      issues: CivicIssue[];
      internalEdgesCount: number;
      crossCommunityEdgesCount: number;
    }
  >();

  for (let c = 1; c <= communityCount; c++) {
    communitySummariesMap.set(c, {
      communityId: c,
      issues: [],
      internalEdgesCount: 0,
      crossCommunityEdgesCount: 0,
    });
  }

  issues.forEach((issue) => {
    const cId = communityMap.get(issue.id) || 1;
    if (communitySummariesMap.has(cId)) {
      communitySummariesMap.get(cId)!.issues.push(issue);
    }
  });

  edges.forEach((edge) => {
    const c1 = communityMap.get(edge.source);
    const c2 = communityMap.get(edge.target);
    if (c1 !== undefined && c2 !== undefined) {
      if (c1 === c2) {
        if (communitySummariesMap.has(c1)) {
          communitySummariesMap.get(c1)!.internalEdgesCount++;
        }
      } else {
        if (communitySummariesMap.has(c1)) {
          communitySummariesMap.get(c1)!.crossCommunityEdgesCount++;
        }
        if (communitySummariesMap.has(c2)) {
          communitySummariesMap.get(c2)!.crossCommunityEdgesCount++;
        }
      }
    }
  });

  const communitySummaries: CommunitySummary[] = [];

  communitySummariesMap.forEach((data, cId) => {
    if (data.issues.length === 0) return;

    // Dominant categories
    const categoryCounts: Record<string, number> = {};
    const locationCounts: Record<string, number> = {};
    const statusCounts: Record<string, number> = {};

    data.issues.forEach((issue) => {
      categoryCounts[issue.category] = (categoryCounts[issue.category] || 0) + 1;
      locationCounts[issue.locationName] = (locationCounts[issue.locationName] || 0) + 1;
      statusCounts[issue.status] = (statusCounts[issue.status] || 0) + 1;
    });

    const dominantCategories = Object.entries(categoryCounts)
      .map(([cat, count]) => ({ category: cat as CivicCategory, count }))
      .sort((a, b) => b.count - a.count);

    const commonLocations = Object.entries(locationCounts)
      .map(([loc, count]) => ({ location: loc, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Highly connected members in this community
    const mostConnectedIssues = data.issues
      .map((issue) => ({
        id: issue.id,
        title: issue.title,
        category: issue.category,
        degree: degreeMap.get(issue.id) || 0,
      }))
      .sort((a, b) => b.degree - a.degree)
      .slice(0, 4);

    communitySummaries.push({
      communityId: cId,
      issueCount: data.issues.length,
      dominantCategories,
      commonLocations,
      internalEdgesCount: data.internalEdgesCount,
      crossCommunityEdgesCount: data.crossCommunityEdgesCount,
      mostConnectedIssues,
      statusDistribution: statusCounts,
    });
  });

  communitySummaries.sort((a, b) => b.issueCount - a.issueCount);

  return {
    nodeMetrics,
    communitySummaries,
    globalMetrics,
  };
}
