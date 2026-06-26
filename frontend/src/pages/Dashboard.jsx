import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, BarElement, ArcElement,
  Title, Tooltip, Legend, PointElement, LineElement,
} from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';
import axiosInstance from '../api/axiosInstance';
import { formatCurrency, formatDate, getStatusColor } from '../utils/constants';
import {
  CubeIcon, BanknotesIcon, ArrowTrendingUpIcon,
  ExclamationTriangleIcon, DocumentTextIcon, ArrowRightIcon,
  FireIcon, ClipboardDocumentListIcon,
} from '@heroicons/react/24/outline';

ChartJS.register(
  CategoryScale, LinearScale, BarElement, ArcElement,
  Title, Tooltip, Legend, PointElement, LineElement
);

// ─── Stat Card ────────────────────────────────────────────────────────────────
const StatCard = ({ name, value, icon: Icon, color, bg, sub }) => (
  <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5 flex items-center gap-4 hover:shadow-md transition-shadow">
    <div className={`p-3 rounded-xl ${bg}`}>
      <Icon className={`w-6 h-6 ${color}`} />
    </div>
    <div>
      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{name}</p>
      <p className="text-2xl font-bold text-slate-900 leading-tight">{value}</p>
      {sub && <p className="text-[10px] text-slate-400 mt-0.5">{sub}</p>}
    </div>
  </div>
);

// ─── Section Header ───────────────────────────────────────────────────────────
const SectionHeader = ({ title, linkTo, linkLabel, icon: Icon }) => (
  <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
    <div className="flex items-center gap-2">
      {Icon && <Icon className="w-5 h-5 text-slate-400" />}
      <h2 className="text-base font-bold text-slate-800">{title}</h2>
    </div>
    {linkTo && (
      <Link
        to={linkTo}
        className="flex items-center gap-1 text-xs font-semibold text-primary-600 hover:text-primary-800 transition-colors"
      >
        {linkLabel || 'View all'}
        <ArrowRightIcon className="w-3 h-3" />
      </Link>
    )}
  </div>
);

