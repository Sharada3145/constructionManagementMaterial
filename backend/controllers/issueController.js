const MaterialRequest = require('../models/MaterialRequest');
const Material = require('../models/Material');
const Transaction = require('../models/Transaction');
const User = require('../models/User');
const { getBranchFilter } = require('../middleware/auth');

// @desc    Manager directly issues materials to a contractor (no approval step)
// @route   POST /api/requests/issue
// @access  Private (admin, manager)
const issueMaterials = async (req, res, next) => {
  try {
    const { contractor: contractorId, project, priority, notes, items } = req.body;

    if (!contractorId) {
      return res.status(400).json({ success: false, message: 'Contractor is required' });
    }

    if (!items || items.length === 0) {
      return res.status(400).json({ success: false, message: 'At least one material item is required' });
    }

    // Determine the branchId for this operation
    const branchId = req.user.role === 'admin'
      ? (req.body.branchId || req.headers['x-branch-id'] || req.user.branchId?._id || req.user.branchId)
      : (req.user.branchId?._id || req.user.branchId);

    // Validate contractor exists and is a contractor role
    const contractor = await User.findById(contractorId);
    if (!contractor || contractor.role !== 'contractor') {
      return res.status(400).json({ success: false, message: 'Invalid contractor selected' });
    }

    // Non-admin: ensure contractor belongs to same branch
    if (req.user.role !== 'admin' && branchId) {
      const contractorBranch = contractor.branchId?.toString();
      if (contractorBranch && contractorBranch !== branchId.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Cannot issue materials to a contractor from a different branch',
        });
      }
    }

    const branchFilter = getBranchFilter(req);

    // Validate all materials exist, belong to branch, and have sufficient stock
    for (const item of items) {
      const material = await Material.findOne({ _id: item.material, ...branchFilter });
      if (!material) {
        return res.status(400).json({ success: false, message: `Material not found in your branch` });
      }
      if (material.quantity < item.requestedQuantity) {
        return res.status(400).json({
          success: false,
          message: `Insufficient stock for "${material.name}". Available: ${material.quantity} ${material.unit}, Requested: ${item.requestedQuantity}`,
        });
      }
    }

    // Create the MaterialRequest record with status = 'issued' directly
    const issueRecord = await MaterialRequest.create({
      contractor: contractorId,
      project: project || undefined,
      priority: priority || 'medium',
      notes,
      status: 'issued',
      reviewedBy: req.user._id,
      reviewedAt: new Date(),
      branchId,
      items: items.map(item => ({
        material: item.material,
        requestedQuantity: item.requestedQuantity,
        approvedQuantity: item.requestedQuantity,
        unit: item.unit,
      })),
    });

    // Deduct stock and create Transaction records for each item
    for (const item of items) {
      const material = await Material.findById(item.material);
      const previousStock = material.quantity;
      material.quantity = Math.max(0, material.quantity - item.requestedQuantity);
      await material.save();

      await Transaction.create({
        type: 'issue',
        material: material._id,
        quantity: item.requestedQuantity,
        unit: item.unit || material.unit,
        unitPrice: material.purchasePrice || 0,
        totalPrice: (material.purchasePrice || 0) * item.requestedQuantity,
        previousStock,
        newStock: material.quantity,
        materialRequest: issueRecord._id,
        project: project || undefined,
        performedBy: req.user._id,
        branchId,
        notes: `Issued to ${contractor.name} — ${issueRecord.requestId}`,
      });
    }

    const populated = await MaterialRequest.findById(issueRecord._id)
      .populate('contractor', 'name email phone')
      .populate('items.material', 'name unit category quantity')
      .populate('project', 'name')
      .populate('reviewedBy', 'name')
      .populate('branchId', 'branchName location');

    res.status(201).json({
      success: true,
      message: `Materials issued successfully to ${contractor.name}`,
      data: populated,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get list of users (filtered by role, for manager dropdown)
// @route   GET /api/users?role=contractor
// @access  Private (admin, manager)
const getUsers = async (req, res, next) => {
  try {
    const { role } = req.query;
    const query = { isActive: true };
    if (role) query.role = role;

    // Non-admin: only see users from same branch
    if (req.user.role !== 'admin') {
      const userBranchId = req.user.branchId?._id || req.user.branchId;
      if (userBranchId) query.branchId = userBranchId;
    }

    const users = await User.find(query).select('_id name email phone role branchId')
      .populate('branchId', 'branchName location')
      .sort('name');
    res.status(200).json({ success: true, count: users.length, data: users });
  } catch (error) {
    next(error);
  }
};

module.exports = { issueMaterials, getUsers };
