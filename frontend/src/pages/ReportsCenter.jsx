import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import axiosInstance from '../api/axiosInstance';
import useReportDownload from '../hooks/useReportDownload';
import {
  DocumentTextIcon,
  ArrowDownTrayIcon,
  ClipboardDocumentListIcon,
  CubeIcon,
  ChartBarSquareIcon,
  FunnelIcon,
  CalendarDaysIcon,
  XMarkIcon,
  EyeIcon,
} from '@heroicons/react/24/outline';

// ── Date preset helper ─────────────────────────────────────────────────────────
const getDatePreset = (preset) => {
  const today = new Date();
  const fmt = (d) => {
    const offset = d.getTimezoneOffset();
    const local = new Date(d.getTime() - (offset * 60 * 1000));
    return local.toISOString().split('T')[0];
  };

  switch (preset) {
    case 'today':
      return { startDate: fmt(today), endDate: fmt(today) };
    case 'week': {
      const start = new Date(today);
      start.setDate(today.getDate() - today.getDay());
      return { startDate: fmt(start), endDate: fmt(today) };
    }
    case 'month': {
      const start = new Date(today.getFullYear(), today.getMonth(), 1);
      return { startDate: fmt(start), endDate: fmt(today) };
    }
    case 'last-month': {
      const start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const end = new Date(today.getFullYear(), today.getMonth(), 0);
      return { startDate: fmt(start), endDate: fmt(end) };
    }
    default:
      return { startDate: '', endDate: '' };
  }
};

