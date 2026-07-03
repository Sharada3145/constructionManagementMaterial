const Material = require('../models/Material');
const Transaction = require('../models/Transaction');
const { fuzzyMatchMaterial } = require('../utils/fuzzyMatch');
const { getBranchFilter } = require('../middleware/auth');

// @desc    Get all materials (with search, filter, pagination)
// @route   GET /api/materials
// @access  Private
const getMaterials = async (req, res, next) => {
  try {
    const { search, category, lowStock, page = 1, limit = 20, sort = '-updatedAt' } = req.query;

    const query = { isActive: true, ...getBranchFilter(req) };

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }

    if (category) {
      query.category = category;
    }

    if (lowStock === 'true') {
      query.$expr = { $lte: ['$quantity', '$minStockLevel'] };
    }

    const total = await Material.countDocuments(query);
    const materials = await Material.find(query)
      .populate('supplier', 'name phone')
      .populate('branchId', 'branchName location')
      .sort(sort)
      .skip((parseInt(page) - 1) * parseInt(limit))
      .limit(parseInt(limit));

    res.status(200).json({
      success: true,
      count: materials.length,
      total,
      totalPages: Math.ceil(total / parseInt(limit)),
      currentPage: parseInt(page),
      data: materials,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single material
// @route   GET /api/materials/:id
// @access  Private
const getMaterial = async (req, res, next) => {
  try {
    const branchFilter = getBranchFilter(req);
    const material = await Material.findOne({ _id: req.params.id, ...branchFilter })
      .populate('supplier', 'name phone email')
      .populate('branchId', 'branchName location');
    if (!material) {
      return res.status(404).json({ success: false, message: 'Material not found' });
    }
    res.status(200).json({ success: true, data: material });
  } catch (error) {
    next(error);
  }
};

// @desc    Create a new material
// @route   POST /api/materials
// @access  Private (admin, manager)
const createMaterial = async (req, res, next) => {
  try {
    // Attach branchId: managers get their own branch, admins can pass branchId in body
    let branchId = req.user.role === 'admin'
      ? (req.body.branchId || req.user.branchId?._id || req.user.branchId)
      : (req.user.branchId?._id || req.user.branchId);

    branchId = branchId || null;

    // Check if material with same name already exists in the same location
    const existingMaterial = await Material.findOne({
      name: { $regex: new RegExp(`^${(req.body.name || '').trim().replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')}$`, 'i') },
      branchId: branchId,
      isActive: true,
    });

    if (existingMaterial) {
      return res.status(400).json({
        success: false,
        message: `Material '${req.body.name}' already exists.`,
      });
    }

    const material = await Material.create({ ...req.body, branchId });
    res.status(201).json({ success: true, message: 'Material created', data: material });
  } catch (error) {
    next(error);
  }
};

// @desc    Update a material
// @route   PUT /api/materials/:id
// @access  Private (admin, manager)
const updateMaterial = async (req, res, next) => {
  try {
    const branchFilter = getBranchFilter(req);

    // If updating name, check for duplicates
    if (req.body.name) {
      const existingMaterial = await Material.findOne({
        _id: { $ne: req.params.id },
        name: { $regex: new RegExp(`^${req.body.name.trim().replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')}$`, 'i') },
        ...branchFilter,
        isActive: true,
      });

      if (existingMaterial) {
        return res.status(400).json({
          success: false,
          message: `Material '${req.body.name}' already exists.`,
        });
      }
    }

    const material = await Material.findOneAndUpdate(
      { _id: req.params.id, ...branchFilter },
      req.body,
      { new: true, runValidators: true }
    );
    if (!material) {
      return res.status(404).json({ success: false, message: 'Material not found or not in your branch' });
    }
    res.status(200).json({ success: true, message: 'Material updated', data: material });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete (soft-delete) a material
// @route   DELETE /api/materials/:id
// @access  Private (admin, manager)
const deleteMaterial = async (req, res, next) => {
  try {
    const branchFilter = getBranchFilter(req);
    const material = await Material.findOneAndUpdate(
      { _id: req.params.id, ...branchFilter },
      { isActive: false },
      { new: true }
    );
    if (!material) {
      return res.status(404).json({ success: false, message: 'Material not found or not in your branch' });
    }
    res.status(200).json({ success: true, message: 'Material deleted' });
  } catch (error) {
    next(error);
  }
};

// @desc    Get low stock materials
// @route   GET /api/materials/low-stock
// @access  Private
const getLowStockMaterials = async (req, res, next) => {
  try {
    const branchFilter = getBranchFilter(req);
    const materials = await Material.find({
      isActive: true,
      $expr: { $lte: ['$quantity', '$minStockLevel'] },
      ...branchFilter,
    }).populate('supplier', 'name phone');

    res.status(200).json({
      success: true,
      count: materials.length,
      data: materials,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get material categories
// @route   GET /api/materials/categories
// @access  Private
const getCategories = async (req, res, next) => {
  try {
    const branchFilter = getBranchFilter(req);
    const categories = await Material.distinct('category', { isActive: true, ...branchFilter });
    res.status(200).json({ success: true, data: categories });
  } catch (error) {
    next(error);
  }
};

// @desc    Fuzzy search materials (AI matching)
// @route   GET /api/materials/fuzzy-search?term=cemnt
// @access  Private
const fuzzySearch = async (req, res, next) => {
  try {
    const { term } = req.query;
    if (!term) {
      return res.status(400).json({ success: false, message: 'Search term is required' });
    }

    const branchFilter = getBranchFilter(req);
    const materials = await Material.find({ isActive: true, ...branchFilter }).select('_id name unit');
    const materialList = materials.map((m) => ({ _id: m._id, name: m.name, unit: m.unit }));

    const result = fuzzyMatchMaterial(term, materialList);

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Restock a material (purchase / incoming stock)
// @route   POST /api/materials/:id/restock
// @access  Private (admin, manager)
const restockMaterial = async (req, res, next) => {
  try {
    const { quantity, invoiceNumber, unitPrice, supplier, notes } = req.body;

    if (!quantity || Number(quantity) <= 0) {
      return res.status(400).json({ success: false, message: 'Please provide a valid restock quantity' });
    }

    const branchFilter = getBranchFilter(req);
    const material = await Material.findOne({ _id: req.params.id, isActive: true, ...branchFilter });
    if (!material) {
      return res.status(404).json({ success: false, message: 'Material not found or not in your branch' });
    }

    const prevQty = material.quantity;
    const addQty = Number(quantity);
    material.quantity = prevQty + addQty;

    // Update purchase price if supplied
    if (unitPrice && Number(unitPrice) > 0) {
      material.purchasePrice = Number(unitPrice);
    }
    if (supplier) {
      material.supplier = supplier;
    }

    await material.save();

    // Log a purchase transaction
    await Transaction.create({
      type: 'purchase',
      material: material._id,
      quantity: addQty,
      unit: material.unit,
      previousStock: prevQty,
      newStock: material.quantity,
      branchId: material.branchId,
      performedBy: req.user._id,
      supplier: supplier || material.supplier || undefined,
      invoiceNumber: invoiceNumber || undefined,
      unitPrice: unitPrice ? Number(unitPrice) : material.purchasePrice,
      totalPrice: (unitPrice ? Number(unitPrice) : material.purchasePrice || 0) * addQty,
      notes: notes || `Restocked ${addQty} ${material.unit} of ${material.name}`,
    });

    const updated = await Material.findById(material._id).populate('supplier', 'name phone').populate('branchId', 'branchName');

    res.status(200).json({
      success: true,
      message: `Successfully restocked ${addQty} ${material.unit} of ${material.name}`,
      data: updated,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getMaterials,
  getMaterial,
  createMaterial,
  updateMaterial,
  deleteMaterial,
  getLowStockMaterials,
  getCategories,
  fuzzySearch,
  restockMaterial,
};
