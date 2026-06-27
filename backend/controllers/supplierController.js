const Supplier = require('../models/Supplier');
const { getBranchFilter } = require('../middleware/auth');

// @desc    Get all suppliers
// @route   GET /api/suppliers
// @access  Private
const getSuppliers = async (req, res, next) => {
  try {
    const { search, page = 1, limit = 20 } = req.query;
    const branchFilter = getBranchFilter(req);
    const query = { isActive: true, ...branchFilter };

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { contactPerson: { $regex: search, $options: 'i' } },
      ];
    }

    const total = await Supplier.countDocuments(query);
    const suppliers = await Supplier.find(query)
      .populate('branchId', 'branchName location')
      .sort('-createdAt')
      .skip((parseInt(page) - 1) * parseInt(limit))
      .limit(parseInt(limit));

    res.status(200).json({
      success: true,
      count: suppliers.length,
      total,
      totalPages: Math.ceil(total / parseInt(limit)),
      currentPage: parseInt(page),
      data: suppliers,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single supplier
// @route   GET /api/suppliers/:id
// @access  Private
const getSupplier = async (req, res, next) => {
  try {
    const branchFilter = getBranchFilter(req);
    const supplier = await Supplier.findOne({ _id: req.params.id, ...branchFilter })
      .populate('branchId', 'branchName location');
    if (!supplier) {
      return res.status(404).json({ success: false, message: 'Supplier not found' });
    }
    res.status(200).json({ success: true, data: supplier });
  } catch (error) {
    next(error);
  }
};

// @desc    Create supplier
// @route   POST /api/suppliers
// @access  Private (admin, manager)
const createSupplier = async (req, res, next) => {
  try {
    // Inject branchId: managers always get their own branch
    const branchId = req.user.role === 'admin'
      ? (req.body.branchId || req.user.branchId?._id || req.user.branchId)
      : (req.user.branchId?._id || req.user.branchId);

    const supplier = await Supplier.create({ ...req.body, branchId });
    res.status(201).json({ success: true, message: 'Supplier created', data: supplier });
  } catch (error) {
    next(error);
  }
};

// @desc    Update supplier
// @route   PUT /api/suppliers/:id
// @access  Private (admin, manager)
const updateSupplier = async (req, res, next) => {
  try {
    const branchFilter = getBranchFilter(req);
    const supplier = await Supplier.findOneAndUpdate(
      { _id: req.params.id, ...branchFilter },
      req.body,
      { new: true, runValidators: true }
    );
    if (!supplier) {
      return res.status(404).json({ success: false, message: 'Supplier not found or not in your branch' });
    }
    res.status(200).json({ success: true, message: 'Supplier updated', data: supplier });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete supplier (soft-delete)
// @route   DELETE /api/suppliers/:id
// @access  Private (admin)
const deleteSupplier = async (req, res, next) => {
  try {
    const branchFilter = getBranchFilter(req);
    const supplier = await Supplier.findOneAndUpdate(
      { _id: req.params.id, ...branchFilter },
      { isActive: false },
      { new: true }
    );
    if (!supplier) {
      return res.status(404).json({ success: false, message: 'Supplier not found or not in your branch' });
    }
    res.status(200).json({ success: true, message: 'Supplier deleted' });
  } catch (error) {
    next(error);
  }
};

module.exports = { getSuppliers, getSupplier, createSupplier, updateSupplier, deleteSupplier };