// ── Preset buttons component ──────────────────────────────────────────────────
const DatePresets = ({ onSelect, activePreset }) => {
  const presets = [
    { key: 'today', label: 'Today' },
    { key: 'week', label: 'This Week' },
    { key: 'month', label: 'This Month' },
    { key: 'last-month', label: 'Last Month' },
    { key: 'all', label: 'All Time' },
  ];

  return (
    <div className="flex flex-wrap gap-1.5 mb-3">
      {presets.map((p) => (
        <button
          key={p.key}
          type="button"
          onClick={() => onSelect(p.key)}
          className={`px-2.5 py-1 text-xs font-medium rounded-full transition-all duration-200 ${
            activePreset === p.key
              ? 'bg-primary-600 text-white shadow-sm'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          {p.label}
        </button>
      ))}
    </div>
  );
};

// ── Report card component ─────────────────────────────────────────────────────
const ReportCard = ({
  title,
  description,
  icon: Icon,
  iconBg,
  accentColor,
  children,
  onGenerate,
  loading,
  loadingKey,
  isDownloading,
}) => {
  const isLoading = isDownloading(loadingKey);

  return (
    <div className="card overflow-hidden group hover:shadow-lg transition-shadow duration-300">
      {/* Accent top bar */}
      <div className={`h-1.5 ${accentColor}`} />

      <div className="p-6">
        {/* Header */}
        <div className="flex items-start gap-4 mb-5">
          <div className={`p-3 rounded-xl ${iconBg} flex-shrink-0`}>
            <Icon className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900">{title}</h3>
            <p className="text-sm text-slate-500 mt-0.5">{description}</p>
          </div>
        </div>

        {/* Filter controls */}
        <div className="space-y-3 mb-5">
          {children}
        </div>

        {/* Generate button */}
        <button
          onClick={onGenerate}
          disabled={isLoading}
          className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold text-white transition-all duration-200 ${
            isLoading
              ? 'bg-slate-400 cursor-not-allowed'
              : 'bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-700 hover:to-primary-800 shadow-sm hover:shadow-md active:scale-[0.98]'
          }`}
        >
          {isLoading ? (
            <>
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Generating PDF...
            </>
          ) : (
            <>
              <EyeIcon className="w-4 h-4" />
              Preview Report
            </>
          )}
        </button>
      </div>
    </div>
  );
};

// ── Main component ────────────────────────────────────────────────────────────
const ReportsCenter = () => {
  const { user } = useContext(AuthContext);
  const {
    downloadBulkIssueReport,
    downloadBulkPurchaseReport,
    downloadStockReport,
    downloadSystemSummary,
    isDownloading,
  } = useReportDownload();

  // Dropdowns data
  const [contractors, setContractors] = useState([]);
  const [suppliers, setSuppliers] = useState([]);

  // Issue report filters
  const [issueContractor, setIssueContractor] = useState('');
  const [issueStartDate, setIssueStartDate] = useState('');
  const [issueEndDate, setIssueEndDate] = useState('');
  const [issuePreset, setIssuePreset] = useState('all');

  // Purchase report filters
  const [purchaseSupplier, setPurchaseSupplier] = useState('');
  const [purchaseStartDate, setPurchaseStartDate] = useState('');
  const [purchaseEndDate, setPurchaseEndDate] = useState('');
  const [purchasePreset, setPurchasePreset] = useState('all');

  // Stock report filters
  const [stockCategory, setStockCategory] = useState('');

  // System summary filters
  const [sysStartDate, setSysStartDate] = useState('');
  const [sysEndDate, setSysEndDate] = useState('');
  const [sysPreset, setSysPreset] = useState('all');

  // Preview Modal State
  const [previewPdf, setPreviewPdf] = useState(null);

  const isAdmin = user?.role === 'admin';
  const isContractor = user?.role === 'contractor';

  // Fetch contractors and suppliers for dropdowns
  useEffect(() => {
    if (!isContractor) {
      const fetchData = async () => {
        try {
          const [cRes, sRes] = await Promise.all([
            axiosInstance.get('/requests/users?role=contractor'),
            axiosInstance.get('/suppliers'),
          ]);
          if (cRes.data.success) setContractors(cRes.data.data);
          if (sRes.data.success) setSuppliers(sRes.data.data);
        } catch (err) {
          console.error('Failed to fetch dropdown data:', err);
        }
      };
      fetchData();
    }
  }, [isContractor]);

  // ── Preset handlers ─────────────────────────────────────────────────────────
  const handleIssuePreset = (preset) => {
    setIssuePreset(preset);
    const { startDate, endDate } = getDatePreset(preset);
    setIssueStartDate(startDate);
    setIssueEndDate(endDate);
  };

  const handlePurchasePreset = (preset) => {
    setPurchasePreset(preset);
    const { startDate, endDate } = getDatePreset(preset);
    setPurchaseStartDate(startDate);
    setPurchaseEndDate(endDate);
  };

  const handleSysPreset = (preset) => {
    setSysPreset(preset);
    const { startDate, endDate } = getDatePreset(preset);
    setSysStartDate(startDate);
    setSysEndDate(endDate);
  };

  // Category list
  const categories = [
    'Cement & Concrete', 'Sand & Aggregates', 'Bricks & Blocks', 'Steel & Iron',
    'Tiles & Flooring', 'Paint & Coatings', 'Pipes & Fittings', 'Electrical',
    'Wood & Timber', 'Plumbing', 'Hardware', 'Other',
  ];

  const handleGenerate = async (downloadFn, params) => {
    try {
      const result = await downloadFn(params);
      if (result && result.url) {
        setPreviewPdf(result);
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <DocumentTextIcon className="w-7 h-7 text-primary-600" />
            Reports Center
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            {isContractor
              ? 'Download your issued material reports'
              : 'Generate and download PDF reports for your construction operations'}
          </p>
        </div>
        <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-4 py-2 text-sm">
          <span className="text-slate-500">Role:</span>
          <span className="font-semibold text-slate-800 capitalize">{user?.role}</span>
        </div>
      </div>

      {/* Report Cards Grid */}
      <div className={`grid gap-6 ${isContractor ? 'grid-cols-1 max-w-xl' : 'grid-cols-1 md:grid-cols-2'}`}>

        {/* ── Issue Report Card ─────────────────────────────────────────────── */}
        <ReportCard
          title={isContractor ? 'My Issue Reports' : 'Issue Reports'}
          description={isContractor
            ? 'Download a summary of materials issued to you'
            : 'Generate issue reports filtered by contractor and date range'}
          icon={ClipboardDocumentListIcon}
          iconBg="bg-blue-100 text-blue-600"
          accentColor="bg-gradient-to-r from-blue-500 to-blue-600"
          onGenerate={() => handleGenerate(downloadBulkIssueReport, {
            contractorId: issueContractor || undefined,
            startDate: issueStartDate || undefined,
            endDate: issueEndDate || undefined,
          })}
          loadingKey="bulk-issue"
          isDownloading={isDownloading}
        >
          <DatePresets onSelect={handleIssuePreset} activePreset={issuePreset} />

          {!isContractor && (
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">
                <FunnelIcon className="w-3.5 h-3.5 inline mr-1" />
                Contractor
              </label>
              <select
                value={issueContractor}
                onChange={(e) => setIssueContractor(e.target.value)}
                className="input-field text-sm"
                id="issue-contractor-select"
              >
                <option value="">All Contractors</option>
                {contractors.map((c) => (
                  <option key={c._id} value={c._id}>{c.name}</option>
                ))}
              </select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">
                <CalendarDaysIcon className="w-3.5 h-3.5 inline mr-1" />
                From
              </label>
              <input
                type="date"
                value={issueStartDate}
                onChange={(e) => { setIssueStartDate(e.target.value); setIssuePreset('custom'); }}
                className="input-field text-sm"
                id="issue-start-date"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">
                <CalendarDaysIcon className="w-3.5 h-3.5 inline mr-1" />
                To
              </label>
              <input
                type="date"
                value={issueEndDate}
                onChange={(e) => { setIssueEndDate(e.target.value); setIssuePreset('custom'); }}
                className="input-field text-sm"
                id="issue-end-date"
              />
            </div>
          </div>
        </ReportCard>

        {/* ── Purchase Report Card ─────────────────────────────────────────── */}
        {!isContractor && (
          <ReportCard
            title="Purchase Reports"
            description="Generate purchase reports filtered by supplier and date range"
            icon={DocumentTextIcon}
            iconBg="bg-emerald-100 text-emerald-600"
            accentColor="bg-gradient-to-r from-emerald-500 to-emerald-600"
            onGenerate={() => handleGenerate(downloadBulkPurchaseReport, {
              supplierId: purchaseSupplier || undefined,
              startDate: purchaseStartDate || undefined,
              endDate: purchaseEndDate || undefined,
            })}
            loadingKey="bulk-purchase"
            isDownloading={isDownloading}
          >
            <DatePresets onSelect={handlePurchasePreset} activePreset={purchasePreset} />

            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">
                <FunnelIcon className="w-3.5 h-3.5 inline mr-1" />
                Supplier
              </label>
              <select
                value={purchaseSupplier}
                onChange={(e) => setPurchaseSupplier(e.target.value)}
                className="input-field text-sm"
                id="purchase-supplier-select"
              >
                <option value="">All Suppliers</option>
                {suppliers.map((s) => (
                  <option key={s._id} value={s._id}>{s.name}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">
                  <CalendarDaysIcon className="w-3.5 h-3.5 inline mr-1" />
                  From
                </label>
                <input
                  type="date"
                  value={purchaseStartDate}
                  onChange={(e) => { setPurchaseStartDate(e.target.value); setPurchasePreset('custom'); }}
                  className="input-field text-sm"
                  id="purchase-start-date"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">
                  <CalendarDaysIcon className="w-3.5 h-3.5 inline mr-1" />
                  To
                </label>
                <input
                  type="date"
                  value={purchaseEndDate}
                  onChange={(e) => { setPurchaseEndDate(e.target.value); setPurchasePreset('custom'); }}
                  className="input-field text-sm"
                  id="purchase-end-date"
                />
              </div>
            </div>
          </ReportCard>
        )}

        {/* ── Stock Summary Card ───────────────────────────────────────────── */}
        {!isContractor && (
          <ReportCard
            title="Stock Summary"
            description="Current inventory levels with low-stock alerts"
            icon={CubeIcon}
            iconBg="bg-amber-100 text-amber-600"
            accentColor="bg-gradient-to-r from-amber-500 to-amber-600"
            onGenerate={() => handleGenerate(downloadStockReport, {
              category: stockCategory || undefined,
            })}
            loadingKey="stock"
            isDownloading={isDownloading}
          >
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">
                <FunnelIcon className="w-3.5 h-3.5 inline mr-1" />
                Category
              </label>
              <select
                value={stockCategory}
                onChange={(e) => setStockCategory(e.target.value)}
                className="input-field text-sm"
                id="stock-category-select"
              >
                <option value="">All Categories</option>
                {categories.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </ReportCard>
        )}

        {/* ── System Summary Card (Admin only) ─────────────────────────────── */}
        {isAdmin && (
          <ReportCard
            title="System Summary"
            description="Executive overview — issues, purchases, stock health, active contractors"
            icon={ChartBarSquareIcon}
            iconBg="bg-purple-100 text-purple-600"
            accentColor="bg-gradient-to-r from-purple-500 to-purple-600"
            onGenerate={() => handleGenerate(downloadSystemSummary, {
              startDate: sysStartDate || undefined,
              endDate: sysEndDate || undefined,
            })}
            loadingKey="system-summary"
            isDownloading={isDownloading}
          >
            <DatePresets onSelect={handleSysPreset} activePreset={sysPreset} />

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">
                  <CalendarDaysIcon className="w-3.5 h-3.5 inline mr-1" />
                  From
                </label>
                <input
                  type="date"
                  value={sysStartDate}
                  onChange={(e) => { setSysStartDate(e.target.value); setSysPreset('custom'); }}
                  className="input-field text-sm"
                  id="sys-start-date"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">
                  <CalendarDaysIcon className="w-3.5 h-3.5 inline mr-1" />
                  To
                </label>
                <input
                  type="date"
                  value={sysEndDate}
                  onChange={(e) => { setSysEndDate(e.target.value); setSysPreset('custom'); }}
                  className="input-field text-sm"
                  id="sys-end-date"
                />
              </div>
            </div>
          </ReportCard>
        )}
      </div>

      {/* Footer info */}
      <div className="text-center text-xs text-slate-400 py-4">
        Click 'Preview Report' to view the generated PDF in your browser.
      </div>

      {/* PDF Preview Modal */}
      {previewPdf && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-900">Preview Report</h3>
              <div className="flex items-center gap-3">
                <a
                  href={previewPdf.url}
                  download={previewPdf.filename}
                  className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-semibold hover:bg-primary-700 transition-colors shadow-sm"
                  onClick={() => {
                    // Close modal after initiating download, or keep it open so they can keep reviewing? Let's keep it open.
                  }}
                >
                  <ArrowDownTrayIcon className="w-4 h-4" />
                  Download PDF
                </a>
                <button
                  onClick={() => {
                    URL.revokeObjectURL(previewPdf.url);
                    setPreviewPdf(null);
                  }}
                  className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  <XMarkIcon className="w-6 h-6" />
                </button>
              </div>
            </div>
            
            {/* PDF iframe viewer */}
            <div className="flex-1 bg-slate-100 w-full h-full relative">
              <iframe
                src={`${previewPdf.url}#view=FitH`}
                title="PDF Preview"
                className="w-full h-full absolute inset-0 border-none"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReportsCenter;
