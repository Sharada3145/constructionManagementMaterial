const express = require('express');
const router = express.Router();
const {
  getTransfers,
  createTransfer,
} = require('../controllers/transferController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);

router.get('/', getTransfers);
router.post('/', authorize('admin'), createTransfer);

module.exports = router;
