const express = require('express');
const User = require('../models/User');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();
router.use(protect);

// GET /api/users — list users (Admin or Manager with restrictions)
router.get('/', authorize('admin', 'manager'), async (req, res, next) => {
  try {
    const { role, branchId } = req.query;
    const filter = { isActive: true };
    if (role) filter.role = role;

    let targetBranchId = branchId || req.headers['x-branch-id'];
    
    // Managers can only see users relevant to their branch
    if (req.user.role === 'manager') {
      targetBranchId = req.user.branchId?._id || req.user.branchId;
    }

    if (targetBranchId) {
      filter.$or = [
        { branchId: targetBranchId },
        { assignedBranches: targetBranchId }
      ];
    }

    const users = await User.find(filter)
      .select('-password -resetPasswordToken -resetPasswordExpire')
      .populate('branchId', 'branchName location')
      .populate('assignedBranches', 'branchName location')
      .sort('name');

    res.status(200).json({ success: true, count: users.length, data: users });
  } catch (err) {
    next(err);
  }
});

// GET /api/users/:id — get single user
router.get('/:id', authorize('admin'), async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id)
      .select('-password')
      .populate('branchId', 'branchName location');
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    res.status(200).json({ success: true, data: user });
  } catch (err) {
    next(err);
  }
});

// PUT /api/users/:id — update user (Admin only)
router.put('/:id', authorize('admin'), async (req, res, next) => {
  try {
    const { name, email, phone, role, branchId, isActive } = req.body;
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { name, email, phone, role, branchId, isActive },
      { new: true, runValidators: true }
    ).populate('branchId', 'branchName location');

    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    res.status(200).json({ success: true, data: user });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
