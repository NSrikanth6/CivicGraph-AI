import {
  CivicCategory,
  IssuePriority,
  IssueStatus,
  RelationshipType,
} from '../types/civic';

export const CATEGORY_COLORS: Record<CivicCategory, { hex: string; bg: string; text: string; label: string }> = {
  roads: {
    hex: '#f59e0b',
    bg: 'bg-amber-500/10',
    text: 'text-amber-400',
    label: 'Roads & Pavement',
  },
  potholes: {
    hex: '#ef4444',
    bg: 'bg-rose-500/10',
    text: 'text-rose-400',
    label: 'Potholes & Cavities',
  },
  streetlights: {
    hex: '#eab308',
    bg: 'bg-yellow-500/10',
    text: 'text-yellow-400',
    label: 'Streetlights & Luminaires',
  },
  water_supply: {
    hex: '#06b6d4',
    bg: 'bg-cyan-500/10',
    text: 'text-cyan-400',
    label: 'Water Supply & Mains',
  },
  drainage: {
    hex: '#3b82f6',
    bg: 'bg-blue-500/10',
    text: 'text-blue-400',
    label: 'Drainage & Stormwater',
  },
  garbage_collection: {
    hex: '#10b981',
    bg: 'bg-emerald-500/10',
    text: 'text-emerald-400',
    label: 'Garbage Collection',
  },
  sanitation: {
    hex: '#14b8a6',
    bg: 'bg-teal-500/10',
    text: 'text-teal-400',
    label: 'Public Sanitation',
  },
  traffic_safety: {
    hex: '#ec4899',
    bg: 'bg-pink-500/10',
    text: 'text-pink-400',
    label: 'Traffic & Pedestrian Safety',
  },
  public_infrastructure: {
    hex: '#8b5cf6',
    bg: 'bg-purple-500/10',
    text: 'text-purple-400',
    label: 'Public Infrastructure',
  },
};

export const PRIORITY_STYLES: Record<IssuePriority, { text: string; label: string }> = {
  low: { text: 'text-slate-400', label: 'Low' },
  medium: { text: 'text-blue-400', label: 'Medium' },
  high: { text: 'text-amber-400', label: 'High' },
  critical: { text: 'text-rose-400', label: 'Critical' },
};

export const STATUS_STYLES: Record<IssueStatus, { text: string; label: string }> = {
  reported: { text: 'text-slate-300', label: 'Reported' },
  in_progress: { text: 'text-cyan-400', label: 'In Progress' },
  under_review: { text: 'text-indigo-400', label: 'Under Review' },
  resolved: { text: 'text-emerald-400', label: 'Resolved' },
  closed: { text: 'text-slate-500', label: 'Closed' },
};

export const RELATIONSHIP_LABELS: Record<
  RelationshipType,
  { label: string; description: string; color: string }
> = {
  EXPLICIT_LINK: {
    label: 'Explicit Link',
    description: 'Direct cross-reference cited in complaint tickets',
    color: '#38bdf8',
  },
  SHARED_INFRASTRUCTURE: {
    label: 'Shared Asset',
    description: 'Verified common municipal infrastructure ID',
    color: '#a855f7',
  },
  NORMALIZED_LOCATION: {
    label: 'Co-Location',
    description: 'Same normalized physical site within active window',
    color: '#22c55e',
  },
  SPATIAL_PROXIMITY: {
    label: 'Spatial Proximity',
    description: 'Distance under threshold within temporal window',
    color: '#f97316',
  },
  CORRELATED_FAILURE: {
    label: 'Cascade Failure',
    description: 'Cross-infrastructure cascade (e.g. water rupture to road pothole)',
    color: '#ef4444',
  },
};

const COMMUNITY_PALETTE = [
  '#06b6d4', // cyan
  '#a855f7', // purple
  '#f59e0b', // amber
  '#10b981', // emerald
  '#ec4899', // pink
  '#3b82f6', // blue
  '#f97316', // orange
  '#6366f1', // indigo
  '#14b8a6', // teal
  '#84cc16', // lime
];

export function getCommunityColor(communityId: number): string {
  const index = Math.abs(communityId - 1) % COMMUNITY_PALETTE.length;
  return COMMUNITY_PALETTE[index];
}

export function formatDate(isoStr: string | null): string {
  if (!isoStr) return 'N/A';
  try {
    const d = new Date(isoStr);
    if (isNaN(d.getTime())) return 'Invalid date';
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return 'Invalid date';
  }
}
