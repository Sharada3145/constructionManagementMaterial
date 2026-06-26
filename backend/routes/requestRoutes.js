const express = require('express');
const router = express.Router();
const {
  createRequest,
  getRequests,
  getRequest,
  updateRequestStatus,
} = require('../controllers/requestController');
const { issueMaterials, getUsers } = require('../controllers/issueController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);

router.get('/users', authorize('admin', 'manager'), getUsers);
router.get('/', getRequests);
router.get('/:id', getRequest);
router.post('/issue', authorize('admin', 'manager'), issueMaterials);
router.post('/', authorize('contractor'), createRequest);
router.put('/:id/status', authorize('admin', 'manager'), updateRequestStatus);

module.exports = router;
