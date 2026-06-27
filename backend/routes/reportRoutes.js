const express = require('express');
const router = express.Router();
const {
  generateIssueReport,
  generatePurchaseReport,
  generateBulkIssueReport,
  generateBulkPurchaseReport,
  generateStockReport,
  generateSystemSummary,
} = require('../controllers/reportController');
const { protect, authorize } = require('../middleware/auth');

// All report endpoints require authentication
router.use(protect);

// ── Single-record receipts (existing) ─────────────────────────────────────────
// GET /api/reports/issue/:id   — Issue Receipt PDF (MaterialRequest _id or requestId)
router.get('/issue/:id', generateIssueReport);

// GET /api/reports/purchase/:id — Purchase Receipt PDF (Transaction _id)
router.get('/purchase/:id', generatePurchaseReport);

// ── Bulk / Filtered reports (new) ─────────────────────────────────────────────
// GET /api/reports/issues — Bulk Issue Report (admin/manager: all, contractor: own only)
router.get('/issues', authorize('admin', 'manager', 'contractor'), generateBulkIssueReport);

// GET /api/reports/purchases — Bulk Purchase Report (admin/manager only)
router.get('/purchases', authorize('admin', 'manager'), generateBulkPurchaseReport);

// GET /api/reports/stock — Stock Summary Report (admin/manager only)
router.get('/stock', authorize('admin', 'manager'), generateStockReport);

// GET /api/reports/system-summary — Executive System Summary (admin only)
router.get('/system-summary', authorize('admin'), generateSystemSummary);

module.exports = router;
