import {
  CivicIssue,
  CivicEdge,
  CivicAlert,
  GraphNodeMetrics,
  DataQualityReport,
} from '../types/civic';
import { normalizeLocation } from './graphEngine';

/**
 * Computes transparent, deterministic rule-based civic alerts from issues and active graph metrics.
 */
export function generateCivicAlerts(
  issues: CivicIssue[],
  edges: CivicEdge[],
  nodeMetrics: Map<string, GraphNodeMetrics>,
  dataQuality: DataQualityReport
): CivicAlert[] {
  const alerts: CivicAlert[] = [];
  const now = new Date().getTime();

  // 1. Repeated complaints at a verified location (>=3 unresolved complaints at same normalized site)
  const locationGroups = new Map<string, CivicIssue[]>();
  issues.forEach((issue) => {
    if (issue.status !== 'resolved' && issue.status !== 'closed') {
      const loc = normalizeLocation(issue.locationName);
      if (loc.length > 2) {
        if (!locationGroups.has(loc)) locationGroups.set(loc, []);
        locationGroups.get(loc)!.push(issue);
      }
    }
  });

  locationGroups.forEach((groupIssues, loc) => {
    if (groupIssues.length >= 3) {
      alerts.push({
        id: `alert-loc-repeat-${loc.replace(/\s+/g, '-').slice(0, 20)}`,
        type: 'REPEATED_LOCATION',
        severity: groupIssues.length >= 5 ? 'critical' : 'warning',
        title: `Persistent Site Failure: "${groupIssues[0].locationName}"`,
        description: `${groupIssues.length} open complaints reported at this identical municipal location across categories (${Array.from(new Set(groupIssues.map((i) => i.category))).join(', ')}).`,
        ruleExplanation: `Rule [PersistentLocation]: Triggered when ≥ 3 active (non-resolved) issues share a normalized location name within the current municipal registry.`,
        affectedIssues: groupIssues.map((i) => i.id),
        timestamp: new Date().toISOString(),
      });
    }
  });

  // 2. High-priority unresolved issues (> 5 days old)
  const stalledHighPriority = issues.filter((issue) => {
    if (issue.status === 'resolved' || issue.status === 'closed') return false;
    if (issue.priority !== 'high' && issue.priority !== 'critical') return false;
    const ageDays = (now - new Date(issue.createdDate).getTime()) / (1000 * 60 * 60 * 24);
    return ageDays >= 5;
  });

  if (stalledHighPriority.length > 0) {
    alerts.push({
      id: 'alert-high-priority-stalled',
      type: 'HIGH_PRIORITY_STALLED',
      severity: 'critical',
      title: `${stalledHighPriority.length} High/Critical Priority Issues Stalled`,
      description: `Multiple urgent municipal complaints have remained active without resolution for more than 5 days.`,
      ruleExplanation: `Rule [CriticalSLAThreshold]: Triggered when priority is 'high' or 'critical', status is not 'resolved'/'closed', and complaint age exceeds 5 calendar days.`,
      affectedIssues: stalledHighPriority.map((i) => i.id),
      timestamp: new Date().toISOString(),
    });
  }

  // 3. Long-pending complaints (age > 21 days regardless of priority)
  const longPending = issues.filter((issue) => {
    if (issue.status === 'resolved' || issue.status === 'closed') return false;
    const ageDays = (now - new Date(issue.createdDate).getTime()) / (1000 * 60 * 60 * 24);
    return ageDays >= 21;
  });

  if (longPending.length >= 3) {
    alerts.push({
      id: 'alert-aging-pending',
      type: 'AGING_PENDING',
      severity: 'warning',
      title: `${longPending.length} Overdue Municipal Complaints (>21 Days)`,
      description: `Citizens have had unresolved requests in queue for over 3 weeks across ${Array.from(new Set(longPending.map((i) => i.responsibleAgency))).join(', ')}.`,
      ruleExplanation: `Rule [BacklogAging]: Triggered when ≥ 3 complaints remain non-resolved after 21 days from created date timestamp.`,
      affectedIssues: longPending.map((i) => i.id),
      timestamp: new Date().toISOString(),
    });
  }

  // 4. Growing groups of connected complaints (connected component size >= 5)
  const componentGroups = new Map<number, string[]>();
  nodeMetrics.forEach((metrics, id) => {
    const compId = metrics.componentId;
    if (!componentGroups.has(compId)) componentGroups.set(compId, []);
    componentGroups.get(compId)!.push(id);
  });

  let largestClusterSize = 0;
  let largestClusterIds: string[] = [];
  componentGroups.forEach((memberIds) => {
    if (memberIds.length > largestClusterSize) {
      largestClusterSize = memberIds.length;
      largestClusterIds = memberIds;
    }
  });

  if (largestClusterSize >= 5) {
    alerts.push({
      id: 'alert-growing-cluster',
      type: 'GROWING_CLUSTER',
      severity: largestClusterSize >= 8 ? 'critical' : 'warning',
      title: `Expanded Civic Failure Cluster (${largestClusterSize} Linked Nodes)`,
      description: `A dense interconnected cluster of civic issues has formed, indicating cascading infrastructure impact across multiple streets or sectors.`,
      ruleExplanation: `Rule [GraphComponentExpansion]: Triggered when topological connected component analysis finds a connected subgraph containing ≥ 5 mutually reachable issue nodes.`,
      affectedIssues: largestClusterIds,
      timestamp: new Date().toISOString(),
    });
  }

  // 5. Volume spike (>= 4 complaints within last 48 hours in same category)
  const recentCategoryGroups = new Map<string, CivicIssue[]>();
  issues.forEach((issue) => {
    const ageHours = (now - new Date(issue.createdDate).getTime()) / (1000 * 60 * 60);
    if (ageHours <= 72) {
      if (!recentCategoryGroups.has(issue.category)) recentCategoryGroups.set(issue.category, []);
      recentCategoryGroups.get(issue.category)!.push(issue);
    }
  });

  recentCategoryGroups.forEach((catIssues, cat) => {
    if (catIssues.length >= 4) {
      alerts.push({
        id: `alert-spike-${cat}`,
        type: 'VOLUME_SPIKE',
        severity: 'warning',
        title: `Rapid Inflow Spike: ${cat.replace(/_/g, ' ').toUpperCase()}`,
        description: `${catIssues.length} complaints submitted within the past 72 hours for ${cat.replace(/_/g, ' ')}.`,
        ruleExplanation: `Rule [TemporalBurstRate]: Triggered when category filing rate surpasses 4 tickets within a rolling 72-hour window.`,
        affectedIssues: catIssues.map((i) => i.id),
        timestamp: new Date().toISOString(),
      });
    }
  });

  // 6. Data quality warnings
  if (dataQuality.missingCoordinates > 0 || dataQuality.potentialDuplicates > 0) {
    alerts.push({
      id: 'alert-data-quality',
      type: 'DATA_QUALITY',
      severity: dataQuality.overallScore < 75 ? 'critical' : 'info',
      title: `Data Quality Notice (${dataQuality.overallScore}% Integrity)`,
      description: `${dataQuality.missingCoordinates} records lack geographic coordinates; ${dataQuality.potentialDuplicates} potential duplicate complaint filings detected.`,
      ruleExplanation: `Rule [SpatialDataCompleteness]: Triggered when spatial coverage or uniqueness audit fails verification criteria.`,
      affectedIssues: dataQuality.issuesList.slice(0, 5).map((i) => i.id),
      timestamp: new Date().toISOString(),
    });
  }

  return alerts;
}

