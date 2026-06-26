const Transaction = require('../models/Transaction');
const Material = require('../models/Material');
const MaterialRequest = require('../models/MaterialRequest');

// @desc    Get dashboard overview
// @route   GET /api/analytics/dashboard
// @access  Private (admin, manager)
const getDashboard = async (req, res, next) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Total materials
    const totalMaterials = await Material.countDocuments({ isActive: true });

    // Total stock value
    const stockValue = await Material.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: null, total: { $sum: { $multiply: ['$quantity', '$purchasePrice'] } } } },
    ]);

    // Materials issued today (count of transactions)
    const issuedToday = await Transaction.countDocuments({
      type: 'issue',
      createdAt: { $gte: today, $lt: tomorrow },
    });

    // Pending requests
    const pendingRequests = await MaterialRequest.countDocuments({ status: 'pending' });

    // Low stock items count
    const lowStockItems = await Material.countDocuments({
      isActive: true,
      $expr: { $lte: ['$quantity', '$minStockLevel'] },
    });

    // Low stock materials list (for the alert panel)
    const lowStockMaterials = await Material.find({
      isActive: true,
      $expr: { $lte: ['$quantity', '$minStockLevel'] },
    })
      .select('name category quantity minStockLevel unit')
      .sort('quantity')
      .limit(6);

    // Top materials issued today (aggregated, not raw rows)
    const topIssuedToday = await Transaction.aggregate([
      { $match: { type: 'issue', createdAt: { $gte: today, $lt: tomorrow } } },
      { $group: { _id: '$material', totalQty: { $sum: '$quantity' }, unit: { $first: '$unit' } } },
      { $sort: { totalQty: -1 } },
      { $limit: 5 },
      { $lookup: { from: 'materials', localField: '_id', foreignField: '_id', as: 'material' } },
      { $unwind: '$material' },
      { $project: { materialName: '$material.name', totalQty: 1, unit: 1 } },
    ]);

    // Recent requests (last 5, rich data)
    const recentRequests = await MaterialRequest.find()
      .populate('contractor', 'name')
      .populate('items.material', 'name unit')
      .sort('-createdAt')
      .limit(5);

    res.status(200).json({
      success: true,
      data: {
        totalMaterials,
        totalStockValue: stockValue[0]?.total || 0,
        issuedToday,
        pendingRequests,
        lowStockItems,
        lowStockMaterials,
        topIssuedToday,
        recentRequests,
      },
    });
  } catch (error) {
    next(error);
  }
};


// @desc    Get consumption analytics (daily / weekly / monthly)
// @route   GET /api/analytics/consumption?period=daily|weekly|monthly
// @access  Private (admin, manager)
const getConsumption = async (req, res, next) => {
  try {
    const { period = 'daily', materialId } = req.query;

    let startDate = new Date();
    let dateFormat;

    switch (period) {
      case 'weekly':
        startDate.setDate(startDate.getDate() - 7 * 4); // last 4 weeks
        dateFormat = { $dateToString: { format: '%Y-W%V', date: '$createdAt' } };
        break;
      case 'monthly':
        startDate.setMonth(startDate.getMonth() - 12); // last 12 months
        dateFormat = { $dateToString: { format: '%Y-%m', date: '$createdAt' } };
        break;
      default: // daily
        startDate.setDate(startDate.getDate() - 30); // last 30 days
        dateFormat = { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } };
    }

    const matchStage = {
      type: 'issue',
      createdAt: { $gte: startDate },
    };
    if (materialId) matchStage.material = materialId;

    const consumption = await Transaction.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: dateFormat,
          totalQuantity: { $sum: '$quantity' },
          totalValue: { $sum: '$totalPrice' },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    res.status(200).json({ success: true, data: consumption });
  } catch (error) {
    next(error);
  }
};

// @desc    Get most consumed materials
// @route   GET /api/analytics/top-materials
// @access  Private (admin, manager)
const getTopMaterials = async (req, res, next) => {
  try {
    const { days = 30, limit = 10 } = req.query;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));

    const topMaterials = await Transaction.aggregate([
      { $match: { type: 'issue', createdAt: { $gte: startDate } } },
      {
        $group: {
          _id: '$material',
          totalQuantity: { $sum: '$quantity' },
          totalValue: { $sum: '$totalPrice' },
          issueCount: { $sum: 1 },
        },
      },
      { $sort: { totalQuantity: -1 } },
      { $limit: parseInt(limit) },
      {
        $lookup: {
          from: 'materials',
          localField: '_id',
          foreignField: '_id',
          as: 'material',
        },
      },
      { $unwind: '$material' },
      {
        $project: {
          materialName: '$material.name',
          category: '$material.category',
          unit: '$material.unit',
          totalQuantity: 1,
          totalValue: 1,
          issueCount: 1,
        },
      },
    ]);

    res.status(200).json({ success: true, data: topMaterials });
  } catch (error) {
    next(error);
  }
};

// @desc    Get project-wise consumption
// @route   GET /api/analytics/project-consumption
// @access  Private (admin, manager)
const getProjectConsumption = async (req, res, next) => {
  try {
    const { days = 30 } = req.query;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));

    const projectConsumption = await Transaction.aggregate([
      { $match: { type: 'issue', project: { $ne: null }, createdAt: { $gte: startDate } } },
      {
        $group: {
          _id: '$project',
          totalQuantity: { $sum: '$quantity' },
          totalValue: { $sum: '$totalPrice' },
          issueCount: { $sum: 1 },
        },
      },
      { $sort: { totalValue: -1 } },
      {
        $lookup: {
          from: 'projects',
          localField: '_id',
          foreignField: '_id',
          as: 'project',
        },
      },
      { $unwind: '$project' },
      {
        $project: {
          projectName: '$project.name',
          totalQuantity: 1,
          totalValue: 1,
          issueCount: 1,
        },
      },
    ]);

    res.status(200).json({ success: true, data: projectConsumption });
  } catch (error) {
    next(error);
  }
};

