const PDFDocument = require('pdfkit');
const MaterialRequest = require('../models/MaterialRequest');
const Transaction = require('../models/Transaction');
const Material = require('../models/Material');
const User = require('../models/User');
const Branch = require('../models/Branch');
const { getBranchFilter } = require('../middleware/auth');

const path = require('path');

// ─── Shared PDF helpers ────────────────────────────────────────────────────────

const COLORS = {
  headerBg:    '#1A2B4A',   // deep navy
  headerAccent:'#F59E0B',   // amber accent
  tableHeader: '#2D4A7A',   // mid-blue
  tableStripe: '#F0F4FA',   // light stripe
  border:      '#C5D3E8',   // soft border
  text:        '#1E293B',   // slate-900
  subtext:     '#64748B',   // slate-500
  success:     '#16A34A',   // green
  total:       '#1A2B4A',   // navy for totals row
  white:       '#FFFFFF',
};

const FONT_DIR = path.join(__dirname, '../utils/fonts');

const FONT = {
  regular: 'Roboto-Regular',
  bold:    'Roboto-Bold',
  oblique: 'Helvetica-Oblique',
};

const PAGE = { width: 595.28, height: 841.89, margin: 45 };

function createDocument(options = {}) {
  const doc = new PDFDocument({ size: 'A4', margin: PAGE.margin, ...options });
  // Register Unicode fonts to support the Indian Rupee symbol (₹)
  doc.registerFont('Roboto-Regular', path.join(FONT_DIR, 'Roboto-Regular.ttf'));
  doc.registerFont('Roboto-Bold', path.join(FONT_DIR, 'Roboto-Bold.ttf'));
  return doc;
}


// ── Watermark ──────────────────────────────────────────────────────────────────
function drawWatermark(doc) {
  doc.save();
  doc.opacity(0.045);
  doc.font(FONT.bold).fontSize(58).fillColor('#000000');
  const cx = PAGE.width / 2;
  const cy = PAGE.height / 2;
  doc.rotate(-40, { origin: [cx, cy] });
  doc.text('CONSTRUCTION STOCK', cx - 200, cy - 40, { width: 400, align: 'center' });
  doc.text('MANAGEMENT SYSTEM',  cx - 200, cy + 20,  { width: 400, align: 'center' });
  doc.restore();
}

// ── Header banner ──────────────────────────────────────────────────────────────
function drawHeader(doc, title, subtitle, refId, dateStr) {
  const m = PAGE.margin;

  // Background rect
  doc.rect(m, 30, PAGE.width - m * 2, 90).fill(COLORS.headerBg);

  // Amber accent bar on left
  doc.rect(m, 30, 6, 90).fill(COLORS.headerAccent);

  // Company name
  doc.font(FONT.bold).fontSize(14).fillColor(COLORS.white);
  doc.text('CONSTRUCTION STOCK MANAGEMENT SYSTEM', m + 18, 44, {
    width: PAGE.width - m * 2 - 160,
  });

  // Sub-title
  doc.font(FONT.regular).fontSize(10).fillColor(COLORS.headerAccent);
  doc.text(subtitle, m + 18, 64, { width: PAGE.width - m * 2 - 160 });

  // Ref ID chip (top-right)
  doc.roundedRect(PAGE.width - m - 140, 38, 135, 24, 4).fill(COLORS.headerAccent);
  doc.font(FONT.bold).fontSize(11).fillColor(COLORS.headerBg);
  doc.text(refId, PAGE.width - m - 135, 44, { width: 125, align: 'center' });

  // Date (below chip)
  doc.font(FONT.regular).fontSize(8.5).fillColor(COLORS.white);
  doc.text(dateStr, PAGE.width - m - 140, 68, { width: 135, align: 'center' });

  doc.moveDown(0.3);
}

// ── Section divider label ──────────────────────────────────────────────────────
function sectionLabel(doc, label, y) {
  const m = PAGE.margin;
  doc.rect(m, y, PAGE.width - m * 2, 20).fill(COLORS.tableHeader);
  doc.font(FONT.bold).fontSize(9).fillColor(COLORS.white);
  doc.text(label.toUpperCase(), m + 10, y + 5, { width: 300 });
  return y + 20;
}

// ── Info grid (2 columns) ──────────────────────────────────────────────────────
function drawInfoGrid(doc, rows, startY) {
  const m = PAGE.margin;
  const colW = (PAGE.width - m * 2) / 2;
  let y = startY + 8;

  rows.forEach(([label, value], i) => {
    const x = i % 2 === 0 ? m + 6 : m + colW + 6;
    if (i % 2 === 0 && i > 0) y += 22;

    doc.font(FONT.bold).fontSize(8.5).fillColor(COLORS.subtext);
    doc.text(label, x, y, { width: colW - 12, height: 15, ellipsis: true });
    doc.font(FONT.regular).fontSize(9.5).fillColor(COLORS.text);
    doc.text(value || '—', x, y + 11, { width: colW - 12, height: 15, ellipsis: true });
  });
  // Adjust for odd number of rows
  const extraRows = Math.ceil(rows.length / 2);
  return startY + 8 + (extraRows * 22) + 14;
}

// ── Table ──────────────────────────────────────────────────────────────────────
function drawTable(doc, columns, rows, startY) {
  const m = PAGE.margin;
  const tableW = PAGE.width - m * 2;
  const rowH = 22;

  // Calculate column widths from relative weights
  const totalWeight = columns.reduce((s, c) => s + c.weight, 0);
  const colWidths = columns.map(c => (c.weight / totalWeight) * tableW);

  // Header row
  let x = m;
  doc.rect(m, startY, tableW, rowH).fill(COLORS.tableHeader);
  columns.forEach((col, ci) => {
    doc.font(FONT.bold).fontSize(8.5).fillColor(COLORS.white);
    doc.text(col.label, x + 6, startY + 7, { width: colWidths[ci] - 10, align: col.align || 'left', height: 15, ellipsis: true });
    x += colWidths[ci];
  });

  let y = startY + rowH;

  rows.forEach((row, ri) => {
    const bg = ri % 2 === 1 ? COLORS.tableStripe : COLORS.white;
    doc.rect(m, y, tableW, rowH).fill(bg);

    x = m;
    columns.forEach((col, ci) => {
      doc.font(FONT.regular).fontSize(9).fillColor(COLORS.text);
      const cell = row[ci] !== undefined ? String(row[ci]) : '';
      doc.text(cell, x + 6, y + 7, { width: colWidths[ci] - 12, height: 15, ellipsis: true });
      x += colWidths[ci];
    });

    // Row border
    doc.rect(m, y, tableW, rowH).strokeColor(COLORS.border).lineWidth(0.3).stroke();
    y += rowH;
  });

  // Outer table border
  doc.rect(m, startY, tableW, rowH + rows.length * rowH).strokeColor(COLORS.border).lineWidth(0.5).stroke();

  return y;
}

