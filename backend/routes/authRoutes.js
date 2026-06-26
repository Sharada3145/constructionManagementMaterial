const express = require('express');
const router = express.Router();
const { register, login, getMe, createContractor, forgotPassword, resetPassword } = require('../controllers/authController');
const { protect, authorize } = require('../middleware/auth');

router.post('/register', register);
router.post('/login', login);
router.get('/me', protect, getMe);
router.post('/create-contractor', protect, authorize('admin', 'manager'), createContractor);
router.post('/forgotpassword', forgotPassword);
router.put('/resetpassword/:resettoken', resetPassword);

module.exports = router;
