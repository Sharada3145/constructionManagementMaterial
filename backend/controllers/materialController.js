const Material = require('../models/Material');
const { fuzzyMatchMaterial } = require('../utils/fuzzyMatch');

// @desc    Get all materials (with search, filter, pagination)
// @route   GET /api/materials
// @access  Private
const getMaterials = async (req, res, next) => {
  try {
    const { search, category, lowStock, page = 1, limit = 20, sort = '-updatedAt' } = req.query;

    const query = { isActive: true };

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
    const material = await Material.findById(req.params.id).populate('supplier', 'name phone email');
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
    const material = await Material.create(req.body);
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
    const material = await Material.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!material) {
      return res.status(404).json({ success: false, message: 'Material not found' });
    }
    res.status(200).json({ success: true, message: 'Material updated', data: material });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete (soft-delete) a material
// @route   DELETE /api/materials/:id
// @access  Private (admin)
const deleteMaterial = async (req, res, next) => {
  try {
    const material = await Material.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    );
    if (!material) {
      return res.status(404).json({ success: false, message: 'Material not found' });
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
    const materials = await Material.find({
      isActive: true,
      $expr: { $lte: ['$quantity', '$minStockLevel'] },
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
    const categories = await Material.distinct('category', { isActive: true });
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

    const materials = await Material.find({ isActive: true }).select('_id name unit');
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

module.exports = {
  getMaterials,
  getMaterial,
  createMaterial,
  updateMaterial,
  deleteMaterial,
  getLowStockMaterials,
  getCategories,
  fuzzySearch,
};
