const MaterialTransfer = require('../models/MaterialTransfer');
const Material = require('../models/Material');
const Transaction = require('../models/Transaction');
const Branch = require('../models/Branch');

// @desc    Get all transfers
// @route   GET /api/transfers
// @access  Private
const getTransfers = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, sort = '-createdAt' } = req.query;

    const query = {};

    // Manager can only see transfers involving their branch
    if (req.user.role !== 'admin') {
      const branchId = req.user.branchId?._id || req.user.branchId;
      query.$or = [{ fromBranch: branchId }, { toBranch: branchId }];
    }

    const total = await MaterialTransfer.countDocuments(query);
    const transfers = await MaterialTransfer.find(query)
      .populate('fromBranch', 'branchName location isCentralWarehouse')
      .populate('toBranch', 'branchName location')
      .populate('items.material', 'name unit')
      .populate('requestedBy', 'name')
      .populate('approvedBy', 'name')
      .sort(sort)
      .skip((parseInt(page) - 1) * parseInt(limit))
      .limit(parseInt(limit));

    res.status(200).json({
      success: true,
      count: transfers.length,
      total,
      totalPages: Math.ceil(total / parseInt(limit)),
      currentPage: parseInt(page),
      data: transfers,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create a transfer (direct distribution from warehouse)
// @route   POST /api/transfers
// @access  Private (admin)
const createTransfer = async (req, res, next) => {
  try {
    const { toBranch, items, notes } = req.body;

    const centralWarehouse = await Branch.findOne({ isCentralWarehouse: true });
    if (!centralWarehouse) {
      return res.status(400).json({ success: false, message: 'Central Warehouse not configured.' });
    }

    if (toBranch === centralWarehouse._id.toString()) {
      return res.status(400).json({ success: false, message: 'Cannot transfer to Central Warehouse from Central Warehouse' });
    }

    // Process the transfer immediately (as requested by 'Admin creates and sends')
    // In a real robust system, this might be a multi-step transaction.

    const transfer = new MaterialTransfer({
      fromBranch: centralWarehouse._id,
      toBranch,
      items,
      notes,
      status: 'approved',
      requestedBy: req.user._id,
      approvedBy: req.user._id,
      approvedAt: Date.now(),
    });

    for (let item of items) {
      // Find material in central warehouse
      const warehouseMaterial = await Material.findOne({ _id: item.material, branchId: centralWarehouse._id });
      if (!warehouseMaterial || warehouseMaterial.quantity < item.quantity) {
        return res.status(400).json({
          success: false,
          message: `Insufficient stock in Central Warehouse for material ID: ${item.material}`,
        });
      }

      // Deduct from warehouse
      const warehousePrevious = warehouseMaterial.quantity;
      warehouseMaterial.quantity -= item.quantity;
      await warehouseMaterial.save();

      // Transaction out
      await Transaction.create({
        type: 'transfer',
        material: warehouseMaterial._id,
        quantity: item.quantity,
        unit: item.unit || warehouseMaterial.unit,
        previousStock: warehousePrevious,
        newStock: warehouseMaterial.quantity,
        fromBranch: centralWarehouse._id,
        toBranch: toBranch,
        branchId: centralWarehouse._id, // Context of the transaction
        performedBy: req.user._id,
        notes: `Transferred OUT to branch ${toBranch}`,
      });

      // Add to branch stock
      // Look for the same material (by name) in the destination branch
      let branchMaterial = await Material.findOne({ name: warehouseMaterial.name, branchId: toBranch });
      let branchPrevious = 0;

      if (!branchMaterial) {
        // Create it if it doesn't exist in the branch
        branchMaterial = await Material.create({
          name: warehouseMaterial.name,
          category: warehouseMaterial.category,
          unit: warehouseMaterial.unit,
          quantity: item.quantity,
          minStockLevel: warehouseMaterial.minStockLevel,
          purchasePrice: warehouseMaterial.purchasePrice,
          description: warehouseMaterial.description,
          branchId: toBranch,
        });
      } else {
        branchPrevious = branchMaterial.quantity;
        branchMaterial.quantity += item.quantity;
        await branchMaterial.save();
      }

      // Transaction in
      await Transaction.create({
        type: 'transfer',
        material: branchMaterial._id,
        quantity: item.quantity,
        unit: item.unit || branchMaterial.unit,
        previousStock: branchPrevious,
        newStock: branchMaterial.quantity,
        fromBranch: centralWarehouse._id,
        toBranch: toBranch,
        branchId: toBranch, // Context of the transaction
        performedBy: req.user._id,
        notes: `Transferred IN from Central Warehouse`,
      });
    }

    await transfer.save();

    res.status(201).json({
      success: true,
      message: 'Materials transferred successfully',
      data: transfer,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getTransfers,
  createTransfer,
};
