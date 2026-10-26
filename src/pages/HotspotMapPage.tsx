import React, { useEffect, useRef, useState, useMemo } from 'react';
import L from 'leaflet';
import {
  MapPin,
  Filter,
  Layers,
  Eye,
  AlertTriangle,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Navigation,
} from 'lucide-react';
import { useCivic } from '../context/CivicContext';
import {
  CATEGORY_COLORS,
  PRIORITY_STYLES,
  STATUS_STYLES,
  formatDate,
} from '../utils/styleHelpers';
import { CivicCategory, IssuePriority, IssueStatus, CivicIssue } from '../types/civic';

interface HotspotMapPageProps {
  onOpenIssue: (id: string) => void;
}

export const HotspotMapPage: React.FC<HotspotMapPageProps> = ({ onOpenIssue }) => {
  const { issues, edges, nodeMetrics } = useCivic();

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const layerGroupRef = useRef<L.LayerGroup | null>(null);

  // Filters
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedPriority, setSelectedPriority] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [showDensityRadii, setShowDensityRadii] = useState<boolean>(true);

  // Active selected marker
  const [activeIssueId, setActiveIssueId] = useState<string | null>(null);

  // Filter issues that have valid coordinates
  const validGeoIssues = useMemo(() => {
    return issues.filter(
      (i): i is CivicIssue & { latitude: number; longitude: number } =>
        i.latitude !== null &&
        i.longitude !== null &&
        !isNaN(i.latitude) &&
        !isNaN(i.longitude)
    );
  }, [issues]);

  const filteredGeoIssues = useMemo(() => {
    return validGeoIssues.filter((issue) => {
      if (selectedCategory !== 'all' && issue.category !== selectedCategory) return false;
      if (selectedPriority !== 'all' && issue.priority !== selectedPriority) return false;
      if (selectedStatus !== 'all' && issue.status !== selectedStatus) return false;
      return true;
    });
  }, [validGeoIssues, selectedCategory, selectedPriority, selectedStatus]);

  // Map Initialization
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    // Default center from issues or fallback to (37.7749, -122.4194)
    let centerLat = 37.7749;
    let centerLng = -122.4194;

    if (validGeoIssues.length > 0) {
      const avgLat =
        validGeoIssues.reduce((acc, i) => acc + i.latitude, 0) / validGeoIssues.length;
      const avgLng =
        validGeoIssues.reduce((acc, i) => acc + i.longitude, 0) / validGeoIssues.length;
      centerLat = avgLat;
      centerLng = avgLng;
    }

    const map = L.map(mapContainerRef.current, {
      center: [centerLat, centerLng],
      zoom: 13,
      zoomControl: false,
    });

    // Dark CartoDB basemap tiles for sleek smart city aesthetic
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
      subdomains: 'abcd',
      maxZoom: 19,
    }).addTo(map);

    const layerGroup = L.layerGroup().addTo(map);
    layerGroupRef.current = layerGroup;
    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Render markers and density halos
  useEffect(() => {
    const map = mapInstanceRef.current;
    const layerGroup = layerGroupRef.current;
    if (!map || !layerGroup) return;

    layerGroup.clearLayers();

    if (filteredGeoIssues.length === 0) return;

    const bounds = L.latLngBounds([]);

    filteredGeoIssues.forEach((issue) => {
      const lat = issue.latitude;
      const lng = issue.longitude;
      bounds.extend([lat, lng]);

      const catMeta = CATEGORY_COLORS[issue.category];
      const color = catMeta?.hex || '#06b6d4';
      const metric = nodeMetrics.get(issue.id);
      const degree = metric?.degree || 0;

      // 1. Hotspot density proximity buffer halo
      if (showDensityRadii && degree >= 2) {
        L.circle([lat, lng], {
          radius: 180 + degree * 50,
          color: color,
          fillColor: color,
          fillOpacity: 0.12,
          weight: 1,
          dashArray: '4, 4',
        }).addTo(layerGroup);
      }

      // 2. High-precision Circle Marker
      const marker = L.circleMarker([lat, lng], {
        radius: Math.max(7, Math.min(16, 7 + degree * 2)),
        fillColor: color,
        color: '#ffffff',
        weight: 1.5,
        opacity: 0.9,
        fillOpacity: 0.85,
      });

      marker.on('click', () => {
        setActiveIssueId(issue.id);
      });

      // Hover Tooltip
      marker.bindTooltip(
        `<div style="font-family: 'Plus Jakarta Sans', sans-serif; font-size: 11px;">
          <strong style="color: ${color};">${issue.externalComplaintId}</strong>: ${issue.title}
          <br/><span style="color: #94a3b8;">${issue.locationName} · Degree ${degree}</span>
        </div>`,
        { direction: 'top', className: 'civic-map-tooltip' }
      );

      marker.addTo(layerGroup);
    });

    if (bounds.isValid()) {
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
    }
  }, [filteredGeoIssues, nodeMetrics, showDensityRadii]);

  const activeIssue = issues.find((i) => i.id === activeIssueId);
  const activeMetric = activeIssueId ? nodeMetrics.get(activeIssueId) : null;

  return (
    <div className="space-y-4 max-w-7xl mx-auto">
      {/* Control Strip */}
      <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">Geographic Hotspot Map</h1>
          <p className="text-xs text-slate-400">
            OpenStreetMap spatial distribution with infrastructure proximity clusters and topological links
          </p>
        </div>

        {/* Filter controls */}
        <div className="flex flex-wrap items-center gap-3 text-xs">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none"
          >
            <option value="all">All Categories</option>
            {Object.entries(CATEGORY_COLORS).map(([c, val]) => (
              <option key={c} value={c}>
                {val.label}
              </option>
            ))}
          </select>

          <select
            value={selectedPriority}
            onChange={(e) => setSelectedPriority(e.target.value)}
            className="px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none"
          >
            <option value="all">All Priorities</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>

          <label className="flex items-center gap-2 cursor-pointer bg-slate-950 px-3 py-1.5 border border-slate-800 rounded-lg text-slate-300">
            <input
              type="checkbox"
              checked={showDensityRadii}
              onChange={(e) => setShowDensityRadii(e.target.checked)}
              className="accent-cyan-400"
            />
            <span>Density Halos</span>
          </label>
        </div>
      </div>

      {/* Main Map Container */}
      <div className="relative h-[650px] rounded-2xl bg-slate-950 border border-slate-800 overflow-hidden shadow-2xl flex">
        <div ref={mapContainerRef} className="w-full h-full z-10" />

        {/* Floating Map Controls */}
        <div className="absolute top-4 right-4 z-20 flex flex-col gap-1.5">
          <button
            onClick={() => mapInstanceRef.current?.zoomIn()}
            className="p-2 rounded-lg bg-slate-900/90 backdrop-blur-md hover:bg-slate-800 text-slate-300 border border-slate-800 shadow-lg transition-colors"
            title="Zoom in"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            onClick={() => mapInstanceRef.current?.zoomOut()}
            className="p-2 rounded-lg bg-slate-900/90 backdrop-blur-md hover:bg-slate-800 text-slate-300 border border-slate-800 shadow-lg transition-colors"
            title="Zoom out"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <button
            onClick={() => {
              if (validGeoIssues.length > 0 && mapInstanceRef.current) {
                const b = L.latLngBounds(
                  validGeoIssues.map((i) => [i.latitude as number, i.longitude as number])
                );
                mapInstanceRef.current.fitBounds(b, { padding: [50, 50] });
              }
            }}
            className="p-2 rounded-lg bg-slate-900/90 backdrop-blur-md hover:bg-slate-800 text-slate-300 border border-slate-800 shadow-lg transition-colors"
            title="Fit all markers"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>

        {/* Legend Overlay */}
        <div className="absolute bottom-4 left-4 z-20 bg-slate-900/90 backdrop-blur-md border border-slate-800 rounded-xl p-3 shadow-xl max-w-xs text-xs space-y-2 hidden md:block">
          <div className="text-[11px] uppercase tracking-wider font-semibold text-slate-400">
            Spatial Markers ({filteredGeoIssues.length} of {issues.length} mapped)
          </div>
          <div className="grid grid-cols-2 gap-1.5 max-h-36 overflow-y-auto">
            {Object.entries(CATEGORY_COLORS).map(([c, val]) => (
              <div key={c} className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: val.hex }} />
                <span className="text-slate-300 text-[11px] truncate">{val.label}</span>
              </div>
            ))}
          </div>
          {issues.length > validGeoIssues.length && (
            <div className="pt-2 border-t border-slate-800 text-[10px] text-amber-400/90">
              Note: {issues.length - validGeoIssues.length} records lack valid GPS coordinates and are omitted from map.
            </div>
          )}
        </div>

        {/* Selected Marker Detail Card Drawer */}
        {activeIssue && (
          <div className="absolute top-4 left-4 z-30 w-80 bg-slate-900/95 backdrop-blur-lg border border-slate-800 rounded-xl p-4 shadow-2xl text-xs space-y-3 animate-in slide-in-from-left duration-200">
            <div className="flex items-start justify-between">
              <div>
                <span className="font-mono text-cyan-400 font-semibold">
                  {activeIssue.externalComplaintId}
                </span>
                <h3 className="font-semibold text-white text-sm mt-0.5 leading-snug">
                  {activeIssue.title}
                </h3>
              </div>
              <button
                onClick={() => setActiveIssueId(null)}
                className="text-slate-400 hover:text-white p-1"
              >
                ✕
              </button>
            </div>

            <div className="flex items-center gap-2 text-[11px]">
              <span className={CATEGORY_COLORS[activeIssue.category]?.text}>
                {CATEGORY_COLORS[activeIssue.category]?.label}
              </span>
              <span className="text-slate-600">·</span>
              <span className={PRIORITY_STYLES[activeIssue.priority]?.text}>
                {PRIORITY_STYLES[activeIssue.priority]?.label}
              </span>
            </div>

            <div className="text-slate-300 text-[11px] bg-slate-950/60 p-2.5 rounded-lg border border-slate-800">
              {activeIssue.description}
            </div>

            <div className="space-y-1 text-slate-300 text-[11px]">
              <div>
                <span className="text-slate-400">Site: </span>
                {activeIssue.locationName}
              </div>
              <div>
                <span className="text-slate-400">Coordinates: </span>
                <span className="font-mono text-slate-300">
                  {activeIssue.latitude?.toFixed(5)}, {activeIssue.longitude?.toFixed(5)}
                </span>
              </div>
              {activeIssue.infrastructureId && (
                <div>
                  <span className="text-slate-400">Infrastructure Asset: </span>
                  <span className="font-mono text-purple-300 font-semibold">
                    {activeIssue.infrastructureId}
                  </span>
                </div>
              )}
            </div>

            {activeMetric && (
              <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800/80 flex items-center justify-between text-slate-300 text-[11px]">
                <span>Topological Degree:</span>
                <span className="font-mono text-cyan-400 font-bold tabular-nums">
                  {activeMetric.degree} connections
                </span>
              </div>
            )}

            <button
              onClick={() => onOpenIssue(activeIssue.id)}
              className="w-full py-2 px-3 text-xs font-semibold text-slate-950 bg-gradient-to-r from-cyan-400 to-cyan-300 hover:from-cyan-300 hover:to-cyan-200 rounded-lg shadow-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Inspect Full Ticket & Topology</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
