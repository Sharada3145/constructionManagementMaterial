import React, { useState, useEffect } from 'react';
import axiosInstance from '../api/axiosInstance';
import { formatDateTime, formatCurrency } from '../utils/constants';
import {
  ArrowDownTrayIcon,
  ArrowUpTrayIcon,
  DocumentArrowDownIcon,
} from '@heroicons/react/24/outline';
import useReportDownload from '../hooks/useReportDownload';

const TransactionHistory = () => {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState('all');
  const { downloadIssueReport, downloadPurchaseReport, isDownloading } = useReportDownload();

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

  const handleDownload = (txn) => {
    if (txn.type === 'issue') {
      // Issue reports are tied to the MaterialRequest record
      const issueId = txn.materialRequest?._id || txn.materialRequest;
      if (issueId) {
        downloadIssueReport(issueId);
      } else {
        alert('No issue record linked to this transaction.');
      }
    } else if (txn.type === 'purchase') {
      downloadPurchaseReport(txn._id, txn.transactionId);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-slate-900">Transaction History</h1>
        
        <div className="flex space-x-2 bg-white/60 backdrop-blur-sm p-1 rounded-lg border border-white/50 shadow-sm">
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
          <table className="table-modern">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Date &amp; Time</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Material</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Quantity</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Reference / Performed By</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-slate-500 uppercase tracking-wider">Receipt</th>
              </tr>
            </thead>
            <tbody className="bg-white/40 divide-y divide-slate-100/80">
              {loading ? (
                <tr><td colSpan="6" className="px-6 py-10 text-center text-slate-500">Loading transactions...</td></tr>
              ) : transactions.length > 0 ? (
                transactions.map((txn) => {
                  const downloadKey = txn.type === 'issue'
                    ? `issue-${txn.materialRequest?._id || txn.materialRequest}`
                    : `purchase-${txn._id}`;
                  const isActive = isDownloading(downloadKey);

                  return (
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
                          {txn.type === 'issue'
                            ? `Req: ${txn.materialRequest?.requestId || 'N/A'}`
                            : `Inv: ${txn.invoiceNumber || 'N/A'}`}
                        </div>
                        <div className="text-xs text-slate-500">By: {txn.performedBy?.name}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        {(txn.type === 'issue' || txn.type === 'purchase') && (
                          <button
                            id={`btn-download-${txn.type}-${txn._id}`}
                            onClick={() => handleDownload(txn)}
                            disabled={isActive}
                            title={txn.type === 'issue' ? 'Download Issue Receipt' : 'Download Purchase Receipt'}
                            className={`inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors disabled:opacity-50 ${
                              txn.type === 'issue'
                                ? 'bg-red-50 text-red-700 hover:bg-red-100 border border-red-200'
                                : 'bg-green-50 text-green-700 hover:bg-green-100 border border-green-200'
                            }`}
                          >
                            {isActive ? (
                              <div className="h-3.5 w-3.5 rounded-full border-2 border-current border-t-transparent animate-spin" />
                            ) : (
                              <DocumentArrowDownIcon className="w-3.5 h-3.5" />
                            )}
                            PDF
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="6" className="px-6 py-10 text-center text-slate-500">
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
