import React, { useState } from 'react';
import {
  UploadCloud,
  FileSpreadsheet,
  Download,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ArrowLeft,
  RefreshCw,
  Sliders,
  Check,
  X,
  FileCheck,
} from 'lucide-react';
import { useCivic } from '../context/CivicContext';
import {
  parseCsvText,
  autoDetectColumnMapping,
  validateAndConvertCsv,
  generateSampleCsvContent,
  ColumnMapping,
  CsvValidationResult,
} from '../utils/csvParser';

interface DataImportPageProps {
  onNavigate: (page: string) => void;
}

export const DataImportPage: React.FC<DataImportPageProps> = ({ onNavigate }) => {
  const { importIssues, showToast } = useCivic();

  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [csvFileName, setCsvFileName] = useState<string>('');
  const [rawHeaders, setRawHeaders] = useState<string[]>([]);
  const [rawRows, setRawRows] = useState<Record<string, string>[]>([]);
  const [datasetTitle, setDatasetTitle] = useState<string>('Custom Municipal Inflow');
  const [columnMapping, setColumnMapping] = useState<ColumnMapping>({
    externalComplaintId: '',
    title: '',
    description: '',
    category: '',
    subcategory: '',
    locationName: '',
    latitude: '',
    longitude: '',
    priority: '',
    status: '',
    createdDate: '',
    closedDate: '',
    responsibleAgency: '',
    infrastructureId: '',
  });

  const [validationResult, setValidationResult] = useState<CsvValidationResult | null>(null);

  // File Upload handler
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setCsvFileName(file.name);
    setDatasetTitle(file.name.replace(/\.[^/.]+$/, ''));

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (text) {
        processCsvText(text);
      }
    };
    reader.readAsText(file);
  };

  // Sample CSV quick loader
  const handleLoadSample = () => {
    const sample = generateSampleCsvContent();
    setCsvFileName('metro_civic_sample_template.csv');
    setDatasetTitle('Metro Sample Municipal Dataset');
    processCsvText(sample);
  };

  const processCsvText = (csvText: string) => {
    const { headers, rows } = parseCsvText(csvText);
    if (headers.length === 0 || rows.length === 0) {
      showToast('Could not parse any records from CSV file', 'error');
      return;
    }
    setRawHeaders(headers);
    setRawRows(rows);
    const initialMapping = autoDetectColumnMapping(headers);
    setColumnMapping(initialMapping);
    setStep(2);
  };

  const handleDownloadSampleTemplate = () => {
    const sample = generateSampleCsvContent();
    const blob = new Blob([sample], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'civicgraph_sample_template.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    showToast('Downloaded sample CSV template', 'success');
  };

  // Step 2 -> Step 3: Run Validation
  const handleProceedToValidation = () => {
    if (!columnMapping.title) {
      showToast('Title / Issue Headline column is required for mapping', 'warning');
      return;
    }
    if (!columnMapping.locationName) {
      showToast('Location / Address column is required for mapping', 'warning');
      return;
    }

    const result = validateAndConvertCsv(rawRows, columnMapping, datasetTitle);
    setValidationResult(result);
    setStep(3);
  };

  // Step 3 -> Step 4: Confirm Import and Activate
  const handleConfirmImport = () => {
    if (!validationResult || validationResult.acceptedIssues.length === 0) {
      showToast('No valid records available to import', 'error');
      return;
    }

    importIssues(validationResult.acceptedIssues, datasetTitle);
    setStep(4);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Stepper Header */}
      <div className="p-5 rounded-xl bg-slate-900/80 border border-slate-800/80 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight">CSV Data Import Wizard</h1>
            <p className="text-xs text-slate-400">
              Ingest, normalize, audit duplicate records, and build topological graph structures
            </p>
          </div>
          <button
            onClick={handleDownloadSampleTemplate}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-slate-300 hover:text-white bg-slate-950 border border-slate-800 rounded-lg transition-colors shrink-0"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download Template CSV</span>
          </button>
        </div>

        {/* Stepper tracker */}
        <div className="grid grid-cols-4 gap-2 pt-2 border-t border-slate-800/60 text-xs">
          {[
            { num: 1, label: 'Upload File' },
            { num: 2, label: 'Column Mapping' },
            { num: 3, label: 'Validation Audit' },
            { num: 4, label: 'Import Summary' },
          ].map((s) => (
            <div
              key={s.num}
              className={`p-2.5 rounded-lg border flex items-center gap-2.5 ${
                step === s.num
                  ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-300 font-semibold'
                  : step > s.num
                  ? 'bg-slate-950/60 border-emerald-500/20 text-emerald-400'
                  : 'bg-slate-950/30 border-slate-800/40 text-slate-500'
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full flex items-center justify-center font-mono text-[10px] ${
                  step === s.num
                    ? 'bg-cyan-400 text-slate-950 font-bold'
                    : step > s.num
                    ? 'bg-emerald-500 text-slate-950 font-bold'
                    : 'bg-slate-800 text-slate-400'
                }`}
              >
                {step > s.num ? '✓' : s.num}
              </div>
              <span className="truncate">{s.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* STEP 1: Upload or sample */}
      {step === 1 && (
        <div className="p-8 rounded-xl bg-slate-900/80 border border-slate-800/80 space-y-6 text-center">
          <div className="max-w-md mx-auto space-y-3">
            <div className="w-16 h-16 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center mx-auto text-cyan-400 shadow-lg shadow-cyan-500/10">
              <UploadCloud className="w-8 h-8" />
            </div>
            <h2 className="text-lg font-semibold text-white">Upload Municipal CSV Dataset</h2>
            <p className="text-xs text-slate-400">
              Select any CSV containing municipal complaint records. Column names will be mapped
              and normalized in the next step.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <label className="px-5 py-2.5 bg-gradient-to-r from-cyan-400 to-cyan-300 hover:from-cyan-300 hover:to-cyan-200 text-slate-950 font-semibold text-xs rounded-lg shadow-md shadow-cyan-500/20 transition-all cursor-pointer">
              <span>Choose CSV File</span>
              <input
                type="file"
                accept=".csv,text/csv"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>

            <span className="text-xs text-slate-500">or</span>

            <button
              onClick={handleLoadSample}
              className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium text-xs rounded-lg border border-slate-700 transition-colors cursor-pointer"
            >
              Load Built-in Sample Dataset
            </button>
          </div>
        </div>
      )}

      {/* STEP 2: Column Mapping */}
      {step === 2 && (
        <div className="p-6 rounded-xl bg-slate-900/80 border border-slate-800/80 space-y-6">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div>
              <h2 className="text-base font-semibold text-white">Map CSV Columns</h2>
              <p className="text-xs text-slate-400">
                Parsed {rawRows.length} rows from <span className="text-cyan-400 font-mono">{csvFileName}</span>.
                Confirm matching fields.
              </p>
            </div>
            <div className="w-64">
              <label className="text-[11px] text-slate-400 block mb-1">Dataset Label</label>
              <input
                type="text"
                value={datasetTitle}
                onChange={(e) => setDatasetTitle(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            {[
              { key: 'title', label: 'Issue Title / Summary *', required: true },
              { key: 'locationName', label: 'Location Name / Site *', required: true },
              { key: 'externalComplaintId', label: 'Complaint Ticket ID' },
              { key: 'description', label: 'Detailed Description' },
              { key: 'category', label: 'Category' },
              { key: 'subcategory', label: 'Subcategory' },
              { key: 'latitude', label: 'GPS Latitude' },
              { key: 'longitude', label: 'GPS Longitude' },
              { key: 'priority', label: 'Priority' },
              { key: 'status', label: 'Status' },
              { key: 'createdDate', label: 'Created / Reported Date' },
              { key: 'closedDate', label: 'Closed Date' },
              { key: 'responsibleAgency', label: 'Responsible Agency' },
              { key: 'infrastructureId', label: 'Infrastructure Asset ID' },
            ].map(({ key, label, required }) => (
              <div key={key} className="p-3 rounded-lg bg-slate-950/60 border border-slate-800 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className={`font-medium ${required ? 'text-cyan-300' : 'text-slate-300'}`}>
                    {label}
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono">{key}</span>
                </div>
                <select
                  value={(columnMapping as any)[key] || ''}
                  onChange={(e) =>
                    setColumnMapping((prev) => ({ ...prev, [key]: e.target.value }))
                  }
                  className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700/80 rounded-lg text-slate-200 focus:outline-none"
                >
                  <option value="">-- Do Not Map --</option>
                  {rawHeaders.map((header) => (
                    <option key={header} value={header}>
                      {header}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>

          {/* Stepper Buttons */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-800">
            <button
              onClick={() => setStep(1)}
              className="px-4 py-2 text-xs text-slate-400 hover:text-white flex items-center gap-1.5"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Upload</span>
            </button>
            <button
              onClick={handleProceedToValidation}
              className="px-5 py-2 text-xs font-semibold text-slate-950 bg-gradient-to-r from-cyan-400 to-cyan-300 hover:from-cyan-300 hover:to-cyan-200 rounded-lg shadow-sm flex items-center gap-1.5"
            >
              <span>Validate Dataset</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: Validation Audit & Preview */}
      {step === 3 && validationResult && (
        <div className="p-6 rounded-xl bg-slate-900/80 border border-slate-800/80 space-y-6">
          <div className="border-b border-slate-800 pb-4">
            <h2 className="text-base font-semibold text-white">Validation Audit Report</h2>
            <p className="text-xs text-slate-400">
              Audited records for schema compliance, duplicate complaint keys, and coordinates.
            </p>
          </div>

          {/* Validation Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30">
              <div className="text-emerald-400 font-semibold">Accepted Records</div>
              <div className="text-xl font-bold font-mono text-emerald-300 mt-1">
                {validationResult.acceptedIssues.length}
              </div>
            </div>
            <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30">
              <div className="text-rose-400 font-semibold">Rejected Rows</div>
              <div className="text-xl font-bold font-mono text-rose-300 mt-1">
                {validationResult.rejectedRows.length}
              </div>
            </div>
            <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30">
              <div className="text-amber-400 font-semibold">Duplicate Keys</div>
              <div className="text-xl font-bold font-mono text-amber-300 mt-1">
                {validationResult.duplicateCount}
              </div>
            </div>
            <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/30">
              <div className="text-blue-400 font-semibold">Missing GPS Coords</div>
              <div className="text-xl font-bold font-mono text-blue-300 mt-1">
                {validationResult.missingCoordinateCount}
              </div>
            </div>
          </div>

          {/* Rejected Rows Table if any */}
          {validationResult.rejectedRows.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-xs uppercase font-semibold text-rose-400 tracking-wider">
                Rejected Rows ({validationResult.rejectedRows.length})
              </h4>
              <div className="max-h-40 overflow-y-auto rounded-lg border border-rose-950 bg-rose-950/20 text-xs divide-y divide-rose-900/40">
                {validationResult.rejectedRows.map((rej) => (
                  <div key={rej.rowIndex} className="p-2.5 flex items-start gap-3">
                    <span className="font-mono text-rose-400 font-bold">
                      Row #{rej.rowIndex}
                    </span>
                    <div className="text-rose-200">
                      {rej.reasons.join('; ')}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Accepted Preview Sample */}
          <div className="space-y-2">
            <h4 className="text-xs uppercase font-semibold text-slate-400 tracking-wider">
              Accepted Sample Preview (First 5 records)
            </h4>
            <div className="overflow-x-auto rounded-lg border border-slate-800">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950 text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="p-2.5">Complaint ID</th>
                    <th className="p-2.5">Title</th>
                    <th className="p-2.5">Category</th>
                    <th className="p-2.5">Location</th>
                    <th className="p-2.5">Priority</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {validationResult.acceptedIssues.slice(0, 5).map((item) => (
                    <tr key={item.id} className="text-slate-300">
                      <td className="p-2.5 font-mono text-cyan-400">{item.externalComplaintId}</td>
                      <td className="p-2.5 truncate max-w-xs">{item.title}</td>
                      <td className="p-2.5">{item.category}</td>
                      <td className="p-2.5">{item.locationName}</td>
                      <td className="p-2.5 capitalize">{item.priority}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Stepper Buttons */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-800">
            <button
              onClick={() => setStep(2)}
              className="px-4 py-2 text-xs text-slate-400 hover:text-white flex items-center gap-1.5"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Mapping</span>
            </button>
            <button
              disabled={validationResult.acceptedIssues.length === 0}
              onClick={handleConfirmImport}
              className="px-5 py-2 text-xs font-semibold text-slate-950 bg-gradient-to-r from-emerald-400 to-emerald-300 hover:from-emerald-300 rounded-lg shadow-sm flex items-center gap-1.5 disabled:opacity-40"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Confirm & Activate Dataset ({validationResult.acceptedIssues.length})</span>
            </button>
          </div>
        </div>
      )}

      {/* STEP 4: Success & Summary */}
      {step === 4 && (
        <div className="p-8 rounded-xl bg-slate-900/80 border border-slate-800/80 text-center space-y-6">
          <div className="max-w-md mx-auto space-y-3">
            <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mx-auto text-emerald-400 shadow-lg">
              <FileCheck className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-bold text-white">Dataset Activated Successfully!</h2>
            <p className="text-xs text-slate-400">
              The entire platform analytics, Cytoscape graph nodes, Louvain communities, hotspot
              markers, and alerts have now recomputed from your uploaded dataset.
            </p>
          </div>

          <div className="flex items-center justify-center gap-3 pt-2">
            <button
              onClick={() => onNavigate('dashboard')}
              className="px-5 py-2.5 bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-semibold text-xs rounded-lg shadow-md transition-colors"
            >
              Go to Dashboard
            </button>
            <button
              onClick={() => onNavigate('network')}
              className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium text-xs rounded-lg border border-slate-700 transition-colors"
            >
              Open Network Explorer
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