// ─── Status Badge ─────────────────────────────────────────────────────────────
const StatusBadge = ({ status }) => (
  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide ${getStatusColor(status)}`}>
    {status?.replace('_', ' ')}
  </span>
);

// ─── Stock Gauge Bar ──────────────────────────────────────────────────────────
const StockBar = ({ quantity, minStockLevel }) => {
  const pct = Math.min(100, Math.round((quantity / (minStockLevel * 2)) * 100));
  const color = pct <= 50 ? 'bg-red-500' : pct <= 75 ? 'bg-amber-400' : 'bg-emerald-500';
  return (
    <div className="w-full bg-slate-100 rounded-full h-1.5 mt-1">
      <div className={`${color} h-1.5 rounded-full transition-all`} style={{ width: `${pct}%` }} />
    </div>
  );
};

// ─── Dashboard ────────────────────────────────────────────────────────────────
const Dashboard = () => {
  const [data, setData] = useState(null);
  const [monthlyData, setMonthlyData] = useState([]);
  const [categoryData, setCategoryData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [dashRes, consumptionRes, catRes] = await Promise.all([
          axiosInstance.get('/analytics/dashboard'),
          axiosInstance.get('/analytics/consumption?period=monthly'),
          axiosInstance.get('/analytics/category-distribution'),
        ]);
        if (dashRes.data.success) setData(dashRes.data.data);
        if (consumptionRes.data.success) setMonthlyData(consumptionRes.data.data);
        if (catRes.data.success) setCategoryData(catRes.data.data);
      } catch (err) {
        console.error('Dashboard fetch error:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, []);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
          <p className="text-sm text-slate-500 font-medium">Loading dashboard…</p>
        </div>
      </div>
    );
  }

  // ── Stat Cards ──────────────────────────────────────────────────────────────
  const stats = [
    {
      name: 'Total Materials', value: data?.totalMaterials ?? 0,
      icon: CubeIcon, color: 'text-blue-600', bg: 'bg-blue-50',
    },
    {
      name: 'Stock Value', value: formatCurrency(data?.totalStockValue),
      icon: BanknotesIcon, color: 'text-emerald-600', bg: 'bg-emerald-50',
    },
    {
      name: 'Issued Today', value: data?.issuedToday ?? 0,
      icon: ArrowTrendingUpIcon, color: 'text-indigo-600', bg: 'bg-indigo-50',
      sub: 'individual issue transactions',
    },
    {
      name: 'Pending Requests', value: data?.pendingRequests ?? 0,
      icon: DocumentTextIcon, color: 'text-orange-600', bg: 'bg-orange-50',
    },
    {
      name: 'Low Stock Alerts', value: data?.lowStockItems ?? 0,
      icon: ExclamationTriangleIcon, color: 'text-red-600', bg: 'bg-red-50',
      sub: data?.lowStockItems > 0 ? 'Restock needed' : 'All stocks healthy',
    },
  ];

  // ── Monthly Trend Chart ─────────────────────────────────────────────────────
  const trendLabels = monthlyData.map(d => {
    const [y, m] = d._id.split('-');
    return new Date(y, parseInt(m) - 1).toLocaleString('default', { month: 'short', year: '2-digit' });
  });
  const trendChart = {
    labels: trendLabels.length ? trendLabels : ['No data'],
    datasets: [{
      label: 'Materials Issued',
      data: monthlyData.map(d => d.totalQuantity),
      backgroundColor: 'rgba(79,70,229,0.75)',
      borderColor: 'rgba(79,70,229,1)',
      borderWidth: 1,
      borderRadius: 6,
    }],
  };
  const trendOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false }, tooltip: { mode: 'index' } },
    scales: {
      x: { grid: { display: false }, ticks: { font: { size: 11 } } },
      y: { grid: { color: '#f1f5f9' }, ticks: { font: { size: 11 } } },
    },
  };

  // ── Category Donut Chart ────────────────────────────────────────────────────
  const PALETTE = [
    '#6366f1','#0ea5e9','#10b981','#f59e0b','#ef4444',
    '#8b5cf6','#ec4899','#14b8a6','#f97316','#64748b',
  ];
  const topCategories = [...categoryData].sort((a, b) => b.totalValue - a.totalValue).slice(0, 8);
  const donutChart = {
    labels: topCategories.map(c => c._id),
    datasets: [{
      data: topCategories.map(c => c.totalValue),
      backgroundColor: PALETTE.slice(0, topCategories.length),
      borderWidth: 2,
      borderColor: '#fff',
    }],
  };
  const donutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '65%',
    plugins: {
      legend: { position: 'right', labels: { font: { size: 11 }, boxWidth: 12, padding: 10 } },
      tooltip: {
        callbacks: {
          label: (ctx) => ` ${ctx.label}: ${formatCurrency(ctx.parsed)}`,
        },
      },
    },
  };

  return (
    <div className="space-y-6 pb-10">

      {/* ── Header ───────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
          <p className="text-sm text-slate-400 mt-0.5">
            {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>
        <span className="text-xs text-slate-400">Last updated: {new Date().toLocaleTimeString()}</span>
      </div>

      {/* ── Stat Cards ───────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {stats.map(s => <StatCard key={s.name} {...s} />)}
      </div>

      {/* ── Charts Row ───────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Monthly Issue Trend */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-100 shadow-sm">
          <SectionHeader title="Monthly Issue Trend" icon={ArrowTrendingUpIcon} />
          <div className="p-5" style={{ height: 240 }}>
            {monthlyData.length > 0
              ? <Bar data={trendChart} options={trendOptions} />
              : <div className="flex h-full items-center justify-center text-sm text-slate-400">No issue data yet</div>
            }
          </div>
        </div>

        {/* Stock Distribution */}
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm">
          <SectionHeader title="Stock Distribution" icon={CubeIcon} />
          <div className="p-5" style={{ height: 240 }}>
            {topCategories.length > 0
              ? <Doughnut data={donutChart} options={donutOptions} />
              : <div className="flex h-full items-center justify-center text-sm text-slate-400">No stock data</div>
            }
          </div>
        </div>
      </div>

      {/* ── Middle Row ───────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Recent Requests */}
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm flex flex-col">
          <SectionHeader
            title="Recent Requests"
            icon={ClipboardDocumentListIcon}
            linkTo="/approvals"
            linkLabel="View all requests"
          />
          <div className="divide-y divide-slate-50">
            {data?.recentRequests?.length > 0 ? (
              data.recentRequests.map(req => {
                const firstItem = req.items?.[0];
                const contractorName = req.contractor?.name;
                return (
                  <div key={req._id} className="px-5 py-3.5 hover:bg-slate-50 transition-colors">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-bold text-primary-700 font-mono">{req.requestId}</span>
                          <StatusBadge status={req.status} />
                        </div>
                        <p className="text-sm font-semibold text-slate-800 mt-0.5 truncate">
                          {contractorName
                            ? contractorName
                            : <span className="text-slate-400 italic text-xs">Contractor account deleted</span>
                          }
                        </p>
                        {firstItem && (
                          <p className="text-xs text-slate-500 mt-0.5">
                            {firstItem.material?.name
                              ? firstItem.material.name
                              : <span className="text-slate-400 italic">Material removed</span>
                            }
                            {req.items.length > 1 && <span className="text-slate-400"> +{req.items.length - 1} more</span>}
                          </p>
                        )}
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-[10px] text-slate-400">{formatDate(req.createdAt)}</p>
                        <p className="text-xs font-semibold text-slate-600 mt-0.5">
                          {req.items?.length} item{req.items?.length !== 1 ? 's' : ''}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="px-5 py-10 text-center text-sm text-slate-400">No requests yet</div>
            )}
          </div>
        </div>

        {/* Today's Issues Summary */}
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm flex flex-col">
          <SectionHeader
            title="Today's Issues"
            icon={FireIcon}
            linkTo="/transactions"
            linkLabel="View issue history"
          />

          {/* Summary callout */}
          <div className="mx-5 mt-4 mb-3 bg-indigo-50 border border-indigo-100 rounded-lg px-4 py-3 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-indigo-500 uppercase tracking-wider">Total Transactions</p>
              <p className="text-2xl font-bold text-indigo-700">{data?.issuedToday ?? 0}</p>
            </div>
            <ArrowTrendingUpIcon className="w-8 h-8 text-indigo-300" />
          </div>

          {/* Top materials issued today */}
          <p className="px-5 text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">
            Top Materials Issued Today
          </p>
          <div className="flex-1 divide-y divide-slate-50">
            {data?.topIssuedToday?.length > 0 ? (
              data.topIssuedToday.map((item, i) => {
                const maxQty = data.topIssuedToday[0]?.totalQty || 1;
                const barPct = Math.round((item.totalQty / maxQty) * 100);
                return (
                  <div key={i} className="px-5 py-2.5">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-semibold text-slate-800 truncate max-w-[60%]">
                        {item.materialName}
                      </span>
                      <span className="text-sm font-bold text-indigo-700">
                        {item.totalQty} <span className="font-normal text-slate-400 text-xs">{item.unit}</span>
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-1.5">
                      <div
                        className="bg-indigo-500 h-1.5 rounded-full transition-all"
                        style={{ width: `${barPct}%` }}
                      />
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="px-5 py-8 text-center text-sm text-slate-400">No materials issued today</div>
            )}
          </div>
        </div>
      </div>

      {/* ── Low Stock Alert Panel ─────────────────────────────────────────────── */}
      {data?.lowStockMaterials?.length > 0 && (
        <div className="bg-white rounded-xl border border-red-100 shadow-sm">
          <div className="px-5 py-4 border-b border-red-100 flex items-center justify-between bg-red-50 rounded-t-xl">
            <div className="flex items-center gap-2">
              <ExclamationTriangleIcon className="w-5 h-5 text-red-500" />
              <h2 className="text-base font-bold text-red-700">
                Low Stock Alerts
                <span className="ml-2 bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                  {data.lowStockItems}
                </span>
              </h2>
            </div>
            <Link
              to="/inventory"
              className="flex items-center gap-1 text-xs font-semibold text-red-600 hover:text-red-800"
            >
              Manage Inventory <ArrowRightIcon className="w-3 h-3" />
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-0 divide-y sm:divide-y-0 sm:divide-x divide-slate-100">
            {data.lowStockMaterials.map(m => (
              <div key={m._id} className="px-5 py-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-slate-800 truncate">{m.name}</p>
                    <p className="text-[10px] text-slate-400 uppercase tracking-wide">{m.category}</p>
                  </div>
                  <span className="text-xs font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-lg border border-red-100 whitespace-nowrap">
                    {m.quantity} {m.unit}
                  </span>
                </div>
                <StockBar quantity={m.quantity} minStockLevel={m.minStockLevel} />
                <p className="text-[10px] text-slate-400 mt-1">Min threshold: {m.minStockLevel} {m.unit}</p>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
};

export default Dashboard;
