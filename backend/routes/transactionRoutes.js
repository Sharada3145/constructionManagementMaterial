const express = require('express');
const router = express.Router();
const {
  getTransactions,
  createPurchase,
  getTransaction,
} = require('../controllers/transactionController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);

router.get('/', getTransactions);
router.get('/:id', getTransaction);
router.post('/purchase', authorize('admin', 'manager'), createPurchase);

module.exports = router;
