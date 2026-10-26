export type CivicCategory =
  | 'roads'
  | 'potholes'
  | 'streetlights'
  | 'water_supply'
  | 'drainage'
  | 'garbage_collection'
  | 'sanitation'
  | 'traffic_safety'
  | 'public_infrastructure';

export type IssuePriority = 'low' | 'medium' | 'high' | 'critical';

export type IssueStatus =
  | 'reported'
  | 'in_progress'
  | 'under_review'
  | 'resolved'
  | 'closed';

export type RelationshipType =
  | 'EXPLICIT_LINK'
  | 'SHARED_INFRASTRUCTURE'
  | 'NORMALIZED_LOCATION'
  | 'SPATIAL_PROXIMITY'
  | 'CORRELATED_FAILURE';

export interface CivicIssue {
  id: string;
  externalComplaintId: string;
  title: string;
  description: string;
  category: CivicCategory;
  subcategory: string;
  locationName: string;
  latitude: number | null;
  longitude: number | null;
  priority: IssuePriority;
  status: IssueStatus;
  createdDate: string; // ISO 8601
  updatedDate: string; // ISO 8601
  closedDate: string | null;
  responsibleAgency: string;
  sourceDataset: string;
  infrastructureId: string | null;
}

export interface CivicEdge {
  id: string;
  source: string;
  target: string;
  relationshipType: RelationshipType;
  evidence: string;
  weight: number; // 0.1 to 1.0
  spatialDistanceMeters?: number;
  temporalGapHours?: number;
}

export interface GraphNodeMetrics {
  degree: number;
  degreeCentrality: number;
  betweennessCentrality: number;
  communityId: number;
  componentId: number;
  neighbors: string[];
}

export interface CommunitySummary {
  communityId: number;
  issueCount: number;
  dominantCategories: { category: CivicCategory; count: number }[];
  commonLocations: { location: string; count: number }[];
  internalEdgesCount: number;
  crossCommunityEdgesCount: number;
  mostConnectedIssues: { id: string; title: string; degree: number; category: CivicCategory }[];
  statusDistribution: Record<string, number>;
}

export interface GlobalGraphMetrics {
  totalNodes: number;
  totalEdges: number;
  connectedComponentsCount: number;
  communitiesCount: number;
  density: number;
  modularity: number;
  averageDegree: number;
  isolatedNodesCount: number;
}

export type AlertType =
  | 'REPEATED_LOCATION'
  | 'VOLUME_SPIKE'
  | 'HIGH_PRIORITY_STALLED'
  | 'AGING_PENDING'
  | 'GROWING_CLUSTER'
  | 'DATA_QUALITY';

export interface CivicAlert {
  id: string;
  type: AlertType;
  severity: 'info' | 'warning' | 'critical';
  title: string;
  description: string;
  ruleExplanation: string;
  affectedIssues: string[];
  timestamp: string;
}

export interface GraphFilterOptions {
  searchQuery: string;
  categories: CivicCategory[];
  statuses: IssueStatus[];
  priorities: IssuePriority[];
  relationshipTypes: RelationshipType[];
  selectedCommunity: number | 'all';
  minDegree: number;
  startDate?: string;
  endDate?: string;
}

export interface DataQualityReport {
  totalRecords: number;
  validRecords: number;
  missingCoordinates: number;
  missingInfrastructureId: number;
  invalidDates: number;
  potentialDuplicates: number;
  unassignedAgency: number;
  overallScore: number; // 0-100%
  issuesList: {
    id: string;
    field: string;
    description: string;
  }[];
}
