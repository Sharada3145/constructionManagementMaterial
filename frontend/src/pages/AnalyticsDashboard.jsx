import React, { useState, useEffect, useContext } from 'react';
import axiosInstance from '../api/axiosInstance';
import { formatCurrency } from '../utils/constants';
import { BranchContext } from '../context/BranchContext';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement
} from 'chart.js';
import { Bar, Pie, Line } from 'react-chartjs-2';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement
);

const AnalyticsDashboard = () => {
  const [consumption, setConsumption] = useState([]);
  const [topMaterials, setTopMaterials] = useState([]);
  const [categoryDist, setCategoryDist] = useState([]);
  const [loading, setLoading] = useState(true);
  const { activeBranchId } = useContext(BranchContext);

  useEffect(() => {
    const fetchAnalytics = async () => {
      setLoading(true);
      try {
        const [consRes, topRes, catRes] = await Promise.all([
          axiosInstance.get('/analytics/consumption?period=all'),
          axiosInstance.get('/analytics/top-materials?days=all&limit=5'),
          axiosInstance.get('/analytics/category-distribution')
        ]);
        
        if (consRes.data.success) setConsumption(consRes.data.data);
        if (topRes.data.success) setTopMaterials(topRes.data.data);
        if (catRes.data.success) setCategoryDist(catRes.data.data);
      } catch (error) {
        console.error("Failed to fetch analytics:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchAnalytics();
  }, [activeBranchId]);

  if (loading) {
    return <div className="flex h-full items-center justify-center">Loading analytics data...</div>;
  }

  // Prepare chart data
  const consumptionChartData = {
    labels: consumption.map(c => c._id),
    datasets: [
      {
        label: 'Issues Count',
        data: consumption.map(c => c.count),
        borderColor: 'rgb(56, 189, 248)',
        backgroundColor: 'rgba(56, 189, 248, 0.5)',
        tension: 0.3,
      }
    ],
  };

  const topMaterialsData = {
    labels: topMaterials.map(m => m.materialName),
    datasets: [
      {
        label: 'Total Quantity Issued',
        data: topMaterials.map(m => m.totalQuantity),
        backgroundColor: 'rgba(99, 102, 241, 0.7)',
      }
    ],
  };

  const categoryData = {
    labels: categoryDist.map(c => c._id),
    datasets: [
      {
        data: categoryDist.map(c => c.totalValue),
        backgroundColor: [
          '#facc15', '#f97316', '#3b82f6', '#10b981', '#6366f1', 
          '#ec4899', '#8b5cf6', '#14b8a6', '#f43f5e', '#84cc16'
        ],
      }
    ],
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Advanced Analytics</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Consumption Trend Line Chart */}
        <div className="card p-5 lg:col-span-2">
          <h2 className="text-lg font-semibold text-slate-800 mb-4">Material Issue Trend (Last 30 Days)</h2>
          <div className="h-[300px] w-full relative">
            <Line 
              data={consumptionChartData} 
              options={{ maintainAspectRatio: false, responsive: true }} 
            />
          </div>
        </div>

        {/* Top Consumed Materials Bar Chart */}
        <div className="card p-5">
          <h2 className="text-lg font-semibold text-slate-800 mb-4">Top 5 Consumed Materials</h2>
          <div className="h-[300px] w-full relative">
            <Bar 
              data={topMaterialsData} 
              options={{ 
                maintainAspectRatio: false, 
                responsive: true,
                plugins: { legend: { display: false } }
              }} 
            />
          </div>
        </div>

        {/* Stock Value by Category Pie Chart */}
        <div className="card p-5">
          <h2 className="text-lg font-semibold text-slate-800 mb-4">Stock Value by Category</h2>
          <div className="h-[300px] w-full relative">
            <Pie 
              data={categoryData} 
              options={{ 
                maintainAspectRatio: false, 
                responsive: true,
                plugins: {
                  legend: { position: 'right' }
                }
              }} 
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsDashboard;
