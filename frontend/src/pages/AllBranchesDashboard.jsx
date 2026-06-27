import React, { useState, useEffect, useContext } from 'react';
import { Link } from 'react-router-dom';
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, BarElement, ArcElement,
  Title, Tooltip, Legend, PointElement, LineElement,
} from 'chart.js';
import { Bar, Doughnut, Line } from 'react-chartjs-2';
import axiosInstance from '../api/axiosInstance';
import { formatCurrency } from '../utils/constants';
import { AuthContext } from '../context/AuthContext';
import {
  BuildingOffice2Icon, BanknotesIcon, CubeIcon,
  ArrowTrendingUpIcon, UsersIcon, ArrowRightIcon,
} from '@heroicons/react/24/outline';

ChartJS.register(
  CategoryScale, LinearScale, BarElement, ArcElement,
  Title, Tooltip, Legend, PointElement, LineElement
);

const StatCard = ({ name, value, icon: Icon, color, bg, sub }) => (
  <div className="card group p-5 flex items-center gap-4 animate-fade-in-up">
    <div className={`p-3 rounded-xl shrink-0 ${bg}`}>
      <Icon className={`w-6 h-6 ${color}`} />
    </div>
    <div className="min-w-0 flex-1">
      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider truncate">{name}</p>
      <p className="text-xl font-bold text-slate-900 leading-tight break-words">{value}</p>
      {sub && <p className="text-[10px] text-slate-400 mt-0.5 truncate">{sub}</p>}
    </div>
  </div>
);

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

