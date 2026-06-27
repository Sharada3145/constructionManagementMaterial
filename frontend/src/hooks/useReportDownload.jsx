import { useState } from 'react';
import axiosInstance from '../api/axiosInstance';

/**
 * useReportDownload
 * Provides helpers to download Issue and Purchase receipt PDFs,
 * as well as bulk/filtered reports (issues, purchases, stock, system summary).
 * The PDF is fetched with the existing auth token (via axiosInstance)
 * and opened in a new browser tab.
 */
const useReportDownload = () => {
  const [downloading, setDownloading] = useState({});

  /**
   * Internal helper — fetches the PDF blob and triggers an open/download.
   * @param {string} url        - API endpoint path (relative, e.g. '/reports/issue/abc')
   * @param {string} filename   - Suggested filename for the download
   * @param {string} key        - Unique key for the downloading state map
   */
  const [previewData, setPreviewData] = useState(null);

  const fetchAndOpen = async (url, filename, key) => {
    if (downloading[key]) return;          // Prevent double-click
    setDownloading(prev => ({ ...prev, [key]: true }));

    try {
      const response = await axiosInstance.get(url, { responseType: 'blob' });
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const objectUrl = URL.createObjectURL(blob);

      // Show preview modal instead of new tab
      setPreviewData({ url: objectUrl, filename });

    } catch (err) {
      console.error('Failed to download report:', err);
      // Try to extract error message from blob response
      if (err.response?.data instanceof Blob) {
        try {
          const text = await err.response.data.text();
          const parsed = JSON.parse(text);
          alert(parsed.message || 'Could not generate the report. Please try again.');
        } catch {
          alert('Could not generate the report. Please try again.');
        }
      } else {
        alert(err.response?.data?.message || 'Could not generate the report. Please try again.');
      }
    } finally {
      setDownloading(prev => ({ ...prev, [key]: false }));
    }
  };

  const closePreview = () => {
    if (previewData) {
      URL.revokeObjectURL(previewData.url);
      setPreviewData(null);
    }
  };

  const handleDownload = () => {
    if (!previewData) return;
    const link = document.createElement('a');
    link.href = previewData.url;
    link.download = previewData.filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const ReportPreviewModal = previewData ? (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/75 backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div>
            <h3 className="text-lg font-bold text-slate-800">Report Preview</h3>
            <p className="text-sm text-slate-500">{previewData.filename}</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleDownload}
              className="px-4 py-2 bg-primary-600 text-white text-sm font-semibold rounded-lg hover:bg-primary-700 transition-colors shadow-sm"
            >
              Download PDF
            </button>
            <button
              onClick={closePreview}
              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-lg transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* PDF Viewer */}
        <div className="flex-1 bg-slate-200 p-2">
          <iframe 
            src={`${previewData.url}#toolbar=0`} 
            className="w-full h-full rounded shadow-sm border border-slate-300" 
            title="PDF Preview"
          />
        </div>
      </div>
    </div>
  ) : null;

  // ── Single-record downloads (existing) ──────────────────────────────────────

  /**
   * Download an Issue Receipt PDF.
   * @param {string} issueId - MaterialRequest _id or requestId (e.g. "REQ-000001")
   */
  const downloadIssueReport = (issueId) => {
    fetchAndOpen(
      `/reports/issue/${issueId}`,
      `issue-receipt-${issueId}.pdf`,
      `issue-${issueId}`
    );
  };

  /**
   * Download a Purchase Receipt PDF.
   * @param {string} txnId - Transaction _id
   * @param {string} [txnLabel] - Optional transaction ID label for filename
   */
  const downloadPurchaseReport = (txnId, txnLabel) => {
    fetchAndOpen(
      `/reports/purchase/${txnId}`,
      `purchase-receipt-${txnLabel || txnId}.pdf`,
      `purchase-${txnId}`
    );
  };

  // ── Bulk / Filtered report downloads (new) ──────────────────────────────────

  /**
   * Download a bulk Issue Summary Report PDF.
   * @param {object} params - { contractorId?, startDate?, endDate? }
   */
  const downloadBulkIssueReport = (params = {}) => {
    const query = new URLSearchParams();
    if (params.contractorId) query.set('contractorId', params.contractorId);
    if (params.startDate) query.set('startDate', params.startDate);
    if (params.endDate) query.set('endDate', params.endDate);
    const qs = query.toString();
    fetchAndOpen(
      `/reports/issues${qs ? `?${qs}` : ''}`,
      `issue-summary-report.pdf`,
      'bulk-issue'
    );
  };

  /**
   * Download a bulk Purchase Summary Report PDF.
   * @param {object} params - { supplierId?, startDate?, endDate? }
   */
  const downloadBulkPurchaseReport = (params = {}) => {
    const query = new URLSearchParams();
    if (params.supplierId) query.set('supplierId', params.supplierId);
    if (params.startDate) query.set('startDate', params.startDate);
    if (params.endDate) query.set('endDate', params.endDate);
    const qs = query.toString();
    fetchAndOpen(
      `/reports/purchases${qs ? `?${qs}` : ''}`,
      `purchase-summary-report.pdf`,
      'bulk-purchase'
    );
  };

  /**
   * Download a Stock Summary Report PDF.
   * @param {object} params - { category? }
   */
  const downloadStockReport = (params = {}) => {
    const query = new URLSearchParams();
    if (params.category) query.set('category', params.category);
    const qs = query.toString();
    fetchAndOpen(
      `/reports/stock${qs ? `?${qs}` : ''}`,
      `stock-summary-report.pdf`,
      'stock'
    );
  };

  /**
   * Download a System Summary Report PDF.
   * @param {object} params - { startDate?, endDate? }
   */
  const downloadSystemSummary = (params = {}) => {
    const query = new URLSearchParams();
    if (params.startDate) query.set('startDate', params.startDate);
    if (params.endDate) query.set('endDate', params.endDate);
    const qs = query.toString();
    fetchAndOpen(
      `/reports/system-summary${qs ? `?${qs}` : ''}`,
      `system-summary-report.pdf`,
      'system-summary'
    );
  };

  /**
   * Check whether a given download is in progress.
   * @param {string} key - The same key as used in fetchAndOpen
   */
  const isDownloading = (key) => !!downloading[key];

  return {
    downloadIssueReport,
    downloadPurchaseReport,
    downloadBulkIssueReport,
    downloadBulkPurchaseReport,
    downloadStockReport,
    downloadSystemSummary,
    isDownloading,
    ReportPreviewModal,
  };
};

export default useReportDownload;
