const MaterialRequest = require('../models/MaterialRequest');
const Material = require('../models/Material');
const Transaction = require('../models/Transaction');
const { getBranchFilter } = require('../middleware/auth');

// @desc    Create a new material request (contractor)
// @route   POST /api/requests
// @access  Private (contractor)
const createRequest = async (req, res, next) => {
  try {
    const { items, project, priority, notes } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({ success: false, message: 'At least one item is required' });
    }

    const branchFilter = getBranchFilter(req);

    // Validate that all materials exist and belong to this branch
    for (const item of items) {
      const material = await Material.findOne({ _id: item.material, ...branchFilter });
      if (!material) {
        return res.status(400).json({
          success: false,
          message: `Material with ID ${item.material} not found in your branch`,
        });
      }
    }

    const branchId = req.user.branchId?._id || req.user.branchId;

    const request = await MaterialRequest.create({
      contractor: req.user._id,
      branchId,
      items,
      project,
      priority: priority || 'medium',
      notes,
    });

    const populated = await MaterialRequest.findById(request._id)
      .populate('contractor', 'name email')
      .populate('items.material', 'name unit category')
      .populate('project', 'name')
      .populate('branchId', 'branchName location');

    res.status(201).json({
      success: true,
      message: 'Material request submitted successfully',
      data: populated,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all requests (with filters)
// @route   GET /api/requests
// @access  Private
const getRequests = async (req, res, next) => {
  try {
    const { status, page = 1, limit = 20, sort = '-createdAt' } = req.query;

    const query = { ...getBranchFilter(req) };

    // Contractors only see their own requests
    if (req.user.role === 'contractor') {
      query.contractor = req.user._id;
    }

    if (status) {
      query.status = status;
    }

    const total = await MaterialRequest.countDocuments(query);
    const requests = await MaterialRequest.find(query)
      .populate('contractor', 'name email phone')
      .populate('items.material', 'name unit category quantity')
      .populate('project', 'name')
      .populate('reviewedBy', 'name')
      .populate('branchId', 'branchName location')
      .sort(sort)
      .skip((parseInt(page) - 1) * parseInt(limit))
      .limit(parseInt(limit));

    res.status(200).json({
      success: true,
      count: requests.length,
      total,
      totalPages: Math.ceil(total / parseInt(limit)),
      currentPage: parseInt(page),
      data: requests,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single request
// @route   GET /api/requests/:id
// @access  Private
const getRequest = async (req, res, next) => {
  try {
    const request = await MaterialRequest.findById(req.params.id)
      .populate('contractor', 'name email phone')
      .populate('items.material', 'name unit category quantity')
      .populate('project', 'name')
      .populate('reviewedBy', 'name')
      .populate('branchId', 'branchName location');

    if (!request) {
      return res.status(404).json({ success: false, message: 'Request not found' });
    }

    // Contractors can only see their own
    if (req.user.role === 'contractor' && request.contractor._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    // Non-admin users cannot access other branches
    if (req.user.role !== 'admin' && request.branchId && request.branchId._id.toString() !== (req.user.branchId?._id || req.user.branchId)?.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized for this branch' });
    }

    res.status(200).json({ success: true, data: request });
  } catch (error) {
    next(error);
  }
};

// @desc    Approve / Reject / Modify a request (manager, admin)
// @route   PUT /api/requests/:id/status
// @access  Private (manager, admin)
const updateRequestStatus = async (req, res, next) => {
  try {
    const { status, items, rejectionReason } = req.body;

    const request = await MaterialRequest.findById(req.params.id);
    if (!request) {
      return res.status(404).json({ success: false, message: 'Request not found' });
    }

    if (!['approved', 'rejected', 'partially_approved', 'issued'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status' });
    }

    // Update approved quantities if provided
    if (items && items.length > 0) {
      for (const updatedItem of items) {
        const existingItem = request.items.id(updatedItem._id);
        if (existingItem) {
          existingItem.approvedQuantity = updatedItem.approvedQuantity;
        }
      }
    } else if (status === 'approved') {
      // Auto-fill approved quantities to match requested
      for (const item of request.items) {
        item.approvedQuantity = item.requestedQuantity;
      }
    }

    request.status = status;
    request.reviewedBy = req.user._id;
    request.reviewedAt = new Date();

    if (status === 'rejected') {
      request.rejectionReason = rejectionReason || 'No reason provided';
    }

    const branchId = request.branchId;

    // If approved or issued, create transactions and decrement stock
    if (status === 'approved' || status === 'issued') {
      for (const item of request.items) {
        const qty = item.approvedQuantity || item.requestedQuantity;
        if (qty <= 0) continue;

        const material = await Material.findById(item.material);
        if (!material) continue;

        const previousStock = material.quantity;
        material.quantity = Math.max(0, material.quantity - qty);
        await material.save();

        await Transaction.create({
          type: 'issue',
          material: material._id,
          quantity: qty,
          unit: item.unit || material.unit,
          previousStock,
          newStock: material.quantity,
          materialRequest: request._id,
          project: request.project,
          performedBy: req.user._id,
          branchId,
          notes: `Issued for request ${request.requestId}`,
        });
      }

      if (status === 'approved') {
        request.status = 'issued';
      }
    }

    await request.save();

    const populated = await MaterialRequest.findById(request._id)
      .populate('contractor', 'name email')
      .populate('items.material', 'name unit category quantity')
      .populate('project', 'name')
      .populate('reviewedBy', 'name')
      .populate('branchId', 'branchName location');

    res.status(200).json({
      success: true,
      message: `Request ${status}`,
      data: populated,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { createRequest, getRequests, getRequest, updateRequestStatus };
