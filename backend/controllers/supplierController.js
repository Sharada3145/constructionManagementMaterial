const Supplier = require('../models/Supplier');

// @desc    Get all suppliers
// @route   GET /api/suppliers
// @access  Private
const getSuppliers = async (req, res, next) => {
  try {
    const { search, page = 1, limit = 20 } = req.query;
    const query = { isActive: true };

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { contactPerson: { $regex: search, $options: 'i' } },
      ];
    }

    const total = await Supplier.countDocuments(query);
    const suppliers = await Supplier.find(query)
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
    const supplier = await Supplier.findById(req.params.id);
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
    const supplier = await Supplier.create(req.body);
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
    const supplier = await Supplier.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!supplier) {
      return res.status(404).json({ success: false, message: 'Supplier not found' });
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
    const supplier = await Supplier.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    );
    if (!supplier) {
      return res.status(404).json({ success: false, message: 'Supplier not found' });
    }
    res.status(200).json({ success: true, message: 'Supplier deleted' });
  } catch (error) {
    next(error);
  }
};

module.exports = { getSuppliers, getSupplier, createSupplier, updateSupplier, deleteSupplier };
