import React, { useState, useEffect, useContext } from 'react';
import axiosInstance from '../api/axiosInstance';
import { AuthContext } from '../context/AuthContext';
import { formatDateTime } from '../utils/constants';
import {
  CubeIcon,
  UserCircleIcon,
  FolderIcon,
  CalendarIcon,
} from '@heroicons/react/24/outline';

const MyIssuedMaterials = () => {
  const { user } = useContext(AuthContext);
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);

  useEffect(() => {
    const fetchMyIssues = async () => {
      setLoading(true);
      try {
        // Contractors only see their own records (backend filters by role)
        const res = await axiosInstance.get('/requests');
        if (res.data.success) {
          setRecords(res.data.data);
        }
      } catch (error) {
        console.error('Failed to fetch issued materials:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchMyIssues();
  }, []);

  const totalMaterials = records.reduce((sum, r) => sum + (r.items?.length || 0), 0);
  const totalQuantity = records.reduce(
    (sum, r) => sum + r.items.reduce((s, i) => s + (i.approvedQuantity || i.requestedQuantity || 0), 0),
    0
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">My Issued Materials</h1>
          <p className="text-sm text-slate-500 mt-1">
            Materials issued to you by the stock manager.
          </p>
        </div>
        <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-4 py-2 text-sm">
          <span className="text-slate-500">Logged in as:</span>
          <span className="font-semibold text-slate-800">{user?.name}</span>
          <span className="badge bg-primary-100 text-primary-700 capitalize">{user?.role}</span>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card p-5 flex items-center gap-4">
          <div className="p-3 rounded-lg bg-blue-100 text-blue-600">
            <CubeIcon className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Total Issuances</p>
            <p className="text-2xl font-bold text-slate-900">{records.length}</p>
          </div>
        </div>
        <div className="card p-5 flex items-center gap-4">
          <div className="p-3 rounded-lg bg-green-100 text-green-600">
            <CubeIcon className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Total Line Items</p>
            <p className="text-2xl font-bold text-slate-900">{totalMaterials}</p>
          </div>
        </div>
        <div className="card p-5 flex items-center gap-4">
          <div className="p-3 rounded-lg bg-indigo-100 text-indigo-600">
            <CubeIcon className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Total Qty Received</p>
            <p className="text-2xl font-bold text-slate-900">{totalQuantity}</p>
          </div>
        </div>
      </div>

      {/* Records */}
      {loading ? (
        <div className="card p-10 text-center text-slate-500">Loading your materials...</div>
      ) : records.length === 0 ? (
        <div className="card p-10 text-center">
          <CubeIcon className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 font-medium">No materials have been issued to you yet.</p>
          <p className="text-slate-400 text-sm mt-1">Contact your stock manager to issue materials.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {records.map((record) => (
            <div key={record._id} className="card overflow-hidden">
              {/* Record Header */}
              <button
                className="w-full flex flex-col sm:flex-row sm:items-center justify-between p-5 gap-3 hover:bg-slate-50 transition-colors text-left"
                onClick={() => setExpandedId(expandedId === record._id ? null : record._id)}
              >
                <div className="flex items-center gap-4">
                  <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center font-bold text-sm">
                    {record.requestId?.replace('REQ-', '') || '#'}
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900">{record.requestId}</p>
                    <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                      <CalendarIcon className="w-3.5 h-3.5" />
                      {formatDateTime(record.createdAt)}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-3 text-sm">
                  {record.reviewedBy && (
                    <span className="flex items-center gap-1 text-slate-600">
                      <UserCircleIcon className="w-4 h-4 text-slate-400" />
                      Issued by: <strong>{record.reviewedBy?.name || 'Manager'}</strong>
                    </span>
                  )}
                  {record.project && (
                    <span className="flex items-center gap-1 text-slate-600">
                      <FolderIcon className="w-4 h-4 text-slate-400" />
                      {record.project?.name}
                    </span>
                  )}
                  <span className="badge bg-green-100 text-green-700">
                    ✓ Issued
                  </span>
                  <span className="badge bg-slate-100 text-slate-600 capitalize">
                    {record.priority}
                  </span>
                </div>

                <div className="text-xs text-slate-400 shrink-0">
                  {expandedId === record._id ? '▲ Hide details' : '▼ View details'}
                </div>
              </button>

              {/* Expandable Items Table */}
              {expandedId === record._id && (
                <div className="border-t border-slate-100">
                  <table className="min-w-full divide-y divide-slate-100">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">#</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Material</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Category</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Quantity Issued</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-slate-100">
                      {record.items.map((item, idx) => (
                        <tr key={item._id} className="hover:bg-slate-50">
                          <td className="px-6 py-3 text-sm text-slate-400">{idx + 1}</td>
                          <td className="px-6 py-3">
                            <div className="text-sm font-medium text-slate-900">{item.material?.name}</div>
                          </td>
                          <td className="px-6 py-3 text-sm text-slate-500 capitalize">{item.material?.category || '—'}</td>
                          <td className="px-6 py-3 text-right">
                            <span className="text-sm font-bold text-slate-900">
                              {item.approvedQuantity || item.requestedQuantity}
                            </span>
                            <span className="text-xs text-slate-500 ml-1">{item.unit}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {record.notes && (
                    <div className="px-6 py-3 bg-amber-50 border-t border-amber-100">
                      <p className="text-xs text-amber-700"><strong>Notes:</strong> {record.notes}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MyIssuedMaterials;

