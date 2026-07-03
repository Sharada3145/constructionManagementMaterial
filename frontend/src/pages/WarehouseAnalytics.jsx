import React, { useState, useEffect } from 'react';
import axiosInstance from '../api/axiosInstance';
import { formatCurrency } from '../utils/constants';
import { 
  BuildingOffice2Icon,
  CubeIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ArrowTrendingUpIcon
} from '@heroicons/react/24/outline';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line
} from 'recharts';

const COLORS = ['#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#f97316'];

const WarehouseAnalytics = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      const res = await axiosInstance.get('/analytics/warehouse');
      if (res.data.success) {
        setData(res.data.data);
      }
    } catch (error) {
      console.error('Failed to load warehouse analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !data) {
    return <div className="p-8 text-center text-slate-500">Loading Analytics...</div>;
  }

  const { usageByMaterial, demandComparison, restockPredictions } = data;

  // Format usageByMaterial for charts
  const materialUsageList = Object.entries(usageByMaterial || {}).map(([name, info]) => ({
    name,
    total: info.total,
    branches: info.branches
  })).sort((a, b) => b.total - a.total).slice(0, 5); // Top 5

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Warehouse Analytics</h1>
        <p className="text-sm text-slate-500">Global consumption and restock intelligence</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Branch Demand Comparison */}
        <div className="card p-6">
          <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center">
            <BuildingOffice2Icon className="w-5 h-5 mr-2 text-primary-500" />
            Branch Demand Comparison (Last 30 Days)
          </h2>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={demandComparison} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="branchName" tick={{ fill: '#64748b', fontSize: 12 }} />
                <YAxis tick={{ fill: '#64748b', fontSize: 12 }} />
                <Tooltip 
                  formatter={(value) => formatCurrency(value)}
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                />
                <Bar dataKey="totalValue" name="Total Value (₹)" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          
          <div className="mt-4 pt-4 border-t border-slate-100">
            <div className="flex justify-between items-center text-sm">
              <span className="text-slate-500">Highest Consuming Branch</span>
              <span className="font-bold text-slate-900">{demandComparison[0]?.branchName || 'N/A'}</span>
            </div>
          </div>
        </div>

        {/* Top Material Usage Across Branches */}
        <div className="card p-6">
          <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center">
            <CubeIcon className="w-5 h-5 mr-2 text-primary-500" />
            Top Material Usage
          </h2>
          <div className="space-y-6">
            {materialUsageList.map(mat => (
              <div key={mat.name}>
                <div className="flex justify-between items-end mb-2">
                  <span className="font-medium text-slate-900">{mat.name}</span>
                  <span className="text-sm font-bold text-primary-600">{mat.total} units total</span>
                </div>
                <div className="space-y-2">
                  {mat.branches.map(b => (
                    <div key={b.branchName} className="flex items-center text-sm">
                      <span className="w-24 text-slate-500 truncate" title={b.branchName}>{b.branchName}</span>
                      <div className="flex-1 ml-2 mr-4 bg-slate-100 rounded-full h-2 overflow-hidden">
                        <div 
                          className="bg-primary-500 h-full rounded-full" 
                          style={{ width: `${(b.quantity / mat.total) * 100}%` }}
                        ></div>
                      </div>
                      <span className="w-12 text-right font-medium text-slate-700">{b.quantity}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
            {materialUsageList.length === 0 && (
              <div className="text-center text-slate-500 py-8">No usage data available</div>
            )}
          </div>
        </div>

        {/* Restock Predictions */}
        <div className="card p-0 lg:col-span-2 overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <h2 className="text-lg font-bold text-slate-900 flex items-center">
              <ArrowTrendingUpIcon className="w-5 h-5 mr-2 text-emerald-500" />
              AI Restock Predictions
            </h2>
            <div className="text-xs text-slate-500">Based on 30-day velocity from Central Warehouse</div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Material</th>
                  <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Current Stock</th>
                  <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Daily Velocity</th>
                  <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Days to Shortage</th>
                  <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Recommended Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {restockPredictions?.map((item, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap font-medium text-slate-900">{item.materialName}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                      {item.currentStock} {item.unit}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                      {item.dailyVelocity} / day
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {item.daysUntilShortage === -1 ? (
                        <span className="inline-flex items-center text-emerald-600 text-sm font-medium">
                          <CheckCircleIcon className="w-4 h-4 mr-1" /> Healthy
                        </span>
                      ) : (
                        <span className={`inline-flex items-center text-sm font-bold ${
                          item.daysUntilShortage === 0 ? 'text-red-600' : 
                          item.daysUntilShortage < 15 ? 'text-amber-500' : 'text-emerald-600'
                        }`}>
                          {item.daysUntilShortage === 0 ? (
                            <><ExclamationTriangleIcon className="w-4 h-4 mr-1" /> Critical Shortage</>
                          ) : (
                            <>{item.daysUntilShortage} Days</>
                          )}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {item.recommendedPurchase > 0 ? (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold bg-primary-50 text-primary-700 border border-primary-200">
                          Order {item.recommendedPurchase} {item.unit}
                        </span>
                      ) : (
                        <span className="text-slate-400 text-sm italic">Adequate Stock</span>
                      )}
                    </td>
                  </tr>
                ))}
                {(!restockPredictions || restockPredictions.length === 0) && (
                  <tr>
                    <td colSpan="5" className="px-6 py-8 text-center text-slate-500">
                      No materials in Central Warehouse to predict.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
};

export default WarehouseAnalytics;