const AllBranchesDashboard = () => {
  const { user } = useContext(AuthContext);
  const [data, setData] = useState(null);
  const [monthlyData, setMonthlyData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.role !== 'admin') return;
    const fetchAll = async () => {
      setLoading(true);
      try {
        const [dashRes, consumptionRes] = await Promise.all([
          axiosInstance.get('/analytics/dashboard'), // Admin, no branchId -> gets all branches
          axiosInstance.get('/analytics/consumption?period=monthly'),
        ]);
        if (dashRes.data.success) setData(dashRes.data.data);
        if (consumptionRes.data.success) setMonthlyData(consumptionRes.data.data);
      } catch (err) {
        console.error('AllBranchesDashboard fetch error:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, [user]);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
          <p className="text-sm text-slate-500 font-medium">Loading Company Overview…</p>
        </div>
      </div>
    );
  }

  // Aggregate totals from branch comparison if needed, or use the global ones
  const branchPerf = data?.branchPerformance || [];
  const totalPurchaseValue = branchPerf.reduce((sum, b) => sum + (b.totalPurchases || b.monthlyPurchase || 0), 0);
  const totalBusinessValue = (data?.totalStockValue || 0) + totalPurchaseValue;

  const stats = [
    {
      name: 'Total Active Branches', value: data?.activeBranches ?? 0,
      icon: BuildingOffice2Icon, color: 'text-blue-600', bg: 'bg-blue-50',
      sub: `out of ${data?.totalBranches ?? 0} total branches`,
    },
    {
      name: 'Total Stock Value', value: formatCurrency(data?.totalStockValue),
      icon: BanknotesIcon, color: 'text-emerald-600', bg: 'bg-emerald-50',
    },
    {
      name: 'Total Purchases', value: formatCurrency(totalPurchaseValue),
      icon: CubeIcon, color: 'text-purple-600', bg: 'bg-purple-50',
    },
    {
      name: 'Total Contractors', value: data?.totalContractors ?? 0,
      icon: UsersIcon, color: 'text-orange-600', bg: 'bg-orange-50',
    },
    {
      name: 'Total Business Value', value: formatCurrency(totalBusinessValue),
      icon: ArrowTrendingUpIcon, color: 'text-indigo-600', bg: 'bg-indigo-50',
    },
  ];

  // ── Charts ─────────────────────────────────────────────────────────────
  
  // 1. Branch Comparison (Bar)
  const branchLabels = branchPerf.map(b => b.branchName);
  const branchPurchaseData = branchPerf.map(b => b.totalPurchases || b.monthlyPurchase || 0);
  const branchStockData = branchPerf.map(b => b.totalStockValue || b.stockValue || 0);

  const branchChart = {
    labels: branchLabels,
    datasets: [
      {
        label: 'Purchase Value',
        data: branchPurchaseData,
        backgroundColor: 'rgba(147, 51, 234, 0.75)', // purple-600
        borderRadius: 4,
      },
      {
        label: 'Stock Value',
        data: branchStockData,
        backgroundColor: 'rgba(59, 130, 246, 0.75)', // primary-500
        borderColor: 'rgba(37, 99, 235, 1)', // primary-600
        borderRadius: 4,
      }
    ],
  };

  const branchOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { tooltip: { callbacks: { label: (ctx) => ` ${ctx.dataset.label}: ${formatCurrency(ctx.parsed.y)}` } } },
    scales: { x: { grid: { display: false } }, y: { grid: { color: '#f1f5f9' } } },
  };

  // 2. Monthly Business Growth (Line)
  const trendLabels = monthlyData.map(d => {
    const [y, m] = d._id.split('-');
    return new Date(y, parseInt(m) - 1).toLocaleString('default', { month: 'short', year: '2-digit' });
  });
  
  const growthChart = {
    labels: trendLabels.length ? trendLabels : ['No data'],
    datasets: [{
      label: 'Materials Issued (Qty)',
      data: monthlyData.map(d => d.totalQuantity),
      borderColor: 'rgba(147, 51, 234, 1)', // purple-600
      backgroundColor: 'rgba(147, 51, 234, 0.1)',
      borderWidth: 2,
      fill: true,
      tension: 0.4,
      pointRadius: monthlyData.length === 1 ? 6 : 4,
      pointBackgroundColor: 'rgba(147, 51, 234, 1)',
      pointHoverRadius: 8,
    }],
  };

  const growthOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: { x: { grid: { display: false } }, y: { grid: { color: '#f1f5f9' } } },
  };

  return (
    <div className="space-y-6 pb-10">
      {/* ── Header ───────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">All Branches Overview</h1>
          <p className="text-sm text-slate-400 mt-0.5">
            Company-level consolidated performance and metrics
          </p>
        </div>
        <Link
          to="/branches"
          className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg text-sm font-semibold hover:bg-slate-50 transition-colors shadow-sm"
        >
          <BuildingOffice2Icon className="w-4 h-4" />
          Manage Branches
        </Link>
      </div>

      {/* ── Stat Cards ───────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {stats.map(s => <StatCard key={s.name} {...s} />)}
      </div>

      {/* ── Charts Row 1 ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <SectionHeader title="Branch Performance Comparison" icon={BuildingOffice2Icon} />
          <div className="p-5" style={{ height: 300 }}>
            {branchPerf.length > 0
              ? <Bar data={branchChart} options={branchOptions} />
              : <div className="flex h-full items-center justify-center text-sm text-slate-400">No branch data</div>
            }
          </div>
        </div>
        
        {/* Branch Comparison */}
        <div className="card animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
          <SectionHeader title="Monthly Business Growth (Issues)" icon={ArrowTrendingUpIcon} />
          <div className="p-5" style={{ height: 300 }}>
            {monthlyData.length > 0
              ? <Line data={growthChart} options={growthOptions} />
              : <div className="flex h-full items-center justify-center text-sm text-slate-400">No growth data</div>
            }
          </div>
        </div>
      </div>

      {/* ── Branch Data Table ────────────────────────────────────────────────── */}
      <div className="card p-5">
        <SectionHeader title="Top Performing Branches" icon={BuildingOffice2Icon} linkTo="/branches" linkLabel="View all branches" />
        <div className="overflow-x-auto mt-4">
          <table className="table-modern">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Branch Name</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Location</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Manager</th>
                <th className="px-4 py-3 text-right font-semibold text-slate-600">Stock Value</th>
                <th className="px-4 py-3 text-right font-semibold text-slate-600">Purchases</th>
                <th className="px-4 py-3 text-right font-semibold text-slate-600">Monthly Issues</th>
                <th className="px-4 py-3 text-right font-semibold text-slate-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {branchPerf.map((b) => (
                <tr key={b.branchName} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 font-medium text-slate-900">{b.branchName}</td>
                  <td className="px-4 py-3 text-slate-500">{b.location}</td>
                  <td className="px-4 py-3 text-slate-500">{b.manager || '—'}</td>
                  <td className="px-4 py-3 text-right font-medium text-emerald-600">{formatCurrency(b.stockValue || b.totalStockValue)}</td>
                  <td className="px-4 py-3 text-right font-medium text-purple-600">{formatCurrency(b.monthlyPurchase || b.totalPurchases)}</td>
                  <td className="px-4 py-3 text-right font-medium text-indigo-600">{b.monthlyIssueQty || b.totalIssues || 0}</td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      to={`/admin/branches/${b.branchId}/dashboard`}
                      className="inline-flex items-center gap-1 px-3 py-1.5 bg-primary-50 text-primary-700 hover:bg-primary-100 rounded-lg text-xs font-semibold transition-colors"
                    >
                      Open Branch
                      <ArrowRightIcon className="w-3 h-3" />
                    </Link>
                  </td>
                </tr>
              ))}
              {branchPerf.length === 0 && (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-400">No branches active</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      
    </div>
  );
};

export default AllBranchesDashboard;
