const Transaction = require('../models/Transaction');
const Material = require('../models/Material');
const { getBranchFilter } = require('../middleware/auth');

// @desc    Get all transactions (with filters)
// @route   GET /api/transactions
// @access  Private
const getTransactions = async (req, res, next) => {
  try {
    const { type, material, supplier, startDate, endDate, page = 1, limit = 20, sort = '-createdAt' } = req.query;

    const query = { ...getBranchFilter(req) };

    // Contractors can only see transactions from their own issued records
    if (req.user.role === 'contractor') {
      const MaterialRequest = require('../models/MaterialRequest');
      const myRequests = await MaterialRequest.find({ contractor: req.user._id }).select('_id');
      const myRequestIds = myRequests.map(r => r._id);
      query.materialRequest = { $in: myRequestIds };
      query.type = 'issue'; // contractors only see issues, not purchases
    }

    if (type && req.user.role !== 'contractor') query.type = type;
    if (material) query.material = material;
    if (supplier) query.supplier = supplier;

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    const total = await Transaction.countDocuments(query);
    const transactions = await Transaction.find(query)
      .populate('material', 'name unit category')
      .populate('performedBy', 'name email')
      .populate({ path: 'materialRequest', select: 'requestId contractor', populate: { path: 'contractor', select: 'name' } })
      .populate('project', 'name')
      .populate('supplier', 'name')
      .populate('branchId', 'branchName location isCentralWarehouse')
      .populate('fromBranch', 'branchName location')
      .populate('toBranch', 'branchName location')
      .sort(sort)
      .skip((parseInt(page) - 1) * parseInt(limit))
      .limit(parseInt(limit));

    res.status(200).json({
      success: true,
      count: transactions.length,
      total,
      totalPages: Math.ceil(total / parseInt(limit)),
      currentPage: parseInt(page),
      data: transactions,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create a purchase transaction (adds stock)
// @route   POST /api/transactions/purchase
// @access  Private (admin, central warehouse only)
const createPurchase = async (req, res, next) => {
  try {
    const { material: materialId, quantity, unit, supplier, invoiceNumber, unitPrice, notes } = req.body;

    const Branch = require('../models/Branch');
    const centralWarehouse = await Branch.findOne({ isCentralWarehouse: true });
    if (!centralWarehouse) {
      return res.status(400).json({ success: false, message: 'Central Warehouse not configured.' });
    }
    const branchId = centralWarehouse._id;

    const material = await Material.findById(materialId);
    if (!material) {
      return res.status(404).json({ success: false, message: 'Material not found' });
    }

    const previousStock = material.quantity;
    material.quantity += quantity;
    if (unitPrice) material.purchasePrice = unitPrice;
    await material.save();

    const transaction = await Transaction.create({
      type: 'purchase',
      material: materialId,
      quantity,
      unit: unit || material.unit,
      previousStock,
      newStock: material.quantity,
      performedBy: req.user._id,
      supplier,
      invoiceNumber,
      unitPrice: unitPrice || 0,
      totalPrice: (unitPrice || 0) * quantity,
      branchId,
      notes,
    });

    const populated = await Transaction.findById(transaction._id)
      .populate('material', 'name unit category quantity')
      .populate('performedBy', 'name')
      .populate('supplier', 'name')
      .populate('branchId', 'branchName location');

    res.status(201).json({
      success: true,
      message: 'Purchase recorded and stock updated',
      data: populated,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single transaction
// @route   GET /api/transactions/:id
// @access  Private
const getTransaction = async (req, res, next) => {
  try {
    const transaction = await Transaction.findById(req.params.id)
      .populate('material', 'name unit category')
      .populate('performedBy', 'name email')
      .populate('materialRequest', 'requestId')
      .populate('project', 'name')
      .populate('supplier', 'name')
      .populate('branchId', 'branchName location')
      .populate('fromBranch', 'branchName location')
      .populate('toBranch', 'branchName location');

    if (!transaction) {
      return res.status(404).json({ success: false, message: 'Transaction not found' });
    }

    res.status(200).json({ success: true, data: transaction });
  } catch (error) {
    next(error);
  }
};

module.exports = { getTransactions, createPurchase, getTransaction };