/**
 * Calculates deterministic data quality score and identifies defect rows.
 */
export function evaluateDataQuality(issues: CivicIssue[]): DataQualityReport {
  let missingCoords = 0;
  let missingInfra = 0;
  let invalidDates = 0;
  let unassignedAgency = 0;
  let potentialDuplicates = 0;
  const issuesList: { id: string; field: string; description: string }[] = [];

  const seenComplaintIds = new Set<string>();
  const seenCombos = new Set<string>();

  issues.forEach((issue) => {
    // Check coords
    if (
      issue.latitude === null ||
      issue.longitude === null ||
      isNaN(issue.latitude) ||
      isNaN(issue.longitude) ||
      issue.latitude < -90 ||
      issue.latitude > 90 ||
      issue.longitude < -180 ||
      issue.longitude > 180
    ) {
      missingCoords++;
      issuesList.push({
        id: issue.id,
        field: 'coordinates',
        description: 'Missing or out-of-range GPS latitude/longitude',
      });
    }

    // Check infra ID
    if (!issue.infrastructureId || issue.infrastructureId.trim() === '') {
      missingInfra++;
    }

    // Check dates
    const d = new Date(issue.createdDate);
    if (isNaN(d.getTime())) {
      invalidDates++;
      issuesList.push({
        id: issue.id,
        field: 'createdDate',
        description: 'Invalid ISO date timestamp format',
      });
    }

    // Check agency
    if (
      !issue.responsibleAgency ||
      issue.responsibleAgency.trim() === '' ||
      issue.responsibleAgency.toLowerCase() === 'unassigned'
    ) {
      unassignedAgency++;
      issuesList.push({
        id: issue.id,
        field: 'responsibleAgency',
        description: 'No municipal department assigned to issue ticket',
      });
    }

    // Check duplicate
    if (seenComplaintIds.has(issue.externalComplaintId)) {
      potentialDuplicates++;
      issuesList.push({
        id: issue.id,
        field: 'externalComplaintId',
        description: `Duplicate complaint identifier: ${issue.externalComplaintId}`,
      });
    } else {
      seenComplaintIds.add(issue.externalComplaintId);
    }

    const comboKey = `${normalizeLocation(issue.locationName)}:::${issue.title.toLowerCase().trim()}`;
    if (seenCombos.has(comboKey)) {
      potentialDuplicates++;
    } else {
      seenCombos.add(comboKey);
    }
  });

  const total = issues.length;
  if (total === 0) {
    return {
      totalRecords: 0,
      validRecords: 0,
      missingCoordinates: 0,
      missingInfrastructureId: 0,
      invalidDates: 0,
      potentialDuplicates: 0,
      unassignedAgency: 0,
      overallScore: 100,
      issuesList: [],
    };
  }

  // Weight penalty
  const coordPenalty = (missingCoords / total) * 35;
  const datePenalty = (invalidDates / total) * 30;
  const dupPenalty = (potentialDuplicates / total) * 20;
  const agencyPenalty = (unassignedAgency / total) * 15;

  const score = Math.max(0, Math.min(100, Math.round(100 - (coordPenalty + datePenalty + dupPenalty + agencyPenalty))));

  return {
    totalRecords: total,
    validRecords: total - issuesList.length,
    missingCoordinates: missingCoords,
    missingInfrastructureId: missingInfra,
    invalidDates,
    potentialDuplicates,
    unassignedAgency,
    overallScore: score,
    issuesList,
  };
}
