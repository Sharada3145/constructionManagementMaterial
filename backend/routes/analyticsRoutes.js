const express = require('express');
const router = express.Router();
const {
  getDashboard,
  getConsumption,
  getTopMaterials,
  getProjectConsumption,
  getCategoryDistribution,
  getContractorSupply,
  getWarehouseAnalytics,
} = require('../controllers/analyticsController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);
router.use(authorize('admin', 'manager'));

router.get('/dashboard', getDashboard);
router.get('/consumption', getConsumption);
router.get('/top-materials', getTopMaterials);
router.get('/project-consumption', getProjectConsumption);
router.get('/category-distribution', getCategoryDistribution);
router.get('/contractor-supply', getContractorSupply);
router.get('/warehouse', authorize('admin'), getWarehouseAnalytics);

module.exports = router;
