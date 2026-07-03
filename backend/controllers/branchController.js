const Branch = require('../models/Branch');

// @desc  Create a new branch
// @route POST /api/branches
// @access Private/Admin
const createBranch = async (req, res, next) => {
  try {
    const branch = await Branch.create(req.body);
    res.status(201).json({ success: true, data: branch });
  } catch (err) {
    next(err);
  }
};

// @desc  Get all branches
// @route GET /api/branches
// @access Private/Admin
const getBranches = async (req, res, next) => {
  try {
    const branches = await Branch.find();
  res.status(200).json({ success: true, count: branches.length, data: branches });
  } catch (err) {
    next(err);
  }
};

// @desc  Get single branch
// @route GET /api/branches/:id
// @access Private/Admin
const getBranchById = async (req, res, next) => {
  try {
    const branch = await Branch.findById(req.params.id).populate('managerId', 'name email');
    if (!branch) {
      return res.status(404).json({ success: false, message: 'Branch not found' });
    }
    res.status(200).json({ success: true, data: branch });
  } catch (err) {
    next(err);
  }
};

// @desc  Update branch
// @route PUT /api/branches/:id
// @access Private/Admin
const updateBranch = async (req, res, next) => {
  try {
    const branch = await Branch.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    }).populate('managerId', 'name email');

    if (!branch) {
      return res.status(404).json({ success: false, message: 'Branch not found' });
    }
    res.status(200).json({ success: true, data: branch });
  } catch (err) {
    next(err);
  }
};

// @desc  Toggle branch status
// @route PATCH /api/branches/:id/status
// @access Private/Admin
const toggleBranchStatus = async (req, res, next) => {
  try {
    let branch = await Branch.findById(req.params.id);
    if (!branch) {
      return res.status(404).json({ success: false, message: 'Branch not found' });
    }

    branch.status = branch.status === 'active' ? 'deactive' : 'active';
    await branch.save();

    res.status(200).json({ success: true, data: branch });
  } catch (err) {
    next(err);
  }
};

// @desc  Get Central Warehouse
// @route GET /api/branches/warehouse
// @access Private/Admin
const getWarehouse = async (req, res, next) => {
  try {
    const warehouse = await Branch.findOne({ isCentralWarehouse: true });
    if (!warehouse) {
      return res.status(404).json({ success: false, message: 'Central Warehouse not found' });
    }
    res.status(200).json({ success: true, data: warehouse });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  createBranch,
  getBranches,
  getBranchById,
  updateBranch,
  toggleBranchStatus,
  getWarehouse,
};
