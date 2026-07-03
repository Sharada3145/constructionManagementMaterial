const express = require('express');
const {
  createBranch,
  getBranches,
  getBranchById,
  updateBranch,
  toggleBranchStatus,
  getWarehouse,
} = require('../controllers/branchController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// All branch routes are strictly for Admins
router.use(protect);
router.use(authorize('admin'));

router.route('/')
  .post(createBranch)
  .get(getBranches);

router.get('/warehouse', getWarehouse);

router.route('/:id')
  .get(getBranchById)
  .put(updateBranch);

router.route('/:id/status')
  .patch(toggleBranchStatus);

module.exports = router;
