import React, { useState, useEffect, useContext } from 'react';
import axiosInstance from '../api/axiosInstance';
import { formatCurrency, formatDate } from '../utils/constants';
import { BranchContext } from '../context/BranchContext';
import {
  UserGroupIcon, ArrowLeftIcon, ChevronUpIcon,
  ChevronDownIcon, MagnifyingGlassIcon, ArrowTrendingUpIcon,
  CalendarDaysIcon, PhoneIcon, EnvelopeIcon,
} from '@heroicons/react/24/outline';
import { toast } from 'react-toastify';

// ── Period pill selector ──────────────────────────────────────────────────────
const PeriodSelector = ({ value, onChange }) => {
  const options = [
    { value: 'today', label: 'Today' },
    { value: 'week', label: 'This Week' },
    { value: 'month', label: 'Last 30 Days' },
    { value: 'all', label: 'All Time' },
  ];
  return (
    <div className="inline-flex rounded-lg border border-white/50 bg-white/60 backdrop-blur-sm shadow-sm overflow-hidden">
      {options.map(opt => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={`px-4 py-2 text-sm font-medium transition-colors ${
            value === opt.value
              ? 'bg-primary-600 text-white'
              : 'text-slate-600 hover:bg-slate-50'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
};

// ── Mini quantity badge ───────────────────────────────────────────────────────
const Qty = ({ value, zero = '—' }) => (
  <span className={`font-semibold tabular-nums ${value > 0 ? 'text-slate-900' : 'text-slate-300'}`}>
    {value > 0 ? value.toLocaleString() : zero}
  </span>
);

// ── Progress bar ──────────────────────────────────────────────────────────────
const Bar = ({ value, max, color = 'bg-primary-500' }) => (
  <div className="w-full bg-slate-100 rounded-full h-2 mt-1">
    <div
      className={`${color} h-2 rounded-full transition-all duration-500`}
      style={{ width: `${Math.min(100, max > 0 ? Math.round((value / max) * 100) : 0)}%` }}
    />
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
const ContractorAnalytics = () => {
  const [summary, setSummary] = useState([]);
  const [detail, setDetail] = useState(null);
  const [selectedContractor, setSelectedContractor] = useState(null);
  const [period, setPeriod] = useState('all');
  const [search, setSearch] = useState('');
  const [sortCol, setSortCol] = useState('totalValue');
  const [sortDir, setSortDir] = useState('desc');
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const { activeBranchId } = useContext(BranchContext);

  // ── Fetch summary ──────────────────────────────────────────────────────────
  useEffect(() => {
    fetchSummary();
  }, [period, activeBranchId]);

  const fetchSummary = async () => {
    setLoading(true);
    setSummary([]);
    try {
      const res = await axiosInstance.get(`/analytics/contractor-supply?period=${period}`);
      console.log('[ContractorAnalytics] API response:', res.data);
      if (res.data.success) setSummary(res.data.data?.summary || []);
    } catch (err) {
      console.error('[ContractorAnalytics] Error:', err.response?.data || err.message);
      toast.error('Failed to load contractor data');
    } finally {
      setLoading(false);
    }
  };

  // ── Fetch contractor detail ────────────────────────────────────────────────
  const openContractor = async (row) => {
    setSelectedContractor(row);
    setDetailLoading(true);
    try {
      const res = await axiosInstance.get(
        `/analytics/contractor-supply?period=${period}&contractorId=${row.contractorId}`
      );
      if (res.data.success) setDetail(res.data.data.detail);
    } catch {
      toast.error('Failed to load contractor details');
    } finally {
      setDetailLoading(false);
    }
  };

  const closeDetail = () => { setSelectedContractor(null); setDetail(null); };

  // ── Sort & filter ──────────────────────────────────────────────────────────
  const handleSort = (col) => {
    if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortCol(col); setSortDir('desc'); }
  };

  const filtered = summary
    .filter(r => r.name?.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      const mul = sortDir === 'asc' ? 1 : -1;
      return mul * ((a[sortCol] ?? 0) - (b[sortCol] ?? 0));
    });

  const maxValue = Math.max(...filtered.map(r => r.totalValue), 1);

  // ── SortHeader ─────────────────────────────────────────────────────────────
  const SortTh = ({ col, label, right }) => (
    <th
      className={`px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider cursor-pointer hover:text-slate-800 select-none ${right ? 'text-right' : 'text-left'}`}
      onClick={() => handleSort(col)}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        {sortCol === col
          ? (sortDir === 'asc' ? <ChevronUpIcon className="w-3 h-3" /> : <ChevronDownIcon className="w-3 h-3" />)
          : <span className="w-3 h-3" />}
      </span>
    </th>
  );

  // ── Period qty selector ────────────────────────────────────────────────────
  const periodQty = (row) =>
    period === 'today' ? row.todayQty : period === 'week' ? row.weekQty : row.monthQty;

  // ═══════════════════════════════════════════════════════════════════════════
  // DETAIL VIEW
  // ═══════════════════════════════════════════════════════════════════════════
  if (selectedContractor) {
    return (
      <div className="space-y-6 pb-10">
        {/* Back button + header */}
        <div className="flex items-start gap-4">
          <button
            onClick={closeDetail}
            className="mt-1 p-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-500 hover:text-slate-800 transition-colors"
          >
            <ArrowLeftIcon className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{selectedContractor.name}</h1>
            <div className="flex items-center gap-4 mt-1 text-sm text-slate-500">
              {selectedContractor.email && (
                <span className="flex items-center gap-1">
                  <EnvelopeIcon className="w-4 h-4" /> {selectedContractor.email}
                </span>
              )}
              {selectedContractor.phone && (
                <span className="flex items-center gap-1">
                  <PhoneIcon className="w-4 h-4" /> {selectedContractor.phone}
                </span>
              )}
            </div>
          </div>
        </div>

        {detailLoading ? (
          <div className="flex items-center justify-center py-24">
            <div className="w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {/* Summary stat cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: 'Today', value: selectedContractor.todayQty, sub: 'units issued' },
                { label: 'This Week', value: selectedContractor.weekQty, sub: 'units issued' },
                { label: 'Last 30 Days', value: selectedContractor.monthQty, sub: 'units issued' },
                { label: 'Total Value', value: formatCurrency(selectedContractor.totalValue), sub: 'last 30 days', isVal: true },
              ].map(c => (
                <div key={c.label} className="card p-5">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider truncate">{c.label}</p>
                  <p className={`text-xl font-bold mt-1 break-words ${c.isVal ? 'text-emerald-600' : 'text-slate-900'}`}>
                    {c.isVal ? c.value : c.value?.toLocaleString() ?? 0}
                  </p>
                  <p className="text-[10px] text-slate-400 mt-0.5">{c.sub}</p>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Top materials */}
              <div className="card">
                <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
                  <ArrowTrendingUpIcon className="w-5 h-5 text-slate-400" />
                  <h2 className="font-bold text-slate-800">Top Materials (Last 30 Days)</h2>
                </div>
                <div className="divide-y divide-slate-50">
                  {detail?.topMaterials?.length > 0 ? (
                    detail.topMaterials.map((m, i) => {
                      const maxQ = detail.topMaterials[0]?.monthQty || 1;
                      const colors = ['bg-primary-500','bg-indigo-500','bg-emerald-500','bg-amber-500','bg-rose-500'];
                      return (
                        <div key={i} className="px-5 py-3">
                          <div className="flex justify-between items-center mb-1">
                            <div className="flex items-center gap-2">
                              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white ${colors[i % colors.length]}`}>
                                {i + 1}
                              </span>
                              <span className="text-sm font-semibold text-slate-800">{m.materialName}</span>
                            </div>
                            <span className="text-sm font-bold text-primary-700">
                              {m.monthQty?.toLocaleString()} <span className="text-xs font-normal text-slate-400">{m.unit}</span>
                            </span>
                          </div>
                          <Bar value={m.monthQty} max={maxQ} color={colors[i % colors.length]} />
                          <div className="flex gap-4 mt-1.5 text-[10px] text-slate-400">
                            <span>Today: {m.todayQty || 0}</span>
                            <span>Week: {m.weekQty || 0}</span>
                            {m.totalValue > 0 && <span>Value: {formatCurrency(m.totalValue)}</span>}
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="px-5 py-10 text-center text-sm text-slate-400">No materials issued in last 30 days</div>
                  )}
                </div>
              </div>

              {/* Recent requests */}
              <div className="card">
                <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
                  <CalendarDaysIcon className="w-5 h-5 text-slate-400" />
                  <h2 className="font-bold text-slate-800">Recent Issue Records</h2>
                </div>
                <div className="divide-y divide-slate-50 max-h-[460px] overflow-y-auto">
                  {detail?.recentRequests?.length > 0 ? (
                    detail.recentRequests.map(req => (
                      <div key={req._id} className="px-5 py-3.5">
                        <div className="flex justify-between items-start gap-2">
                          <div>
                            <span className="text-xs font-bold text-primary-700 font-mono">{req.requestId}</span>
                            {req.project && (
                              <span className="ml-2 text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-medium">
                                {req.project.name}
                              </span>
                            )}
                            <div className="mt-1 space-y-0.5">
                              {req.items.map((it, i) => (
                                <p key={i} className="text-xs text-slate-600">
                                  • {it.material?.name || 'Unknown material'} — {' '}
                                  <span className="font-semibold">{it.approvedQuantity} {it.unit}</span>
                                </p>
                              ))}
                            </div>
                          </div>
                          <p className="text-[10px] text-slate-400 shrink-0">{formatDate(req.createdAt)}</p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="px-5 py-10 text-center text-sm text-slate-400">No records found</div>
                  )}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SUMMARY TABLE VIEW
  // ═══════════════════════════════════════════════════════════════════════════
  return (
    <div className="space-y-6 pb-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Contractor Supply Analytics</h1>
          <p className="text-sm text-slate-400 mt-0.5">Click any contractor to view their detailed material consumption</p>
        </div>
        <PeriodSelector value={period} onChange={p => { setPeriod(p); }} />
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Active Contractors', value: summary.length },
          { label: 'Total Transactions', value: summary.reduce((s, r) => s + r.txnCount, 0).toLocaleString() },
          { label: 'Total Qty Issued', value: summary.reduce((s, r) => s + r.monthQty, 0).toLocaleString(), sub: 'last 30 days' },
          { label: 'Total Supply Value', value: formatCurrency(summary.reduce((s, r) => s + r.totalValue, 0)), isVal: true },
        ].map(c => (
          <div key={c.label} className="card p-5">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider truncate">{c.label}</p>
            <p className={`text-xl font-bold mt-1 break-words ${c.isVal ? 'text-emerald-600' : 'text-slate-900'}`}>{c.value}</p>
            {c.sub && <p className="text-[10px] text-slate-400 mt-0.5">{c.sub}</p>}
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="card">
        {/* Toolbar */}
        <div className="px-5 py-4 border-b border-slate-100 flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
          <div className="flex items-center gap-2">
            <UserGroupIcon className="w-5 h-5 text-slate-400" />
            <h2 className="font-bold text-slate-800">Contractor Supply Summary</h2>
            <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full font-medium">{filtered.length}</span>
          </div>
          <div className="relative w-full sm:w-64">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              className="input-field pl-9 text-sm py-2"
              placeholder="Search contractor…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="table-modern">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">#</th>
                <SortTh col="name" label="Contractor" />
                <SortTh col="todayQty" label="Today" right />
                <SortTh col="weekQty" label="This Week" right />
                <SortTh col="monthQty" label="30 Days" right />
                <SortTh col="txnCount" label="Transactions" right />
                <SortTh col="totalValue" label="Total Value" right />
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Share</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr>
                  <td colSpan="8" className="px-4 py-16 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
                      <span className="text-sm text-slate-400">Loading contractor data…</span>
                    </div>
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan="8" className="px-4 py-16 text-center text-sm text-slate-400">
                    {search ? 'No contractors match your search' : 'No supply data found for this period'}
                  </td>
                </tr>
              ) : (
                filtered.map((row, i) => {
                  const pct = Math.round((row.totalValue / maxValue) * 100);
                  return (
                    <tr
                      key={row.contractorId}
                      className="hover:bg-primary-50 cursor-pointer transition-colors group"
                      onClick={() => openContractor(row)}
                    >
                      <td className="px-4 py-3 text-sm text-slate-400 font-medium">{i + 1}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center font-bold text-sm shrink-0">
                            {row.name?.charAt(0) || '?'}
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-slate-900 group-hover:text-primary-700 transition-colors">{row.name}</p>
                            <p className="text-xs text-slate-400">{row.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right"><Qty value={row.todayQty} /></td>
                      <td className="px-4 py-3 text-right"><Qty value={row.weekQty} /></td>
                      <td className="px-4 py-3 text-right"><Qty value={row.monthQty} /></td>
                      <td className="px-4 py-3 text-right text-sm text-slate-500">{row.txnCount}</td>
                      <td className="px-4 py-3 text-right">
                        <span className="text-sm font-bold text-emerald-700">{formatCurrency(row.totalValue)}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2 justify-end">
                          <div className="w-20 bg-slate-100 rounded-full h-2">
                            <div className="bg-primary-500 h-2 rounded-full" style={{ width: `${pct}%` }} />
                          </div>
                          <span className="text-xs text-slate-400 w-8 text-right">{pct}%</span>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ContractorAnalytics;