// @desc    Get category-wise stock distribution
// @route   GET /api/analytics/category-distribution
// @access  Private (admin, manager)
const getCategoryDistribution = async (req, res, next) => {
  try {
    const distribution = await Material.aggregate([
      { $match: { isActive: true } },
      {
        $group: {
          _id: '$category',
          totalItems: { $sum: 1 },
          totalQuantity: { $sum: '$quantity' },
          totalValue: { $sum: { $multiply: ['$quantity', '$purchasePrice'] } },
        },
      },
      { $sort: { totalValue: -1 } },
    ]);

    res.status(200).json({ success: true, data: distribution });
  } catch (error) {
    next(error);
  }
};

// @desc    Get contractor-wise supply summary
// @route   GET /api/analytics/contractor-supply?period=today|week|month&contractorId=xxx
// @access  Private (admin, manager)
const getContractorSupply = async (req, res, next) => {
  try {
    const { period = 'month', contractorId } = req.query;

    const now = new Date();
    const todayStart = new Date(now); todayStart.setHours(0,0,0,0);
    const weekStart = new Date(now); weekStart.setDate(now.getDate() - 7);
    const monthStart = new Date(now); monthStart.setDate(now.getDate() - 30);

    // Summary table: one row per contractor
    // We compute value = quantity × material.purchasePrice to handle legacy
    // issue transactions that were created without totalPrice.
    const pipeline = [
      { $match: { type: 'issue', createdAt: { $gte: monthStart } } },
      // Lookup material to get purchasePrice for value calculation
      {
        $lookup: {
          from: 'materials',
          localField: 'material',
          foreignField: '_id',
          as: 'mat',
        },
      },
      { $unwind: '$mat' },
      {
        $addFields: {
          computedValue: {
            $multiply: [
              '$quantity',
              { $ifNull: ['$mat.purchasePrice', 0] },
            ],
          },
        },
      },
      // Lookup materialRequest to get the contractor
      {
        $lookup: {
          from: 'materialrequests',
          localField: 'materialRequest',
          foreignField: '_id',
          as: 'req',
        },
      },
      { $unwind: '$req' },
      // Group by contractor
      {
        $group: {
          _id: '$req.contractor',
          todayQty: {
            $sum: { $cond: [{ $gte: ['$createdAt', todayStart] }, '$quantity', 0] },
          },
          weekQty: {
            $sum: { $cond: [{ $gte: ['$createdAt', weekStart] }, '$quantity', 0] },
          },
          monthQty: { $sum: '$quantity' },
          totalValue: { $sum: '$computedValue' },
          txnCount: { $sum: 1 },
        },
      },
      // Lookup contractor user — drop rows where user was deleted
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'contractor',
        },
      },
      { $unwind: '$contractor' },
      {
        $project: {
          contractorId: '$_id',
          name: '$contractor.name',
          email: '$contractor.email',
          phone: '$contractor.phone',
          todayQty: 1,
          weekQty: 1,
          monthQty: 1,
          totalValue: 1,
          txnCount: 1,
        },
      },
      { $sort: { totalValue: -1 } },
    ];

    const summary = await Transaction.aggregate(pipeline);

    // Detailed breakdown for a specific contractor
    let detail = null;
    if (contractorId) {
      const mongoose = require('mongoose');
      const cid = new mongoose.Types.ObjectId(contractorId);

      // Top materials for this contractor (last 30 days), with value
      const topMaterials = await Transaction.aggregate([
        { $match: { type: 'issue', createdAt: { $gte: monthStart } } },
        { $lookup: { from: 'materials', localField: 'material', foreignField: '_id', as: 'mat' } },
        { $unwind: '$mat' },
        {
          $addFields: {
            computedValue: { $multiply: ['$quantity', { $ifNull: ['$mat.purchasePrice', 0] }] },
          },
        },
        { $lookup: { from: 'materialrequests', localField: 'materialRequest', foreignField: '_id', as: 'req' } },
        { $unwind: '$req' },
        { $match: { 'req.contractor': cid } },
        {
          $group: {
            _id: '$material',
            unit: { $first: '$unit' },
            todayQty: { $sum: { $cond: [{ $gte: ['$createdAt', todayStart] }, '$quantity', 0] } },
            weekQty: { $sum: { $cond: [{ $gte: ['$createdAt', weekStart] }, '$quantity', 0] } },
            monthQty: { $sum: '$quantity' },
            totalValue: { $sum: '$computedValue' },
          },
        },
        { $sort: { monthQty: -1 } },
        { $limit: 10 },
        { $lookup: { from: 'materials', localField: '_id', foreignField: '_id', as: 'material' } },
        { $unwind: '$material' },
        {
          $project: {
            materialName: '$material.name',
            unit: 1,
            todayQty: 1,
            weekQty: 1,
            monthQty: 1,
            totalValue: 1,
          },
        },
      ]);

      // Recent requests for this contractor
      const recentRequests = await require('../models/MaterialRequest')
        .find({ contractor: cid })
        .populate('items.material', 'name unit')
        .populate('project', 'name')
        .sort('-createdAt')
        .limit(10);

      const User = require('../models/User');
      const contractorUser = await User.findById(cid).select('name email phone');

      detail = { contractor: contractorUser, topMaterials, recentRequests };
    }

    res.status(200).json({ success: true, data: { summary, detail } });
  } catch (error) {
    next(error);
  }
};


module.exports = {
  getDashboard,
  getConsumption,
  getTopMaterials,
  getProjectConsumption,
  getCategoryDistribution,
  getContractorSupply,
};