// ── Totals / Summary row ───────────────────────────────────────────────────────
function drawTotalsRow(doc, label, value, y) {
  const m = PAGE.margin;
  const tableW = PAGE.width - m * 2;
  doc.rect(m, y, tableW, 26).fill(COLORS.total);
  doc.font(FONT.bold).fontSize(10).fillColor(COLORS.white);
  doc.text(label, m + 10, y + 8, { width: tableW / 2 });
  doc.text(value, m + tableW / 2, y + 8, { width: tableW / 2 - 10, align: 'right' });
  return y + 26;
}

// ── Signature section ──────────────────────────────────────────────────────────
function drawSignatures(doc, leftLabel, rightLabel, y) {
  const m = PAGE.margin;
  const boxW = (PAGE.width - m * 2 - 40) / 2;
  const boxH = 70;

  // Left box
  doc.rect(m, y, boxW, boxH).strokeColor(COLORS.border).lineWidth(0.8).stroke();
  doc.font(FONT.bold).fontSize(8.5).fillColor(COLORS.subtext);
  doc.text(leftLabel, m, y + boxH + 5, { width: boxW, align: 'center' });
  doc.font(FONT.oblique).fontSize(8).fillColor(COLORS.subtext);
  doc.text('Authorized Signature', m, y + boxH + 17, { width: boxW, align: 'center' });

  // Right box
  const rx = m + boxW + 40;
  doc.rect(rx, y, boxW, boxH).strokeColor(COLORS.border).lineWidth(0.8).stroke();
  doc.font(FONT.bold).fontSize(8.5).fillColor(COLORS.subtext);
  doc.text(rightLabel, rx, y + boxH + 5, { width: boxW, align: 'center' });
  doc.font(FONT.oblique).fontSize(8).fillColor(COLORS.subtext);
  doc.text('Authorized Signature', rx, y + boxH + 17, { width: boxW, align: 'center' });

  return y + boxH + 30;
}

// ── Footer with page number ────────────────────────────────────────────────────
function drawFooter(doc, pageNum, totalPages) {
  const y = PAGE.height - 65;
  const m = PAGE.margin;
  const w = PAGE.width - m * 2;

  doc.rect(m, y, w, 0.5).fill(COLORS.border);

  doc.font(FONT.regular).fontSize(8).fillColor(COLORS.subtext);
  doc.text(
    'This is a computer-generated document. No signature required for digital records.',
    m, y + 6, { width: w / 2 }
  );
  doc.text(`Page ${pageNum} of ${totalPages}`, m, y + 6, {
    width: w, align: 'right',
  });
}

// ── Format helpers ─────────────────────────────────────────────────────────────
function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: true,
  });
}

function fmtCurrency(n) {
  if (!n && n !== 0) return '—';
  return `₹ ${Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
}

// ─── ISSUE REPORT ─────────────────────────────────────────────────────────────

// @desc  Generate Issue Receipt PDF
// @route GET /api/reports/issue/:id
// @access Private
const generateIssueReport = async (req, res, next) => {
  try {
    // Support lookup by _id or requestId
    const branchFilter = getBranchFilter(req);
    let record = await MaterialRequest.findOne({ _id: req.params.id, ...branchFilter })
      .populate('contractor', 'name email phone')
      .populate('items.material', 'name unit category')
      .populate('project', 'name location')
      .populate('reviewedBy', 'name');

    if (!record) {
      record = await MaterialRequest.findOne({ requestId: req.params.id, ...branchFilter })
        .populate('contractor', 'name email phone')
        .populate('items.material', 'name unit category')
        .populate('project', 'name location')
        .populate('reviewedBy', 'name');
    }

    if (!record) {
      return res.status(404).json({ success: false, message: 'Issue record not found' });
    }

    // ── Build PDF ──────────────────────────────────────────────────────────────
    const doc = createDocument({ autoFirstPage: true });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="issue-receipt-${record.requestId || record._id}.pdf"`
    );
    doc.pipe(res);

    // Page 1
    drawWatermark(doc);
    drawHeader(
      doc,
      'CONSTRUCTION STOCK MANAGEMENT SYSTEM',
      'ISSUE RECEIPT',
      record.requestId || `ISS-${String(record._id).slice(-6).toUpperCase()}`,
      fmtDate(record.createdAt)
    );

    // Info section
    let y = 135;
    y = sectionLabel(doc, 'Issue Details', y);
    y = drawInfoGrid(doc, [
      ['Issue ID',        record.requestId || '—'],
      ['Date & Time',     fmtDate(record.createdAt)],
      ['Contractor Name', record.contractor?.name || '—'],
      ['Contact / Email', record.contractor?.email || '—'],
      ['Site / Project',  record.project?.name || 'General'],
      ['Status',          (record.status || '').toUpperCase()],
      ['Priority',        (record.priority || '').toUpperCase()],
      ['Issued By',       record.reviewedBy?.name || '—'],
    ], y);

    y += 12;

    // Materials table
    y = sectionLabel(doc, 'Materials Issued', y);
    y += 2;

    const columns = [
      { label: '#',             weight: 0.5, align: 'center' },
      { label: 'Material Name', weight: 4,   align: 'left'   },
      { label: 'Category',      weight: 2,   align: 'left'   },
      { label: 'Quantity',      weight: 1.2, align: 'right'  },
      { label: 'Unit',          weight: 1,   align: 'center' },
    ];

    const tableRows = record.items.map((item, i) => [
      i + 1,
      item.material?.name  || '—',
      item.material?.category || '—',
      item.approvedQuantity ?? item.requestedQuantity,
      item.unit || item.material?.unit || '—',
    ]);

    y = drawTable(doc, columns, tableRows, y);

    // Totals
    y = drawTotalsRow(doc, 'TOTAL MATERIALS ISSUED', `${record.items.length} item(s)`, y + 4);

    // Notes (if any)
    if (record.notes) {
      y += 14;
      doc.font(FONT.bold).fontSize(9).fillColor(COLORS.subtext);
      doc.text('NOTES:', PAGE.margin, y);
      y += 12;
      doc.font(FONT.regular).fontSize(9).fillColor(COLORS.text);
      doc.text(record.notes, PAGE.margin, y, { width: PAGE.width - PAGE.margin * 2 });
      y += 24;
    } else {
      y += 18;
    }

    // Signatures
    y = sectionLabel(doc, 'Signatures', y);
    y += 10;
    drawSignatures(doc, 'STOCK MANAGER / ISSUER', 'CONTRACTOR', y);

    // Footer
    drawFooter(doc, 1, 1);

    doc.end();
  } catch (error) {
    next(error);
  }
};

