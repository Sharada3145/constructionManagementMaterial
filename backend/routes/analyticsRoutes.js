const express = require('express');
const router = express.Router();
const {
  getDashboard,
  getConsumption,
  getTopMaterials,
  getProjectConsumption,
  getCategoryDistribution,
  getContractorSupply,
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

module.exports = router;
