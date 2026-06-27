const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Protect routes — require valid JWT
const protect = async (req, res, next) => {
  try {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized — no token provided',
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(decoded.id).select('-password').populate('branchId', 'branchName location status');

    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'User not found',
      });
    }

    if (!req.user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'User account is deactivated',
      });
    }

    // Block non-admin users if their branch is deactivated
    if (req.user.role !== 'admin' && req.user.branchId && req.user.branchId.status === 'deactive') {
      return res.status(403).json({
        success: false,
        message: 'Your branch is currently deactivated. Please contact your administrator.',
      });
    }

    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Not authorized — invalid token',
    });
  }
};

// Restrict to specific roles
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Role '${req.user.role}' is not authorized to access this resource`,
      });
    }
    next();
  };
};

/**
 * Helper: returns the branchId filter for a given user.
 * - Admin:      no filter (or specific branch if ?branchId=xxx passed)
 * - Manager:    filter by their own branchId
 * - Contractor: filter by their own branchId
 */
const getBranchFilter = (req) => {
  const mongoose = require('mongoose');
  const toOid = (id) => {
    try { return new mongoose.Types.ObjectId(id); } catch { return id; }
  };

  if (req.user.role === 'admin') {
    // Admin can filter by a specific branch via query param or header
    const branchId = req.query.branchId || req.headers['x-branch-id'];
    if (branchId) {
      return { branchId: toOid(branchId) };
    }
    return {}; // No filter — sees all branches
  }
  // Everyone else is scoped to their branch
  const branchId = req.user.branchId?._id || req.user.branchId;
  return { branchId: toOid(branchId) };
};


module.exports = { protect, authorize, getBranchFilter };
