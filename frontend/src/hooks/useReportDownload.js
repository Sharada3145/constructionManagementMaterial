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
  const fetchAndOpen = async (url, filename, key) => {
    if (downloading[key]) return;          // Prevent double-click
    setDownloading(prev => ({ ...prev, [key]: true }));

    try {
      const response = await axiosInstance.get(url, { responseType: 'blob' });
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const objectUrl = URL.createObjectURL(blob);

      // Return the URL and filename so the UI can preview it in an iframe
      return { url: objectUrl, filename };
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

  // ── Single-record downloads (existing) ──────────────────────────────────────

  /**
   * Download an Issue Receipt PDF.
   * @param {string} issueId - MaterialRequest _id or requestId (e.g. "REQ-000001")
   */
  const downloadIssueReport = (issueId) => {
    return fetchAndOpen(
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
    return fetchAndOpen(
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
    return fetchAndOpen(
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
    return fetchAndOpen(
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
    return fetchAndOpen(
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
    return fetchAndOpen(
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
  };
};

export default useReportDownload;
