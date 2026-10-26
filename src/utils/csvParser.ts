import {
  CivicIssue,
  CivicCategory,
  IssuePriority,
  IssueStatus,
} from '../types/civic';

export interface ColumnMapping {
  externalComplaintId: string;
  title: string;
  description: string;
  category: string;
  subcategory: string;
  locationName: string;
  latitude: string;
  longitude: string;
  priority: string;
  status: string;
  createdDate: string;
  closedDate: string;
  responsibleAgency: string;
  infrastructureId: string;
}

export interface CsvValidationResult {
  headers: string[];
  rawRows: Record<string, string>[];
  acceptedIssues: CivicIssue[];
  rejectedRows: {
    rowIndex: number;
    raw: Record<string, string>;
    reasons: string[];
  }[];
  duplicateCount: number;
  missingCoordinateCount: number;
  invalidDateCount: number;
}

/**
 * Parses raw CSV text into an array of records safely handling quoted multiline strings and commas.
 */
export function parseCsvText(csvText: string): { headers: string[]; rows: Record<string, string>[] } {
  const lines: string[] = [];
  let currentLine = '';
  let insideQuotes = false;

  for (let i = 0; i < csvText.length; i++) {
    const char = csvText[i];
    const nextChar = csvText[i + 1];

    if (char === '"') {
      if (insideQuotes && nextChar === '"') {
        currentLine += '"';
        i++; // skip escaped quote
      } else {
        insideQuotes = !insideQuotes;
      }
    } else if ((char === '\r' || char === '\n') && !insideQuotes) {
      if (char === '\r' && nextChar === '\n') {
        i++;
      }
      if (currentLine.trim().length > 0) {
        lines.push(currentLine);
      }
      currentLine = '';
    } else {
      currentLine += char;
    }
  }

  if (currentLine.trim().length > 0) {
    lines.push(currentLine);
  }

  if (lines.length === 0) {
    return { headers: [], rows: [] };
  }

  const parseLine = (line: string): string[] => {
    const values: string[] = [];
    let cur = '';
    let inQ = false;
    for (let j = 0; j < line.length; j++) {
      const c = line[j];
      const nc = line[j + 1];
      if (c === '"') {
        if (inQ && nc === '"') {
          cur += '"';
          j++;
        } else {
          inQ = !inQ;
        }
      } else if (c === ',' && !inQ) {
        values.push(cur.trim());
        cur = '';
      } else {
        cur += c;
      }
    }
    values.push(cur.trim());
    return values;
  };

  const headers = parseLine(lines[0]).map((h) => h.replace(/^["']|["']$/g, '').trim());
  const rows: Record<string, string>[] = [];

  for (let k = 1; k < lines.length; k++) {
    const values = parseLine(lines[k]);
    if (values.length === 0 || (values.length === 1 && values[0] === '')) continue;
    const rowObj: Record<string, string> = {};
    headers.forEach((h, idx) => {
      rowObj[h] = values[idx] !== undefined ? values[idx].replace(/^["']|["']$/g, '') : '';
    });
    rows.push(rowObj);
  }

  return { headers, rows };
}

/**
 * Normalizes user input category to strict CivicCategory enum.
 */
export function normalizeCategory(catStr: string): CivicCategory {
  const s = (catStr || '').toLowerCase().trim();
  if (s.includes('pothole') || s.includes('sinkhole') || s.includes('crater')) return 'potholes';
  if (s.includes('street light') || s.includes('streetlight') || s.includes('lamp') || s.includes('lighting')) return 'streetlights';
  if (s.includes('water') || s.includes('leak') || s.includes('pipeline') || s.includes('pipe')) return 'water_supply';
  if (s.includes('drain') || s.includes('sewer') || s.includes('flood') || s.includes('culvert')) return 'drainage';
  if (s.includes('garbage') || s.includes('trash') || s.includes('waste') || s.includes('dump')) return 'garbage_collection';
  if (s.includes('sanitation') || s.includes('clean') || s.includes('hygiene') || s.includes('litter')) return 'sanitation';
  if (s.includes('traffic') || s.includes('signal') || s.includes('speed') || s.includes('crosswalk') || s.includes('sign')) return 'traffic_safety';
  if (s.includes('road') || s.includes('pavement') || s.includes('asphalt') || s.includes('sidewalk')) return 'roads';
  return 'public_infrastructure';
}

/**
 * Normalizes priority string.
 */
export function normalizePriority(pStr: string): IssuePriority {
  const s = (pStr || '').toLowerCase().trim();
  if (s.includes('crit') || s.includes('urgent') || s.includes('severe') || s === 'p1') return 'critical';
  if (s.includes('high') || s.includes('elevated') || s === 'p2') return 'high';
  if (s.includes('low') || s.includes('minor') || s === 'p4') return 'low';
  return 'medium';
}

/**
 * Normalizes status string.
 */
export function normalizeStatus(sStr: string): IssueStatus {
  const s = (sStr || '').toLowerCase().trim();
  if (s.includes('close') || s.includes('completed')) return 'closed';
  if (s.includes('resolve') || s.includes('fixed') || s.includes('done')) return 'resolved';
  if (s.includes('progress') || s.includes('assign') || s.includes('working') || s.includes('active')) return 'in_progress';
  if (s.includes('review') || s.includes('inspect') || s.includes('evaluat')) return 'under_review';
  return 'reported';
}

/**
 * Guesses default column mappings based on CSV header names.
 */
export function autoDetectColumnMapping(headers: string[]): ColumnMapping {
  const findMatch = (candidates: string[]): string => {
    for (const h of headers) {
      const lower = h.toLowerCase().replace(/[^a-z0-9]/g, '');
      for (const cand of candidates) {
        if (lower.includes(cand.replace(/[^a-z0-9]/g, ''))) return h;
      }
    }
    return '';
  };

  return {
    externalComplaintId: findMatch(['complaintid', 'ticketid', 'casenumber', 'id', 'ticket', 'externalid']),
    title: findMatch(['title', 'subject', 'summary', 'headline', 'issue']),
    description: findMatch(['description', 'desc', 'details', 'notes', 'remarks']),
    category: findMatch(['category', 'type', 'issuetype', 'department', 'service']),
    subcategory: findMatch(['subcategory', 'subtype', 'detailtype']),
    locationName: findMatch(['location', 'address', 'street', 'site', 'placename']),
    latitude: findMatch(['latitude', 'lat', 'y']),
    longitude: findMatch(['longitude', 'lng', 'lon', 'x']),
    priority: findMatch(['priority', 'severity', 'urgency', 'level']),
    status: findMatch(['status', 'state', 'resolution']),
    createdDate: findMatch(['createddate', 'createdat', 'reporteddate', 'date', 'timestamp', 'openeddate']),
    closedDate: findMatch(['closeddate', 'closedat', 'resolveddate']),
    responsibleAgency: findMatch(['agency', 'department', 'assignedto', 'division', 'authority']),
    infrastructureId: findMatch(['infrastructureid', 'assetid', 'facilityid', 'poleid', 'substation', 'pipeid']),
  };
}

/**
 * Validates and converts mapped CSV records into standard CivicIssue array.
 */
export function validateAndConvertCsv(
  rawRows: Record<string, string>[],
  mapping: ColumnMapping,
  datasetLabel: string = 'User CSV Import'
): CsvValidationResult {
  const acceptedIssues: CivicIssue[] = [];
  const rejectedRows: CsvValidationResult['rejectedRows'] = [];
  const seenComplaintIds = new Set<string>();

  let duplicateCount = 0;
  let missingCoordCount = 0;
  let invalidDateCount = 0;

  rawRows.forEach((row, idx) => {
    const reasons: string[] = [];

    // Title / Subject is required
    const title = mapping.title ? row[mapping.title]?.trim() : '';
    if (!title) {
      reasons.push('Missing required Title or Issue Summary');
    }

    // External ID
    let externalId = mapping.externalComplaintId ? row[mapping.externalComplaintId]?.trim() : '';
    if (!externalId) {
      externalId = `IMP-${Date.now().toString().slice(-4)}-${idx + 1}`;
    }

    if (seenComplaintIds.has(externalId)) {
      duplicateCount++;
      reasons.push(`Duplicate complaint ID: "${externalId}" already present in dataset`);
    } else {
      seenComplaintIds.add(externalId);
    }

    // Location
    const locationName = mapping.locationName ? row[mapping.locationName]?.trim() : '';
    if (!locationName) {
      reasons.push('Missing required Location Name or Address');
    }

    // Latitude & Longitude
    let lat: number | null = null;
    let lng: number | null = null;
    const rawLat = mapping.latitude ? row[mapping.latitude]?.trim() : '';
    const rawLng = mapping.longitude ? row[mapping.longitude]?.trim() : '';

    if (rawLat && rawLng) {
      const parsedLat = parseFloat(rawLat);
      const parsedLng = parseFloat(rawLng);
      if (!isNaN(parsedLat) && !isNaN(parsedLng) && parsedLat >= -90 && parsedLat <= 90 && parsedLng >= -180 && parsedLng <= 180) {
        lat = parsedLat;
        lng = parsedLng;
      } else {
        missingCoordCount++;
        reasons.push(`Invalid geographic coordinates: (${rawLat}, ${rawLng})`);
      }
    } else {
      missingCoordCount++;
    }

    // Dates
    let createdIso = new Date().toISOString();
    const rawCreated = mapping.createdDate ? row[mapping.createdDate]?.trim() : '';
    if (rawCreated) {
      const parsedTime = new Date(rawCreated).getTime();
      if (!isNaN(parsedTime)) {
        createdIso = new Date(rawCreated).toISOString();
      } else {
        invalidDateCount++;
        reasons.push(`Unrecognized Date format: "${rawCreated}"`);
      }
    }

    let closedIso: string | null = null;
    const rawClosed = mapping.closedDate ? row[mapping.closedDate]?.trim() : '';
    if (rawClosed) {
      const parsedClosed = new Date(rawClosed).getTime();
      if (!isNaN(parsedClosed)) {
        closedIso = new Date(rawClosed).toISOString();
      }
    }

    if (reasons.length > 0) {
      rejectedRows.push({
        rowIndex: idx + 1,
        raw: row,
        reasons,
      });
      return;
    }

    // Build accepted issue
    const issue: CivicIssue = {
      id: `issue-imp-${idx + 1}-${Date.now().toString().slice(-4)}`,
      externalComplaintId: externalId,
      title,
      description: mapping.description && row[mapping.description] ? row[mapping.description].trim() : title,
      category: normalizeCategory(mapping.category ? row[mapping.category] : 'public_infrastructure'),
      subcategory: mapping.subcategory && row[mapping.subcategory] ? row[mapping.subcategory].trim() : 'General',
      locationName: locationName || 'Metropolitan Area',
      latitude: lat,
      longitude: lng,
      priority: normalizePriority(mapping.priority ? row[mapping.priority] : 'medium'),
      status: normalizeStatus(mapping.status ? row[mapping.status] : 'reported'),
      createdDate: createdIso,
      updatedDate: new Date().toISOString(),
      closedDate: closedIso,
      responsibleAgency: mapping.responsibleAgency && row[mapping.responsibleAgency] ? row[mapping.responsibleAgency].trim() : 'Public Works Department',
      sourceDataset: datasetLabel,
      infrastructureId: mapping.infrastructureId && row[mapping.infrastructureId] ? row[mapping.infrastructureId].trim() : null,
    };

    acceptedIssues.push(issue);
  });

  return {
    headers: Object.keys(rawRows[0] || {}),
    rawRows,
    acceptedIssues,
    rejectedRows,
    duplicateCount,
    missingCoordinateCount: missingCoordCount,
    invalidDateCount,
  };
}

/**
 * Generates sample CSV content for download and testing.
 */
export function generateSampleCsvContent(): string {
  const headers = [
    'External_Complaint_ID',
    'Title',
    'Description',
    'Category',
    'Subcategory',
    'Location_Name',
    'Latitude',
    'Longitude',
    'Priority',
    'Status',
    'Created_Date',
    'Closed_Date',
    'Responsible_Agency',
    'Infrastructure_ID'
  ];

  const sampleRows = [
    [
      'CMP-2026-901',
      'Water Main Leak Flooding 5th Ave',
      'High pressure water pipe leaking heavily under asphalt, causing water pooling and pavement weakening near Substation East.',
      'water_supply',
      'Main Pipeline Rupture',
      '5th Ave & Pine St Junction',
      '37.7749',
      '-122.4194',
      'critical',
      'in_progress',
      '2026-10-08T09:30:00Z',
      '',
      'Water & Sanitation Authority',
      'WATER-MAIN-EAST-12'
    ],
    [
      'CMP-2026-902',
      'Deep Pothole at 5th & Pine Intersection',
      'Road surface collapsed following water main leakage. Significant hazard for buses and cyclists.',
      'potholes',
      'Asphalt Subsidence',
      '5th Ave & Pine St Junction',
      '37.7752',
      '-122.4191',
      'high',
      'reported',
      '2026-10-09T14:15:00Z',
      '',
      'Dept of Transportation',
      'WATER-MAIN-EAST-12'
    ],
    [
      'CMP-2026-903',
      'Stormwater Drain Clogged with Debris',
      'Stormwater inlet blocked by silt and gravel from recent road surface erosion.',
      'drainage',
      'Storm Drain Blockage',
      '5th Ave & Pine St Junction',
      '37.7755',
      '-122.4196',
      'high',
      'in_progress',
      '2026-10-10T11:00:00Z',
      '',
      'Public Works Department',
      'WATER-MAIN-EAST-12'
    ],
    [
      'CMP-2026-904',
      'Flickering Streetlight Mast 4',
      'Streetlight mast 4 on Market St corridor intermittent cycling off and on at night.',
      'streetlights',
      'Luminaire Failure',
      'Market St Corridor West',
      '37.7812',
      '-122.4110',
      'medium',
      'reported',
      '2026-10-07T20:10:00Z',
      '',
      'Municipal Energy Bureau',
      'LIGHT-GRID-M4'
    ],
    [
      'CMP-2026-905',
      'Dark Crosswalk Safety Hazard Market St',
      'Pedestrian crosswalk visibility severely impaired due to adjacent streetlight failure.',
      'traffic_safety',
      'Pedestrian Crossing Hazard',
      'Market St Corridor West',
      '37.7816',
      '-122.4114',
      'high',
      'reported',
      '2026-10-08T22:45:00Z',
      '',
      'Traffic Safety Administration',
      'LIGHT-GRID-M4'
    ],
    [
      'CMP-2026-906',
      'Illegal Waste Dumping in Alleyway',
      'Bulk construction waste blocking commercial alley behind Harbor Blvd.',
      'garbage_collection',
      'Commercial Dumping',
      'Harbor Blvd Pier 14 Alley',
      '37.7901',
      '-122.3980',
      'medium',
      'under_review',
      '2026-10-05T08:00:00Z',
      '',
      'Sanitation Services',
      'DOCK-ZONE-B'
    ],
    [
      'CMP-2026-907',
      'Overflowing Public Waste Bins Pier 14',
      'Tourist area garbage compactors full and overflowing onto pedestrian sidewalk.',
      'sanitation',
      'Compactor Overflow',
      'Harbor Blvd Pier 14 Alley',
      '37.7905',
      '-122.3984',
      'medium',
      'resolved',
      '2026-10-04T12:00:00Z',
      '2026-10-06T15:30:00Z',
      'Sanitation Services',
      'DOCK-ZONE-B'
    ]
  ];

  const escapeCell = (val: string) => `"${val.replace(/"/g, '""')}"`;
  const rows = [headers.map(escapeCell).join(',')];
  sampleRows.forEach((r) => rows.push(r.map(escapeCell).join(',')));
  return rows.join('\n');
}

/**
 * Converts issues into exportable CSV string.
 */
export function exportIssuesToCsv(issues: CivicIssue[]): string {
  const headers = [
    'id',
    'externalComplaintId',
    'title',
    'description',
    'category',
    'subcategory',
    'locationName',
    'latitude',
    'longitude',
    'priority',
    'status',
    'createdDate',
    'closedDate',
    'responsibleAgency',
    'sourceDataset',
    'infrastructureId',
  ];

  const escapeCell = (val: any) => {
    if (val === null || val === undefined) return '""';
    return `"${String(val).replace(/"/g, '""')}"`;
  };

  const rows = [headers.map(escapeCell).join(',')];
  issues.forEach((item) => {
    rows.push(
      [
        item.id,
        item.externalComplaintId,
        item.title,
        item.description,
        item.category,
        item.subcategory,
        item.locationName,
        item.latitude ?? '',
        item.longitude ?? '',
        item.priority,
        item.status,
        item.createdDate,
        item.closedDate ?? '',
        item.responsibleAgency,
        item.sourceDataset,
        item.infrastructureId ?? '',
      ]
        .map(escapeCell)
        .join(',')
    );
  });

  return rows.join('\n');
}
