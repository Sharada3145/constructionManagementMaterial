const express = require('express');
const router = express.Router();
const {
  getMaterials,
  getMaterial,
  createMaterial,
  updateMaterial,
  deleteMaterial,
  getLowStockMaterials,
  getCategories,
  fuzzySearch,
  restockMaterial,
} = require('../controllers/materialController');
const { protect, authorize } = require('../middleware/auth');

// All routes require authentication
router.use(protect);

// Public (all authenticated users)
router.get('/categories', getCategories);
router.get('/low-stock', getLowStockMaterials);
router.get('/fuzzy-search', fuzzySearch);
router.get('/', getMaterials);
router.get('/:id', getMaterial);

// Manager & admin only
router.post('/', authorize('admin', 'manager'), createMaterial);
router.put('/:id', authorize('admin', 'manager'), updateMaterial);
router.post('/:id/restock', authorize('admin', 'manager'), restockMaterial);
router.delete('/:id', authorize('admin'), deleteMaterial);

module.exports = router;