// ─── PURCHASE REPORT ──────────────────────────────────────────────────────────

// @desc  Generate Purchase Receipt PDF
// @route GET /api/reports/purchase/:id
// @access Private
const generatePurchaseReport = async (req, res, next) => {
  try {
    const branchFilter = getBranchFilter(req);
    const txn = await Transaction.findOne({ _id: req.params.id, ...branchFilter })
      .populate('material', 'name unit category')
      .populate('performedBy', 'name email')
      .populate('supplier', 'name contactPerson phone email address gstNumber');

    if (!txn || txn.type !== 'purchase') {
      return res.status(404).json({ success: false, message: 'Purchase transaction not found' });
    }

    // ── Build PDF ──────────────────────────────────────────────────────────────
    const doc = createDocument({ autoFirstPage: true });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="purchase-receipt-${txn.transactionId || txn._id}.pdf"`
    );
    doc.pipe(res);

    // Page 1
    drawWatermark(doc);
    drawHeader(
      doc,
      'CONSTRUCTION STOCK MANAGEMENT SYSTEM',
      'PURCHASE RECEIPT',
      txn.transactionId || `PUR-${String(txn._id).slice(-6).toUpperCase()}`,
      fmtDate(txn.createdAt)
    );

    // Info section
    let y = 135;
    y = sectionLabel(doc, 'Purchase Details', y);
    y = drawInfoGrid(doc, [
      ['Purchase ID',     txn.transactionId || '—'],
      ['Date & Time',     fmtDate(txn.createdAt)],
      ['Supplier Name',   txn.supplier?.name || '—'],
      ['Contact Person',  txn.supplier?.contactPerson || '—'],
      ['Supplier Phone',  txn.supplier?.phone || '—'],
      ['Supplier Email',  txn.supplier?.email || '—'],
      ['GST Number',      txn.supplier?.gstNumber || 'N/A (Future)'],
      ['Invoice Number',  txn.invoiceNumber || '—'],
      ['Received By',     txn.performedBy?.name || '—'],
      ['Notes',           txn.notes || '—'],
    ], y);

    y += 12;

    // Supplier address
    if (txn.supplier?.address) {
      doc.font(FONT.bold).fontSize(8.5).fillColor(COLORS.subtext);
      doc.text('SUPPLIER ADDRESS:', PAGE.margin + 6, y);
      doc.font(FONT.regular).fontSize(9).fillColor(COLORS.text);
      doc.text(txn.supplier.address, PAGE.margin + 6, y + 12, {
        width: PAGE.width - PAGE.margin * 2 - 12,
      });
      y += 34;
    }

    y += 6;

    // Materials table
    y = sectionLabel(doc, 'Materials Purchased', y);
    y += 2;

    const columns = [
      { label: '#',             weight: 0.5, align: 'center' },
      { label: 'Material Name', weight: 3.5, align: 'left'   },
      { label: 'Category',      weight: 2,   align: 'left'   },
      { label: 'Unit',          weight: 1,   align: 'center' },
      { label: 'Quantity',      weight: 1.2, align: 'right'  },
      { label: 'Unit Price',    weight: 1.5, align: 'right'  },
      { label: 'Total',         weight: 1.5, align: 'right'  },
    ];

    const tableRows = [[
      1,
      txn.material?.name || '—',
      txn.material?.category || '—',
      txn.unit || txn.material?.unit || '—',
      txn.quantity,
      fmtCurrency(txn.unitPrice),
      fmtCurrency(txn.totalPrice),
    ]];

    y = drawTable(doc, columns, tableRows, y);

    // Totals breakdown
    y += 4;
    const totalW = PAGE.width - PAGE.margin * 2;
    const rightX = PAGE.margin + totalW * 0.55;
    const labW = 120;
    const valW = totalW * 0.45 - 10;

    const summaryLines = [
      ['Subtotal:',   fmtCurrency(txn.unitPrice * txn.quantity)],
      ['GST / Tax:',  'As applicable'],
      ['Grand Total:', fmtCurrency(txn.totalPrice)],
    ];

    summaryLines.forEach(([lbl, val], i) => {
      const isLast = i === summaryLines.length - 1;
      if (isLast) {
        doc.rect(rightX - 8, y - 2, valW + labW + 16, 22).fill(COLORS.total);
        doc.font(FONT.bold).fontSize(10.5).fillColor(COLORS.white);
      } else {
        doc.font(FONT.regular).fontSize(9.5).fillColor(COLORS.text);
      }
      doc.text(lbl, rightX, y + (isLast ? 4 : 3), { width: labW, align: 'right' });
      doc.text(val,  rightX + labW + 10, y + (isLast ? 4 : 3), { width: valW - labW, align: 'right' });
      y += isLast ? 26 : 18;
    });

    y += 14;

    // Signatures
    y = sectionLabel(doc, 'Signatures', y);
    y += 10;
    drawSignatures(doc, 'STOCK MANAGER / RECEIVER', 'SUPPLIER REPRESENTATIVE', y);

    // Footer
    drawFooter(doc, 1, 1);

    doc.end();
  } catch (error) {
    next(error);
  }
};

// ─── BULK ISSUE REPORT ────────────────────────────────────────────────────────

// @desc  Generate filtered Issue Report PDF (multiple issues)
// @route GET /api/reports/issues
// @access Private (admin, manager — all contractors; contractor — own only)
const generateBulkIssueReport = async (req, res, next) => {
  try {
    const { contractorId, startDate, endDate } = req.query;

    // Build filter
    const filter = { status: 'issued' };

    // Contractors can only see their own
    if (req.user.role === 'contractor') {
      filter.contractor = req.user._id;
    } else if (contractorId) {
      filter.contractor = contractorId;
    }

    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        filter.createdAt.$lte = end;
      }
    }

    const records = await MaterialRequest.find(filter)
      .populate('contractor', 'name email phone')
      .populate('items.material', 'name unit category')
      .populate('project', 'name location')
      .populate('reviewedBy', 'name')
      .sort({ createdAt: -1 });

    if (records.length === 0) {
      return res.status(404).json({ success: false, message: 'No issue records found for the selected filters' });
    }

    // Determine contractor label for header
    const contractorLabel = records[0].contractor?.name && filter.contractor
      ? records[0].contractor.name
      : 'All Contractors';

    // Date range label
    const dateLabel = startDate || endDate
      ? `${startDate ? fmtDate(startDate) : 'Start'} — ${endDate ? fmtDate(endDate) : 'Present'}`
      : 'All Time';

    // ── Build PDF ─────────────────────────────────────────────────────────────
    const doc = createDocument({ autoFirstPage: true });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="issue-report-${Date.now()}.pdf"`);
    doc.pipe(res);

    let pageNum = 1;
    drawWatermark(doc);
    drawHeader(doc, 'CONSTRUCTION STOCK MANAGEMENT SYSTEM', 'ISSUE SUMMARY REPORT', `${records.length} Record(s)`, fmtDate(new Date()));

    // Info section
    let y = 135;
    y = sectionLabel(doc, 'Report Parameters', y);
    y = drawInfoGrid(doc, [
      ['Contractor', contractorLabel],
      ['Date Range', dateLabel],
      ['Total Issues', String(records.length)],
      ['Generated By', req.user.name || '—'],
    ], y);

    y += 12;

    // Summary table — one row per issue
    y = sectionLabel(doc, 'Issues Summary', y);
    y += 2;

    const columns = [
      { label: '#',          weight: 0.5, align: 'center' },
      { label: 'Issue ID',   weight: 2,   align: 'left'   },
      { label: 'Contractor', weight: 2.5, align: 'left'   },
      { label: 'Project',    weight: 2,   align: 'left'   },
      { label: 'Items',      weight: 1,   align: 'center' },
      { label: 'Date',       weight: 2,   align: 'left'   },
    ];

    const tableRows = records.map((r, i) => [
      i + 1,
      r.requestId || '—',
      r.contractor?.name || '—',
      r.project?.name || 'General',
      r.items.length,
      fmtDate(r.createdAt),
    ]);

    // Paginate if needed
    const rowsPerPage = 22;
    let rowIdx = 0;
    while (rowIdx < tableRows.length) {
      const batch = tableRows.slice(rowIdx, rowIdx + rowsPerPage);
      if (rowIdx > 0) {
        drawFooter(doc, pageNum, Math.ceil(tableRows.length / rowsPerPage) + 1);
        doc.addPage();
        pageNum++;
        drawWatermark(doc);
        y = 50;
        y = sectionLabel(doc, 'Issues Summary (continued)', y);
        y += 2;
      }
      y = drawTable(doc, columns, batch, y);
      rowIdx += rowsPerPage;
    }

    // Grand totals
    const totalItems = records.reduce((s, r) => s + r.items.length, 0);
    y = drawTotalsRow(doc, 'TOTAL', `${records.length} issue(s), ${totalItems} material line(s)`, y + 4);

    // Signatures
    y += 18;
    if (y + 130 > PAGE.height - 60) {
      drawFooter(doc, pageNum, pageNum + 1);
      doc.addPage();
      pageNum++;
      drawWatermark(doc);
      y = 50;
    }
    y = sectionLabel(doc, 'Signatures', y);
    y += 10;
    drawSignatures(doc, 'STOCK MANAGER', 'AUTHORIZED SIGNATORY', y);

    drawFooter(doc, pageNum, pageNum);
    doc.end();
  } catch (error) {
    next(error);
  }
};

