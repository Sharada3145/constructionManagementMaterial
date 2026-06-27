import React, { useState, useEffect } from 'react';
import axiosInstance from '../api/axiosInstance';
import useReportDownload from '../hooks/useReportDownload';
import {
  DocumentTextIcon,
  BuildingOffice2Icon,
  ChartBarSquareIcon,
  ShoppingBagIcon,
  CubeIcon,
  BriefcaseIcon,
  FunnelIcon,
  CalendarDaysIcon,
  XMarkIcon,
  ArrowDownTrayIcon,
} from '@heroicons/react/24/outline';

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

const ReportCard = ({ title, description, icon: Icon, iconBg, accentColor, children, onGenerate, loadingKey, isDownloading }) => {
  const isLoading = isDownloading(loadingKey);

  return (
    <div className="card overflow-hidden group hover:shadow-lg transition-all duration-300 animate-fade-in-up">
      <div className={`h-1.5 ${accentColor}`} />
      <div className="p-6">
        <div className="flex items-start gap-4 mb-5">
          <div className={`p-3 rounded-xl ${iconBg} shadow-sm shrink-0`}>
            <Icon className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-bold text-slate-800 text-lg leading-tight">{title}</h3>
            <p className="text-sm text-slate-500 mt-1">{description}</p>
          </div>
        </div>
        <div className="space-y-4 mb-6">
          {children}
        </div>
        <button
          onClick={onGenerate}
          disabled={isLoading}
          className="w-full btn-primary flex justify-center items-center gap-2 py-2.5 shadow-md shadow-primary-500/20"
        >
          {isLoading ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <DocumentTextIcon className="w-4 h-4" />
              Preview Report
            </>
          )}
        </button>
      </div>
    </div>
  );
};

