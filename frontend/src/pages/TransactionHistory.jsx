import React, { useState, useEffect } from 'react';
import axiosInstance from '../api/axiosInstance';
import { formatDateTime, formatCurrency } from '../utils/constants';
import { ArrowDownTrayIcon, ArrowUpTrayIcon } from '@heroicons/react/24/outline';

const TransactionHistory = () => {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState('all');

  useEffect(() => {
    const fetchTransactions = async () => {
      setLoading(true);
      try {
        const res = await axiosInstance.get(`/transactions${filterType !== 'all' ? `?type=${filterType}` : ''}`);
        if (res.data.success) {
          setTransactions(res.data.data);
        }
      } catch (error) {
        console.error("Failed to fetch transactions:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchTransactions();
  }, [filterType]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-slate-900">Transaction History</h1>
        
        <div className="flex space-x-2 bg-white p-1 rounded-md border border-slate-200">
          <button 
            className={`px-3 py-1 text-sm rounded ${filterType === 'all' ? 'bg-slate-200 text-slate-800 font-medium' : 'text-slate-600 hover:bg-slate-50'}`}
            onClick={() => setFilterType('all')}
          >
            All
          </button>
          <button 
            className={`px-3 py-1 text-sm rounded ${filterType === 'issue' ? 'bg-red-100 text-red-800 font-medium' : 'text-slate-600 hover:bg-slate-50'}`}
            onClick={() => setFilterType('issue')}
          >
            Issues (Out)
          </button>
          <button 
            className={`px-3 py-1 text-sm rounded ${filterType === 'purchase' ? 'bg-green-100 text-green-800 font-medium' : 'text-slate-600 hover:bg-slate-50'}`}
            onClick={() => setFilterType('purchase')}
          >
            Purchases (In)
          </button>
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Date & Time</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Material</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Quantity</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Reference / Performed By</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200">
              {loading ? (
                <tr><td colSpan="5" className="px-6 py-10 text-center text-slate-500">Loading transactions...</td></tr>
              ) : transactions.length > 0 ? (
                transactions.map((txn) => (
                  <tr key={txn._id} className="hover:bg-slate-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                      {formatDateTime(txn.createdAt)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {txn.type === 'issue' ? (
                        <span className="inline-flex items-center text-red-600 font-medium text-sm">
                          <ArrowUpTrayIcon className="w-4 h-4 mr-1" /> Issue
                        </span>
                      ) : (
                        <span className="inline-flex items-center text-green-600 font-medium text-sm">
                          <ArrowDownTrayIcon className="w-4 h-4 mr-1" /> Purchase
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-slate-900">{txn.material?.name}</div>
                      <div className="text-xs text-slate-500">{txn.material?.category}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <span className={txn.type === 'issue' ? 'text-red-600' : 'text-green-600'}>
                        {txn.type === 'issue' ? '-' : '+'}{txn.quantity} {txn.unit}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-slate-900">
                        {txn.type === 'issue' ? `Req: ${txn.materialRequest?.requestId || 'N/A'}` : `Inv: ${txn.invoiceNumber || 'N/A'}`}
                      </div>
                      <div className="text-xs text-slate-500">By: {txn.performedBy?.name}</div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" className="px-6 py-10 text-center text-slate-500">
                    No transactions found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default TransactionHistory;