// ─── BULK PURCHASE REPORT ─────────────────────────────────────────────────────

// @desc  Generate filtered Purchase Report PDF (multiple purchases)
// @route GET /api/reports/purchases
// @access Private (admin, manager only)
const generateBulkPurchaseReport = async (req, res, next) => {
  try {
    const { supplierId, startDate, endDate } = req.query;

    const filter = { type: 'purchase' };

    if (supplierId) filter.supplier = supplierId;

    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        filter.createdAt.$lte = end;
      }
    }

    const transactions = await Transaction.find(filter)
      .populate('material', 'name unit category')
      .populate('performedBy', 'name')
      .populate('supplier', 'name contactPerson')
      .sort({ createdAt: -1 });

    if (transactions.length === 0) {
      return res.status(404).json({ success: false, message: 'No purchase records found for the selected filters' });
    }

    const supplierLabel = transactions[0].supplier?.name && supplierId
      ? transactions[0].supplier.name
      : 'All Suppliers';
    const dateLabel = startDate || endDate
      ? `${startDate ? fmtDate(startDate) : 'Start'} — ${endDate ? fmtDate(endDate) : 'Present'}`
      : 'All Time';

    const doc = createDocument({ autoFirstPage: true });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="purchase-report-${Date.now()}.pdf"`);
    doc.pipe(res);

    let pageNum = 1;
    drawWatermark(doc);
    drawHeader(doc, 'CONSTRUCTION STOCK MANAGEMENT SYSTEM', 'PURCHASE SUMMARY REPORT', `${transactions.length} Record(s)`, fmtDate(new Date()));

    let y = 135;
    y = sectionLabel(doc, 'Report Parameters', y);
    y = drawInfoGrid(doc, [
      ['Supplier', supplierLabel],
      ['Date Range', dateLabel],
      ['Total Purchases', String(transactions.length)],
      ['Generated By', req.user.name || '—'],
    ], y);

    y += 12;
    y = sectionLabel(doc, 'Purchase Details', y);
    y += 2;

    const columns = [
      { label: '#',          weight: 0.5, align: 'center' },
      { label: 'Txn ID',    weight: 2,   align: 'left'   },
      { label: 'Material',  weight: 2.5, align: 'left'   },
      { label: 'Supplier',  weight: 2,   align: 'left'   },
      { label: 'Qty',       weight: 1,   align: 'right'  },
      { label: 'Total (₹)', weight: 1.5, align: 'right'  },
      { label: 'Date',      weight: 2,   align: 'left'   },
    ];

    const tableRows = transactions.map((t, i) => [
      i + 1,
      t.transactionId || '—',
      t.material?.name || '—',
      t.supplier?.name || '—',
      t.quantity,
      fmtCurrency(t.totalPrice),
      fmtDate(t.createdAt),
    ]);

    const rowsPerPage = 20;
    let rowIdx = 0;
    while (rowIdx < tableRows.length) {
      const batch = tableRows.slice(rowIdx, rowIdx + rowsPerPage);
      if (rowIdx > 0) {
        drawFooter(doc, pageNum, Math.ceil(tableRows.length / rowsPerPage) + 1);
        doc.addPage();
        pageNum++;
        drawWatermark(doc);
        y = 50;
        y = sectionLabel(doc, 'Purchase Details (continued)', y);
        y += 2;
      }
      y = drawTable(doc, columns, batch, y);
      rowIdx += rowsPerPage;
    }

    const grandTotal = transactions.reduce((s, t) => s + (t.totalPrice || 0), 0);
    y = drawTotalsRow(doc, 'GRAND TOTAL', fmtCurrency(grandTotal), y + 4);

    y += 18;
    if (y + 130 > PAGE.height - 60) {
      drawFooter(doc, pageNum, pageNum + 1);
      doc.addPage();
      pageNum++;
      drawWatermark(doc);
      y = 50;
    }
    y = sectionLabel(doc, 'Signatures', y);
    y += 10;
    drawSignatures(doc, 'STOCK MANAGER', 'ACCOUNTS DEPARTMENT', y);

    drawFooter(doc, pageNum, pageNum);
    doc.end();
  } catch (error) {
    next(error);
  }
};

// ─── STOCK REPORT ─────────────────────────────────────────────────────────────

// @desc  Generate current stock levels PDF
// @route GET /api/reports/stock
// @access Private (admin, manager only)
const generateStockReport = async (req, res, next) => {
  try {
    const { category } = req.query;

    const filter = { isActive: true };
    if (category) filter.category = category;

    const materials = await Material.find(filter)
      .populate('supplier', 'name')
      .sort({ category: 1, name: 1 });

    if (materials.length === 0) {
      return res.status(404).json({ success: false, message: 'No materials found' });
    }

    const doc = createDocument({ autoFirstPage: true });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="stock-report-${Date.now()}.pdf"`);
    doc.pipe(res);

    let pageNum = 1;
    drawWatermark(doc);
    drawHeader(doc, 'CONSTRUCTION STOCK MANAGEMENT SYSTEM', 'STOCK SUMMARY REPORT', `${materials.length} Material(s)`, fmtDate(new Date()));

    let y = 135;
    const lowStockCount = materials.filter(m => m.quantity <= m.minStockLevel).length;

    y = sectionLabel(doc, 'Stock Overview', y);
    y = drawInfoGrid(doc, [
      ['Total Materials', String(materials.length)],
      ['Low Stock Items', `${lowStockCount} ⚠️`],
      ['Category Filter', category || 'All Categories'],
      ['Generated By', req.user.name || '—'],
    ], y);

    y += 12;
    y = sectionLabel(doc, 'Material Inventory', y);
    y += 2;

    const columns = [
      { label: '#',          weight: 0.5, align: 'center' },
      { label: 'Material',   weight: 3,   align: 'left'   },
      { label: 'Category',   weight: 2,   align: 'left'   },
      { label: 'In Stock',   weight: 1.2, align: 'right'  },
      { label: 'Min Level',  weight: 1.2, align: 'right'  },
      { label: 'Unit',       weight: 1,   align: 'center' },
      { label: 'Status',     weight: 1.2, align: 'center' },
    ];

    const tableRows = materials.map((m, i) => [
      i + 1,
      m.name,
      m.category || '—',
      m.quantity,
      m.minStockLevel,
      m.unit,
      m.quantity <= m.minStockLevel ? 'LOW ⚠️' : 'OK',
    ]);

    const rowsPerPage = 22;
    let rowIdx = 0;
    while (rowIdx < tableRows.length) {
      const batch = tableRows.slice(rowIdx, rowIdx + rowsPerPage);
      if (rowIdx > 0) {
        drawFooter(doc, pageNum, Math.ceil(tableRows.length / rowsPerPage) + 1);
        doc.addPage();
        pageNum++;
        drawWatermark(doc);
        y = 50;
        y = sectionLabel(doc, 'Material Inventory (continued)', y);
        y += 2;
      }
      y = drawTable(doc, columns, batch, y);
      rowIdx += rowsPerPage;
    }

    y = drawTotalsRow(doc, 'TOTAL MATERIALS', `${materials.length} item(s)  |  ${lowStockCount} low-stock`, y + 4);

    drawFooter(doc, pageNum, pageNum);
    doc.end();
  } catch (error) {
    next(error);
  }
};