const AllBranchesReports = () => {
  const [branches, setBranches] = useState([]);
  
  // States for Date Filters
  const [perfPreset, setPerfPreset] = useState('month');
  const [perfStart, setPerfStart] = useState(getDatePreset('month').startDate);
  const [perfEnd, setPerfEnd] = useState(getDatePreset('month').endDate);
  const [perfBranch, setPerfBranch] = useState('');

  const [consPreset, setConsPreset] = useState('month');
  const [consStart, setConsStart] = useState(getDatePreset('month').startDate);
  const [consEnd, setConsEnd] = useState(getDatePreset('month').endDate);
  const [consBranch, setConsBranch] = useState('');

  const [purchPreset, setPurchPreset] = useState('month');
  const [purchStart, setPurchStart] = useState(getDatePreset('month').startDate);
  const [purchEnd, setPurchEnd] = useState(getDatePreset('month').endDate);
  const [purchBranch, setPurchBranch] = useState('');

  // Preview Modal State
  const [previewPdf, setPreviewPdf] = useState(null);

  const {
    downloadCompanyBranchPerformance,
    downloadCompanyMaterialConsumption,
    downloadCompanyPurchaseOverview,
    downloadCompanyStockSummary,
    downloadCompanyExecutiveSummary,
    isDownloading,
  } = useReportDownload();

  useEffect(() => {
    const fetchBranches = async () => {
      try {
        const res = await axiosInstance.get('/branches');
        if (res.data.success) {
          setBranches(res.data.data);
        }
      } catch (error) {
        console.error('Failed to load branches:', error);
      }
    };
    fetchBranches();
  }, []);

  const handlePreset = (preset, setPreset, setStart, setEnd) => {
    setPreset(preset);
    const { startDate, endDate } = getDatePreset(preset);
    setStart(startDate);
    setEnd(endDate);
  };

  const handleGenerate = async (downloadFn, params) => {
    try {
      const res = await downloadFn(params);
      if (res && res.url) {
        setPreviewPdf(res);
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6 pb-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Company Reports Center</h1>
          <p className="text-sm text-slate-500 mt-1">Generate comprehensive company-level analytics and cross-branch comparisons</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        
        {/* 1. Branch Performance Report */}
        <ReportCard
          title="Branch Performance"
          description="Compare branch-wise purchase value, issue value, and stock value."
          icon={ChartBarSquareIcon}
          iconBg="bg-blue-100 text-blue-600"
          accentColor="bg-gradient-to-r from-blue-500 to-blue-600"
          loadingKey="company-perf"
          isDownloading={isDownloading}
          onGenerate={() => handleGenerate(downloadCompanyBranchPerformance, { startDate: perfStart, endDate: perfEnd, branchId: perfBranch })}
        >
          <DatePresets onSelect={(p) => handlePreset(p, setPerfPreset, setPerfStart, setPerfEnd)} activePreset={perfPreset} />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1"><CalendarDaysIcon className="w-3.5 h-3.5 inline mr-1" />From</label>
              <input type="date" value={perfStart} onChange={(e) => { setPerfStart(e.target.value); setPerfPreset('custom'); }} className="input-field text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1"><CalendarDaysIcon className="w-3.5 h-3.5 inline mr-1" />To</label>
              <input type="date" value={perfEnd} onChange={(e) => { setPerfEnd(e.target.value); setPerfPreset('custom'); }} className="input-field text-sm" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1"><FunnelIcon className="w-3.5 h-3.5 inline mr-1" />Compare Branches</label>
            <select value={perfBranch} onChange={(e) => setPerfBranch(e.target.value)} className="input-field text-sm">
              <option value="">All Branches</option>
              {branches.map(b => <option key={b._id} value={b._id}>{b.branchName}</option>)}
            </select>
          </div>
        </ReportCard>

        {/* 2. Material Consumption Report */}
        <ReportCard
          title="Material Consumption"
          description="Track material usage across the company and top consumed materials."
          icon={CubeIcon}
          iconBg="bg-indigo-100 text-indigo-600"
          accentColor="bg-gradient-to-r from-indigo-500 to-indigo-600"
          loadingKey="company-cons"
          isDownloading={isDownloading}
          onGenerate={() => handleGenerate(downloadCompanyMaterialConsumption, { startDate: consStart, endDate: consEnd, branchId: consBranch })}
        >
          <DatePresets onSelect={(p) => handlePreset(p, setConsPreset, setConsStart, setConsEnd)} activePreset={consPreset} />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1"><CalendarDaysIcon className="w-3.5 h-3.5 inline mr-1" />From</label>
              <input type="date" value={consStart} onChange={(e) => { setConsStart(e.target.value); setConsPreset('custom'); }} className="input-field text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1"><CalendarDaysIcon className="w-3.5 h-3.5 inline mr-1" />To</label>
              <input type="date" value={consEnd} onChange={(e) => { setConsEnd(e.target.value); setConsPreset('custom'); }} className="input-field text-sm" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1"><FunnelIcon className="w-3.5 h-3.5 inline mr-1" />Filter Branch</label>
            <select value={consBranch} onChange={(e) => setConsBranch(e.target.value)} className="input-field text-sm">
              <option value="">All Branches</option>
              {branches.map(b => <option key={b._id} value={b._id}>{b.branchName}</option>)}
            </select>
          </div>
        </ReportCard>

        {/* 3. Purchase Overview */}
        <ReportCard
          title="Purchase Overview"
          description="Total company purchases, monthly trends, and branch contributions."
          icon={ShoppingBagIcon}
          iconBg="bg-emerald-100 text-emerald-600"
          accentColor="bg-gradient-to-r from-emerald-500 to-emerald-600"
          loadingKey="company-purch"
          isDownloading={isDownloading}
          onGenerate={() => handleGenerate(downloadCompanyPurchaseOverview, { startDate: purchStart, endDate: purchEnd, branchId: purchBranch })}
        >
          <DatePresets onSelect={(p) => handlePreset(p, setPurchPreset, setPurchStart, setPurchEnd)} activePreset={purchPreset} />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1"><CalendarDaysIcon className="w-3.5 h-3.5 inline mr-1" />From</label>
              <input type="date" value={purchStart} onChange={(e) => { setPurchStart(e.target.value); setPurchPreset('custom'); }} className="input-field text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1"><CalendarDaysIcon className="w-3.5 h-3.5 inline mr-1" />To</label>
              <input type="date" value={purchEnd} onChange={(e) => { setPurchEnd(e.target.value); setPurchPreset('custom'); }} className="input-field text-sm" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1"><FunnelIcon className="w-3.5 h-3.5 inline mr-1" />Filter Branch</label>
            <select value={purchBranch} onChange={(e) => setPurchBranch(e.target.value)} className="input-field text-sm">
              <option value="">All Branches</option>
              {branches.map(b => <option key={b._id} value={b._id}>{b.branchName}</option>)}
            </select>
          </div>
        </ReportCard>

        {/* 4. Stock Overview */}
        <ReportCard
          title="Stock Overview"
          description="Current stock value, material spread across branches, and low stock branches."
          icon={BuildingOffice2Icon}
          iconBg="bg-orange-100 text-orange-600"
          accentColor="bg-gradient-to-r from-orange-500 to-orange-600"
          loadingKey="company-stock"
          isDownloading={isDownloading}
          onGenerate={() => handleGenerate(downloadCompanyStockSummary)}
        >
          <div className="bg-slate-50 p-4 rounded-lg text-sm text-slate-600 border border-slate-100">
            Generates a real-time snapshot of the current stock status across all branches in the company. No date filtering is required for this report.
          </div>
        </ReportCard>

        {/* 5. Executive Summary */}
        <ReportCard
          title="Executive Summary"
          description="High-level company metrics, total branches, and business movement."
          icon={BriefcaseIcon}
          iconBg="bg-purple-100 text-purple-600"
          accentColor="bg-gradient-to-r from-purple-500 to-purple-600"
          loadingKey="company-exec"
          isDownloading={isDownloading}
          onGenerate={() => handleGenerate(downloadCompanyExecutiveSummary)}
        >
          <div className="bg-slate-50 p-4 rounded-lg text-sm text-slate-600 border border-slate-100">
            A comprehensive overview of the entire system's performance, suitable for upper management. Generates real-time aggregated metrics.
          </div>
        </ReportCard>

      </div>

      {/* PDF Preview Modal */}
      {previewPdf && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/50 w-full max-w-5xl h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-900">Preview Report</h3>
              <div className="flex items-center gap-3">
                <a
                  href={previewPdf.url}
                  download={previewPdf.filename}
                  className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-semibold hover:bg-primary-700 transition-colors shadow-sm"
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

export default AllBranchesReports;
