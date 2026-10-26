import React, { useState } from 'react';
import { X, AlertCircle } from 'lucide-react';
import { useCivic } from '../../context/CivicContext';
import { CivicCategory, IssuePriority, IssueStatus } from '../../types/civic';
import { CATEGORY_COLORS } from '../../utils/styleHelpers';

interface CreateIssueModalProps {
  onClose: () => void;
}

export const CreateIssueModal: React.FC<CreateIssueModalProps> = ({ onClose }) => {
  const { addIssue, datasetName } = useCivic();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<CivicCategory>('potholes');
  const [subcategory, setSubcategory] = useState('Pavement Defect');
  const [locationName, setLocationName] = useState('');
  const [latitudeStr, setLatitudeStr] = useState('37.7749');
  const [longitudeStr, setLongitudeStr] = useState('-122.4194');
  const [priority, setPriority] = useState<IssuePriority>('medium');
  const [status, setStatus] = useState<IssueStatus>('reported');
  const [responsibleAgency, setResponsibleAgency] = useState('Dept of Transportation & Streets');
  const [infrastructureId, setInfrastructureId] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Title / Summary is required');
      return;
    }
    if (!locationName.trim()) {
      setError('Location name is required');
      return;
    }
    if (!description.trim()) {
      setError('Description is required');
      return;
    }

    let lat: number | null = null;
    let lng: number | null = null;

    if (latitudeStr.trim() || longitudeStr.trim()) {
      const pLat = parseFloat(latitudeStr);
      const pLng = parseFloat(longitudeStr);
      if (isNaN(pLat) || pLat < -90 || pLat > 90) {
        setError('Latitude must be a valid number between -90 and 90');
        return;
      }
      if (isNaN(pLng) || pLng < -180 || pLng > 180) {
        setError('Longitude must be a valid number between -180 and 180');
        return;
      }
      lat = pLat;
      lng = pLng;
    }

    const randomSuffix = Math.floor(100 + Math.random() * 900);
    const externalComplaintId = `CMP-2026-${randomSuffix}`;

    addIssue({
      externalComplaintId,
      title: title.trim(),
      description: description.trim(),
      category,
      subcategory: subcategory.trim() || 'General',
      locationName: locationName.trim(),
      latitude: lat,
      longitude: lng,
      priority,
      status,
      createdDate: new Date().toISOString(),
      updatedDate: new Date().toISOString(),
      closedDate: status === 'resolved' || status === 'closed' ? new Date().toISOString() : null,
      responsibleAgency: responsibleAgency.trim() || 'Municipal Public Works',
      sourceDataset: datasetName,
      infrastructureId: infrastructureId.trim() || null,
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-xl shadow-2xl flex flex-col overflow-hidden max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div>
            <h2 className="text-base font-semibold text-white">Record New Civic Issue</h2>
            <p className="text-xs text-slate-400">
              Submit a validated municipal complaint record into the active network dataset
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4 text-xs">
          {error && (
            <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block font-medium text-slate-300 mb-1">
              Issue Title / Headline *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Major Water Main Burst Submerging Intersection"
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-medium text-slate-300 mb-1">Category *</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as CivicCategory)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-cyan-500"
              >
                {Object.entries(CATEGORY_COLORS).map(([key, val]) => (
                  <option key={key} value={key}>
                    {val.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-medium text-slate-300 mb-1">Subcategory</label>
              <input
                type="text"
                value={subcategory}
                onChange={(e) => setSubcategory(e.target.value)}
                placeholder="e.g. Main Pipeline Rupture"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
              />
            </div>
          </div>

          <div>
            <label className="block font-medium text-slate-300 mb-1">Location Name / Address *</label>
            <input
              type="text"
              value={locationName}
              onChange={(e) => setLocationName(e.target.value)}
              placeholder="e.g. 5th Ave & Pine St Junction"
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-medium text-slate-300 mb-1">GPS Latitude (-90 to 90)</label>
              <input
                type="text"
                value={latitudeStr}
                onChange={(e) => setLatitudeStr(e.target.value)}
                placeholder="37.7749"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 font-mono placeholder-slate-500 focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div>
              <label className="block font-medium text-slate-300 mb-1">GPS Longitude (-180 to 180)</label>
              <input
                type="text"
                value={longitudeStr}
                onChange={(e) => setLongitudeStr(e.target.value)}
                placeholder="-122.4194"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 font-mono placeholder-slate-500 focus:outline-none focus:border-cyan-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block font-medium text-slate-300 mb-1">Priority</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as IssuePriority)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-cyan-500"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>

            <div>
              <label className="block font-medium text-slate-300 mb-1">Initial Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as IssueStatus)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-cyan-500"
              >
                <option value="reported">Reported</option>
                <option value="in_progress">In Progress</option>
                <option value="under_review">Under Review</option>
                <option value="resolved">Resolved</option>
              </select>
            </div>

            <div>
              <label className="block font-medium text-slate-300 mb-1">Infrastructure ID (Optional)</label>
              <input
                type="text"
                value={infrastructureId}
                onChange={(e) => setInfrastructureId(e.target.value)}
                placeholder="e.g. WATER-MAIN-EAST-12"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 font-mono placeholder-slate-500 focus:outline-none focus:border-cyan-500"
              />
            </div>
          </div>

          <div>
            <label className="block font-medium text-slate-300 mb-1">Responsible Agency</label>
            <input
              type="text"
              value={responsibleAgency}
              onChange={(e) => setResponsibleAgency(e.target.value)}
              placeholder="e.g. Dept of Transportation & Streets"
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div>
            <label className="block font-medium text-slate-300 mb-1">Description & Field Evidence *</label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe physical condition, hazard severity, or references to linked complaints..."
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
              required
            />
          </div>

          {/* Form Actions */}
          <div className="pt-4 border-t border-slate-800 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-xs font-semibold text-slate-950 bg-gradient-to-r from-cyan-400 to-cyan-300 hover:from-cyan-300 hover:to-cyan-200 rounded-lg shadow-sm shadow-cyan-500/20 transition-all cursor-pointer"
            >
              Submit Ticket Record
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