// ─── SYSTEM SUMMARY REPORT ───────────────────────────────────────────────────

// @desc  Generate executive system summary PDF
// @route GET /api/reports/system-summary
// @access Private (admin only)
const generateSystemSummary = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;

    const dateFilter = {};
    if (startDate || endDate) {
      dateFilter.createdAt = {};
      if (startDate) dateFilter.createdAt.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        dateFilter.createdAt.$lte = end;
      }
    }

    // Aggregate stats
    const [
      totalIssues,
      totalPurchases,
      totalMaterials,
      activeContractors,
      purchaseAgg,
      recentIssues,
      recentPurchases,
    ] = await Promise.all([
      MaterialRequest.countDocuments({ status: 'issued', ...dateFilter }),
      Transaction.countDocuments({ type: 'purchase', ...dateFilter }),
      Material.countDocuments({ isActive: true }),
      User.countDocuments({ role: 'contractor', isActive: true }),
      Transaction.aggregate([
        { $match: { type: 'purchase', ...dateFilter } },
        { $group: { _id: null, totalSpend: { $sum: '$totalPrice' }, totalQty: { $sum: '$quantity' } } },
      ]),
      MaterialRequest.find({ status: 'issued', ...dateFilter })
        .sort({ createdAt: -1 })
        .limit(5)
        .populate('contractor', 'name')
        .populate('project', 'name')
        .lean(),
      Transaction.find({ type: 'purchase', ...dateFilter })
        .sort({ createdAt: -1 })
        .limit(5)
        .populate('material', 'name')
        .populate('supplier', 'name')
        .lean(),
    ]);

    const totalSpend = purchaseAgg[0]?.totalSpend || 0;
    const lowStockCount = await Material.countDocuments({
      isActive: true,
      $expr: { $lte: ['$quantity', '$minStockLevel'] },
    });

    const dateLabel = startDate || endDate
      ? `${startDate ? fmtDate(startDate) : 'Start'} — ${endDate ? fmtDate(endDate) : 'Present'}`
      : 'All Time';

    // ── Build PDF ─────────────────────────────────────────────────────────────
    const doc = createDocument({ autoFirstPage: true });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="system-summary-${Date.now()}.pdf"`);
    doc.pipe(res);

    drawWatermark(doc);
    drawHeader(doc, 'CONSTRUCTION STOCK MANAGEMENT SYSTEM', 'EXECUTIVE SYSTEM SUMMARY', 'ADMIN REPORT', fmtDate(new Date()));

    let y = 135;
    y = sectionLabel(doc, 'Report Period', y);
    y = drawInfoGrid(doc, [
      ['Period', dateLabel],
      ['Generated By', req.user.name || 'Admin'],
      ['Report Date', fmtDate(new Date())],
      ['System', 'CMMS v1.0'],
    ], y);

    y += 12;

    // Key metrics
    y = sectionLabel(doc, 'Key Metrics', y);
    y += 2;

    const metricsColumns = [
      { label: 'Metric',       weight: 4, align: 'left'  },
      { label: 'Value',        weight: 3, align: 'right' },
    ];

    const metricsRows = [
      ['Total Issues (Issued)', String(totalIssues)],
      ['Total Purchase Transactions', String(totalPurchases)],
      ['Total Purchase Spend', fmtCurrency(totalSpend)],
      ['Active Materials in Inventory', String(totalMaterials)],
      ['Low Stock Alerts', `${lowStockCount} item(s)`],
      ['Active Contractors', String(activeContractors)],
    ];

    y = drawTable(doc, metricsColumns, metricsRows, y);
    y += 18;

    // Recent Issues
    if (recentIssues.length > 0) {
      y = sectionLabel(doc, 'Recent Issues (Last 5)', y);
      y += 2;
      const issueColumns = [
        { label: '#',          weight: 0.5, align: 'center' },
        { label: 'Issue ID',   weight: 2,   align: 'left'   },
        { label: 'Contractor', weight: 2.5, align: 'left'   },
        { label: 'Project',    weight: 2,   align: 'left'   },
        { label: 'Date',       weight: 2,   align: 'left'   },
      ];
      const issueRows = recentIssues.map((r, i) => [
        i + 1,
        r.requestId || '—',
        r.contractor?.name || '—',
        r.project?.name || 'General',
        fmtDate(r.createdAt),
      ]);
      y = drawTable(doc, issueColumns, issueRows, y);
      y += 18;
    }

    // Recent Purchases
    if (recentPurchases.length > 0) {
      if (y + 150 > PAGE.height - 60) {
        drawFooter(doc, 1, 2);
        doc.addPage();
        drawWatermark(doc);
        y = 50;
      }
      y = sectionLabel(doc, 'Recent Purchases (Last 5)', y);
      y += 2;
      const purColumns = [
        { label: '#',          weight: 0.5, align: 'center' },
        { label: 'Txn ID',    weight: 2,   align: 'left'   },
        { label: 'Material',  weight: 2.5, align: 'left'   },
        { label: 'Supplier',  weight: 2,   align: 'left'   },
        { label: 'Date',      weight: 2,   align: 'left'   },
      ];
      const purRows = recentPurchases.map((t, i) => [
        i + 1,
        t.transactionId || '—',
        t.material?.name || '—',
        t.supplier?.name || '—',
        fmtDate(t.createdAt),
      ]);
      y = drawTable(doc, purColumns, purRows, y);
    }

    drawFooter(doc, 1, 1);
    doc.end();
  } catch (error) {
    next(error);
  }
};

module.exports = {
  generateIssueReport,
  generatePurchaseReport,
  generateBulkIssueReport,
  generateBulkPurchaseReport,
  generateStockReport,
  generateSystemSummary,
};

// ── Company-Level Reports (Admin Only) ────────────────────────────────────────

// Helper to init document
const initCompanyReport = (res, title, filename) => {
  const doc = createDocument();
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  doc.pipe(res);
  drawWatermark(doc);
  drawHeader(doc, 'COMPANY OVERVIEW', title, `REP-${Date.now().toString().slice(-6)}`, fmtDate(new Date()));
  return doc;
};

// 1. Branch Performance Report
const generateCompanyBranchPerformance = async (req, res, next) => {
  try {
    const { startDate, endDate, branchId } = req.query;
    const doc = initCompanyReport(res, 'Branch Performance Report', 'branch-performance.pdf');

    let dateMatch = {};
    if (startDate && endDate) {
      dateMatch = { createdAt: { $gte: new Date(startDate), $lte: new Date(endDate + 'T23:59:59.999Z') } };
    }
    
    let branchMatch = { status: 'active' };
    if (branchId) {
      branchMatch._id = new require('mongoose').Types.ObjectId(branchId);
    }

    const branches = await Branch.find(branchMatch);
    
    let y = 140;
    y = sectionLabel(doc, 'Branch Comparison Overview', y);
    y += 5;

    const columns = [
      { label: 'Branch Name', weight: 2 },
      { label: 'Purchase Value', weight: 1.5, align: 'right' },
      { label: 'Consumption (Issue) Value', weight: 1.5, align: 'right' },
      { label: 'Current Stock Value', weight: 1.5, align: 'right' },
    ];

    const rows = [];
    let totalPurchases = 0;
    let totalIssues = 0;
    let totalStock = 0;

    for (const branch of branches) {
      const bid = branch._id;
      
      const purchaseData = await Transaction.aggregate([
        { $match: { type: 'purchase', branchId: bid, ...dateMatch } },
        { $group: { _id: null, total: { $sum: '$totalPrice' } } }
      ]);
      const pVal = purchaseData[0]?.total || 0;
      
      const issueData = await Transaction.aggregate([
        { $match: { type: 'issue', branchId: bid, ...dateMatch } },
        { $group: { _id: null, total: { $sum: '$totalPrice' } } }
      ]);
      const iVal = issueData[0]?.total || 0;
      
      const stockData = await Material.aggregate([
        { $match: { isActive: true, branchId: bid } },
        { $group: { _id: null, total: { $sum: { $multiply: ['$quantity', '$purchasePrice'] } } } }
      ]);
      const sVal = stockData[0]?.total || 0;

      rows.push([
        branch.branchName,
        fmtCurrency(pVal),
        fmtCurrency(iVal),
        fmtCurrency(sVal)
      ]);
      
      totalPurchases += pVal;
      totalIssues += iVal;
      totalStock += sVal;
    }

    y = drawTable(doc, columns, rows, y);
    
    // Custom totals row
    doc.rect(PAGE.margin, y, PAGE.width - PAGE.margin * 2, 22).fill(COLORS.total);
    doc.font(FONT.bold).fontSize(9).fillColor(COLORS.white);
    
    const tableW = PAGE.width - PAGE.margin * 2;
    const colWidths = columns.map(c => (c.weight / 6.5) * tableW);
    let x = PAGE.margin;
    
    doc.text('TOTAL', x + 6, y + 6, { width: colWidths[0] - 10 });
    x += colWidths[0];
    doc.text(fmtCurrency(totalPurchases), x + 6, y + 6, { width: colWidths[1] - 10, align: 'right' });
    x += colWidths[1];
    doc.text(fmtCurrency(totalIssues), x + 6, y + 6, { width: colWidths[2] - 10, align: 'right' });
    x += colWidths[2];
    doc.text(fmtCurrency(totalStock), x + 6, y + 6, { width: colWidths[3] - 10, align: 'right' });

    drawFooter(doc, 1, 1);
    doc.end();
  } catch (err) {
    next(err);
  }
};

// 2. Company Purchase Overview
const generateCompanyPurchaseOverview = async (req, res, next) => {
  try {
    const { startDate, endDate, branchId } = req.query;
    const doc = initCompanyReport(res, 'Company Purchase Overview', 'purchase-overview.pdf');

    let dateMatch = {};
    if (startDate && endDate) {
      dateMatch = { createdAt: { $gte: new Date(startDate), $lte: new Date(endDate + 'T23:59:59.999Z') } };
    }
    
    let branchMatch = {};
    if (branchId) branchMatch.branchId = new require('mongoose').Types.ObjectId(branchId);

    // Total Purchases
    const totalPurchasesAgg = await Transaction.aggregate([
      { $match: { type: 'purchase', ...dateMatch, ...branchMatch } },
      { $group: { _id: null, total: { $sum: '$totalPrice' }, count: { $sum: 1 } } }
    ]);
    const totalPurchases = totalPurchasesAgg[0]?.total || 0;
    const totalCount = totalPurchasesAgg[0]?.count || 0;

    // Top Purchasing Branch
    const topBranchAgg = await Transaction.aggregate([
      { $match: { type: 'purchase', ...dateMatch, ...branchMatch } },
      { $group: { _id: '$branchId', total: { $sum: '$totalPrice' } } },
      { $sort: { total: -1 } },
      { $limit: 1 },
      { $lookup: { from: 'branches', localField: '_id', foreignField: '_id', as: 'branch' } },
      { $unwind: '$branch' }
    ]);
    const topBranch = topBranchAgg[0]?.branch.branchName || 'N/A';

    // Most Purchased Material
    const topMatAgg = await Transaction.aggregate([
      { $match: { type: 'purchase', ...dateMatch, ...branchMatch } },
      { $group: { _id: '$material', totalQty: { $sum: '$quantity' } } },
      { $sort: { totalQty: -1 } },
      { $limit: 1 },
      { $lookup: { from: 'materials', localField: '_id', foreignField: '_id', as: 'material' } },
      { $unwind: '$material' }
    ]);
    const topMaterial = topMatAgg[0]?.material.name || 'N/A';

    let y = 140;
    y = sectionLabel(doc, 'Purchase Summary', y);
    y = drawInfoGrid(doc, [
      ['Total Purchase Value', fmtCurrency(totalPurchases)],
      ['Total Transactions', totalCount.toString()],
      ['Top Purchasing Branch', topBranch],
      ['Most Purchased Material (Qty)', topMaterial],
    ], y);
    y += 15;

    // Monthly Purchase Trend
    y = sectionLabel(doc, 'Branch-wise Purchase Contribution', y);
    y += 5;

    const branchPurchases = await Transaction.aggregate([
      { $match: { type: 'purchase', ...dateMatch, ...branchMatch } },
      { $group: { _id: '$branchId', total: { $sum: '$totalPrice' } } },
      { $sort: { total: -1 } },
      { $lookup: { from: 'branches', localField: '_id', foreignField: '_id', as: 'branch' } },
      { $unwind: '$branch' }
    ]);

    const columns = [
      { label: 'Branch Name', weight: 2 },
      { label: 'Purchase Value', weight: 1.5, align: 'right' },
      { label: 'Contribution %', weight: 1, align: 'right' }
    ];

    const rows = branchPurchases.map(bp => {
      const pct = totalPurchases > 0 ? ((bp.total / totalPurchases) * 100).toFixed(1) + '%' : '0%';
      return [bp.branch.branchName, fmtCurrency(bp.total), pct];
    });

    if (rows.length === 0) rows.push(['No purchase data found', '', '']);
    
    y = drawTable(doc, columns, rows, y);

    drawFooter(doc, 1, 1);
    doc.end();
  } catch (err) {
    next(err);
  }
};

// 3. Material Consumption Report
const generateCompanyMaterialConsumption = async (req, res, next) => {
  try {
    const { startDate, endDate, branchId } = req.query;
    const doc = initCompanyReport(res, 'Material Consumption Report', 'material-consumption.pdf');

    let dateMatch = {};
    if (startDate && endDate) {
      dateMatch = { createdAt: { $gte: new Date(startDate), $lte: new Date(endDate + 'T23:59:59.999Z') } };
    }
    
    let branchMatch = {};
    if (branchId) branchMatch.branchId = new require('mongoose').Types.ObjectId(branchId);

    // Top Consumed Materials (Global)
    const topMaterials = await Transaction.aggregate([
      { $match: { type: 'issue', ...dateMatch, ...branchMatch } },
      { $group: { _id: '$material', totalQty: { $sum: '$quantity' }, totalValue: { $sum: '$totalPrice' } } },
      { $sort: { totalQty: -1 } },
      { $limit: 15 },
      { $lookup: { from: 'materials', localField: '_id', foreignField: '_id', as: 'mat' } },
      { $unwind: '$mat' }
    ]);

    let y = 140;
    y = sectionLabel(doc, 'Top 15 Consumed Materials Across Company', y);
    y += 5;

    const columns = [
      { label: 'Material', weight: 2 },
      { label: 'Category', weight: 1.5 },
      { label: 'Total Quantity Issued', weight: 1.5, align: 'right' },
      { label: 'Estimated Value', weight: 1.5, align: 'right' }
    ];

    const rows = topMaterials.map(tm => [
      tm.mat.name,
      tm.mat.category,
      `${tm.totalQty} ${tm.mat.unit}`,
      fmtCurrency(tm.totalValue)
    ]);
    
    if (rows.length === 0) rows.push(['No consumption data found', '', '', '']);

    y = drawTable(doc, columns, rows, y);

    drawFooter(doc, 1, 1);
    doc.end();
  } catch (err) {
    next(err);
  }
};

// 4. Branch-wise Stock Summary
const generateCompanyStockSummary = async (req, res, next) => {
  try {
    const doc = initCompanyReport(res, 'Company Stock Summary', 'stock-summary.pdf');

    const branches = await Branch.find({ status: 'active' });
    
    let y = 140;
    y = sectionLabel(doc, 'Branch-wise Stock Distribution', y);
    y += 5;

    const columns = [
      { label: 'Branch Name', weight: 2 },
      { label: 'Total Items (SKUs)', weight: 1.5, align: 'center' },
      { label: 'Low Stock Items', weight: 1.5, align: 'center' },
      { label: 'Total Stock Value', weight: 1.5, align: 'right' },
    ];

    const rows = [];
    let totalStockVal = 0;
    let totalLowStock = 0;

    for (const branch of branches) {
      const bid = branch._id;
      
      const totalItemsAgg = await Material.countDocuments({ branchId: bid, isActive: true });
      const lowStockAgg = await Material.countDocuments({ branchId: bid, isActive: true, $expr: { $lte: ['$quantity', '$minStockLevel'] } });
      
      const stockValAgg = await Material.aggregate([
        { $match: { branchId: bid, isActive: true } },
        { $group: { _id: null, total: { $sum: { $multiply: ['$quantity', '$purchasePrice'] } } } }
      ]);
      const sVal = stockValAgg[0]?.total || 0;

      rows.push([
        branch.branchName,
        totalItemsAgg.toString(),
        lowStockAgg.toString(),
        fmtCurrency(sVal)
      ]);
      
      totalStockVal += sVal;
      totalLowStock += lowStockAgg;
    }

    y = drawTable(doc, columns, rows, y);
    
    // Custom totals row
    doc.rect(PAGE.margin, y, PAGE.width - PAGE.margin * 2, 22).fill(COLORS.total);
    doc.font(FONT.bold).fontSize(9).fillColor(COLORS.white);
    
    const tableW = PAGE.width - PAGE.margin * 2;
    const colWidths = columns.map(c => (c.weight / 6.5) * tableW);
    let x = PAGE.margin;
    
    doc.text('TOTAL COMPANY STOCK', x + 6, y + 6, { width: colWidths[0] - 10 });
    x += colWidths[0];
    doc.text('—', x + 6, y + 6, { width: colWidths[1] - 10, align: 'center' });
    x += colWidths[1];
    doc.text(totalLowStock.toString(), x + 6, y + 6, { width: colWidths[2] - 10, align: 'center' });
    x += colWidths[2];
    doc.text(fmtCurrency(totalStockVal), x + 6, y + 6, { width: colWidths[3] - 10, align: 'right' });

    drawFooter(doc, 1, 1);
    doc.end();
  } catch (err) {
    next(err);
  }
};

// 5. Executive Summary Report
const generateCompanyExecutiveSummary = async (req, res, next) => {
  try {
    const doc = initCompanyReport(res, 'Company Executive Summary', 'executive-summary.pdf');

    const totalBranches = await Branch.countDocuments();
    const activeBranches = await Branch.countDocuments({ status: 'active' });
    
    const stockValAgg = await Material.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: null, total: { $sum: { $multiply: ['$quantity', '$purchasePrice'] } } } }
    ]);
    const totalStockVal = stockValAgg[0]?.total || 0;

    const now = new Date();
    const thirtyDaysAgo = new Date(now.setDate(now.getDate() - 30));

    const thirtyDaysPurchase = await Transaction.aggregate([
      { $match: { type: 'purchase', createdAt: { $gte: thirtyDaysAgo } } },
      { $group: { _id: null, total: { $sum: '$totalPrice' } } }
    ]);
    
    const thirtyDaysIssue = await Transaction.aggregate([
      { $match: { type: 'issue', createdAt: { $gte: thirtyDaysAgo } } },
      { $group: { _id: null, total: { $sum: '$totalPrice' } } }
    ]);

    let y = 140;
    y = sectionLabel(doc, 'System Overview', y);
    y = drawInfoGrid(doc, [
      ['Total Branches', totalBranches.toString()],
      ['Active Branches', activeBranches.toString()],
      ['Total Company Stock Value', fmtCurrency(totalStockVal)],
      ['Business Movement (Last 30 Days)', fmtCurrency((thirtyDaysPurchase[0]?.total || 0) + (thirtyDaysIssue[0]?.total || 0))],
    ], y);
    y += 15;

    // Active branches breakdown
    y = sectionLabel(doc, 'Active Branches Breakdown', y);
    y += 5;

    const branches = await Branch.find({ status: 'active' }).populate('managerId', 'name');
    const columns = [
      { label: 'Branch Name', weight: 2 },
      { label: 'Location', weight: 1.5 },
      { label: 'Manager', weight: 1.5 },
      { label: 'Created On', weight: 1 }
    ];
    
    const rows = branches.map(b => [
      b.branchName,
      b.location,
      b.managerId?.name || 'Unassigned',
      fmtDate(b.createdAt)
    ]);
    
    if (rows.length === 0) rows.push(['No branches found', '', '', '']);

    y = drawTable(doc, columns, rows, y);

    drawFooter(doc, 1, 1);
    doc.end();
  } catch (err) {
    next(err);
  }
};

module.exports = {
  generateIssueReport,
  generatePurchaseReport,
  generateBulkIssueReport,
  generateBulkPurchaseReport,
  generateStockReport,
  generateSystemSummary,
  generateCompanyBranchPerformance,
  generateCompanyPurchaseOverview,
  generateCompanyMaterialConsumption,
  generateCompanyStockSummary,
  generateCompanyExecutiveSummary,
};
