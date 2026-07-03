const Transaction = require('../models/Transaction');
const Material = require('../models/Material');
const MaterialRequest = require('../models/MaterialRequest');
const Branch = require('../models/Branch');
const User = require('../models/User');
const { getBranchFilter } = require('../middleware/auth');

// @desc    Get dashboard overview
// @route   GET /api/analytics/dashboard
// @access  Private (admin, manager)
const getDashboard = async (req, res, next) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const branchFilter = getBranchFilter(req);

    // Total materials
    const totalMaterials = await Material.countDocuments({ isActive: true, ...branchFilter });

    // Total stock value
    const stockValue = await Material.aggregate([
      { $match: { isActive: true, ...branchFilter } },
      { $group: { _id: null, total: { $sum: { $multiply: ['$quantity', '$purchasePrice'] } } } },
    ]);

    // Materials issued today (count of transactions)
    const issuedToday = await Transaction.countDocuments({
      type: 'issue',
      createdAt: { $gte: today, $lt: tomorrow },
      ...branchFilter,
    });

    // Pending requests
    const pendingRequests = await MaterialRequest.countDocuments({ status: 'pending', ...branchFilter });

    // Low stock items count
    const lowStockItems = await Material.countDocuments({
      isActive: true,
      $expr: { $lte: ['$quantity', '$minStockLevel'] },
      ...branchFilter,
    });

    // Low stock materials list (for the alert panel)
    const lowStockMaterials = await Material.find({
      isActive: true,
      $expr: { $lte: ['$quantity', '$minStockLevel'] },
      ...branchFilter,
    })
      .select('name category quantity minStockLevel unit')
      .sort('quantity')
      .limit(6);

    // Top materials issued today
    const topIssuedToday = await Transaction.aggregate([
      { $match: { type: 'issue', createdAt: { $gte: today, $lt: tomorrow }, ...branchFilter } },
      { $group: { _id: '$material', totalQty: { $sum: '$quantity' }, unit: { $first: '$unit' } } },
      { $sort: { totalQty: -1 } },
      { $limit: 5 },
      { $lookup: { from: 'materials', localField: '_id', foreignField: '_id', as: 'material' } },
      { $unwind: '$material' },
      { $project: { materialName: '$material.name', totalQty: 1, unit: 1 } },
    ]);

    // Recent requests (last 5, rich data)
    const recentRequests = await MaterialRequest.find(branchFilter)
      .populate('contractor', 'name')
      .populate('items.material', 'name unit')
      .populate('branchId', 'branchName')
      .sort('-createdAt')
      .limit(5);

    // Admin-only: branch comparison data
    let branchComparison = null;
    let totalBranches = null;
    let activeBranches = null;
    let totalContractors = null;

    if (req.user.role === 'admin') {
      totalBranches = await Branch.countDocuments();
      activeBranches = await Branch.countDocuments({ status: 'active' });
      totalContractors = await User.countDocuments({ role: 'contractor', isActive: true });

      const branches = await Branch.find();

      branchComparison = await Promise.all(branches.map(async (branch) => {
        const bid = branch._id;

        const stockVal = await Material.aggregate([
          { $match: { isActive: true, branchId: bid } },
          { $group: { _id: null, total: { $sum: { $multiply: ['$quantity', '$purchasePrice'] } } } },
        ]);

        const monthStart = new Date();
        monthStart.setDate(1);
        monthStart.setHours(0, 0, 0, 0);

        const monthlyPurchase = await Transaction.aggregate([
          { $match: { type: 'purchase', branchId: bid, createdAt: { $gte: monthStart } } },
          { $group: { _id: null, total: { $sum: '$totalPrice' } } },
        ]);

        const monthlyIssue = await Transaction.aggregate([
          { $match: { type: 'issue', branchId: bid, createdAt: { $gte: monthStart } } },
          { $group: { _id: null, total: { $sum: '$quantity' } } },
        ]);

        const contractorCount = await User.countDocuments({ branchId: bid, role: 'contractor', isActive: true });

        return {
          branchId: bid,
          branchName: branch.branchName,
          location: branch.location,
          status: branch.status,
          manager: branch.managerName || 'Unassigned',
          stockValue: stockVal[0]?.total || 0,
          monthlyPurchase: monthlyPurchase[0]?.total || 0,
          monthlyIssueQty: monthlyIssue[0]?.total || 0,
          contractorCount,
        };
      }));
    }

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
        // Admin-specific
        totalBranches,
        activeBranches,
        totalContractors,
        branchPerformance: branchComparison,
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
    const branchFilter = getBranchFilter(req);

    let startDate = new Date();
    let dateFormat;

    switch (period) {
      case 'weekly':
        startDate.setDate(startDate.getDate() - 7 * 4);
        dateFormat = { $dateToString: { format: '%Y-W%V', date: '$createdAt' } };
        break;
      case 'monthly':
        startDate.setMonth(startDate.getMonth() - 12);
        dateFormat = { $dateToString: { format: '%Y-%m', date: '$createdAt' } };
        break;
      case 'all':
        startDate.setFullYear(startDate.getFullYear() - 10);
        dateFormat = { $dateToString: { format: '%Y-%m', date: '$createdAt' } };
        break;
      default:
        startDate.setDate(startDate.getDate() - 30);
        dateFormat = { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } };
    }

    const matchStage = {
      type: 'issue',
      createdAt: { $gte: startDate },
      ...branchFilter,
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
    const { days = '30', limit = 10 } = req.query;
    const branchFilter = getBranchFilter(req);
    
    const matchStage = { type: 'issue', ...branchFilter };
    if (days !== 'all') {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - parseInt(days));
      matchStage.createdAt = { $gte: startDate };
    }

    const topMaterials = await Transaction.aggregate([
      { $match: matchStage },
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
    const { days = '30' } = req.query;
    const branchFilter = getBranchFilter(req);
    
    const matchStage = { type: 'issue', project: { $ne: null }, ...branchFilter };
    if (days !== 'all') {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - parseInt(days));
      matchStage.createdAt = { $gte: startDate };
    }

    const projectConsumption = await Transaction.aggregate([
      { $match: matchStage },
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
    const branchFilter = getBranchFilter(req);
    const distribution = await Material.aggregate([
      { $match: { isActive: true, ...branchFilter } },
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
// @route   GET /api/analytics/contractor-supply
// @access  Private (admin, manager)
const getContractorSupply = async (req, res, next) => {
  try {
    const { contractorId, period = 'month' } = req.query;
    const branchFilter = getBranchFilter(req);

    const now = new Date();
    const todayStart = new Date(now); todayStart.setHours(0,0,0,0);
    const weekStart  = new Date(now); weekStart.setDate(now.getDate() - 7);
    const monthStart = new Date(now); monthStart.setDate(now.getDate() - 30);

    // Determine the window for the selected period (used as the primary $match)
    let periodStart;
    switch (period) {
      case 'today': periodStart = todayStart; break;
      case 'week':  periodStart = weekStart;  break;
      case 'all':   periodStart = new Date(0); break;  // epoch = all time
      default:      periodStart = monthStart;           // 'month'
    }

    const pipeline = [
      // 1. Only issue transactions within the selected period
      { $match: { type: 'issue', createdAt: { $gte: periodStart }, ...branchFilter } },

      // 2. Join material for price calculation
      {
        $lookup: {
          from: 'materials',
          localField: 'material',
          foreignField: '_id',
          as: 'mat',
        },
      },
      { $unwind: { path: '$mat', preserveNullAndEmptyArrays: true } },

      // 3. Join materialRequest to get contractor
      {
        $lookup: {
          from: 'materialrequests',
          localField: 'materialRequest',
          foreignField: '_id',
          as: 'req',
        },
      },
      // Keep transactions even if req is empty (preserveNull) — we'll filter after
      { $unwind: { path: '$req', preserveNullAndEmptyArrays: true } },

      // 4. Drop transactions with no contractor link
      { $match: { 'req.contractor': { $exists: true, $ne: null } } },

      // 5. Group by contractor
      {
        $group: {
          _id: '$req.contractor',
          todayQty: {
            $sum: { $cond: [{ $gte: ['$createdAt', todayStart] }, '$quantity', 0] },
          },
          weekQty: {
            $sum: { $cond: [{ $gte: ['$createdAt', weekStart] }, '$quantity', 0] },
          },
          monthQty: {
            $sum: { $cond: [{ $gte: ['$createdAt', monthStart] }, '$quantity', 0] },
          },
          totalValue: {
            $sum: {
              $cond: [
                { $gt: ['$totalPrice', 0] },
                '$totalPrice',
                { $multiply: ['$quantity', { $ifNull: ['$mat.purchasePrice', 0] }] },
              ],
            },
          },
          txnCount: { $sum: 1 },
        },
      },

      // 6. Join user info
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

    let detail = null;
    if (contractorId) {
      const mongoose = require('mongoose');
      const cid = new mongoose.Types.ObjectId(contractorId);

      const topMaterials = await Transaction.aggregate([
        { $match: { type: 'issue', createdAt: { $gte: periodStart }, ...branchFilter } },
        { $lookup: { from: 'materials', localField: 'material', foreignField: '_id', as: 'mat' } },
        { $unwind: { path: '$mat', preserveNullAndEmptyArrays: true } },
        {
          $addFields: {
            computedValue: {
              $cond: [
                { $gt: ['$totalPrice', 0] },
                '$totalPrice',
                { $multiply: ['$quantity', { $ifNull: ['$mat.purchasePrice', 0] }] },
              ],
            },
          },
        },
        { $lookup: { from: 'materialrequests', localField: 'materialRequest', foreignField: '_id', as: 'req' } },
        { $unwind: { path: '$req', preserveNullAndEmptyArrays: true } },
        { $match: { 'req.contractor': cid } },
        {
          $group: {
            _id: '$material',
            unit: { $first: '$unit' },
            todayQty:  { $sum: { $cond: [{ $gte: ['$createdAt', todayStart]  }, '$quantity', 0] } },
            weekQty:   { $sum: { $cond: [{ $gte: ['$createdAt', weekStart]   }, '$quantity', 0] } },
            monthQty:  { $sum: { $cond: [{ $gte: ['$createdAt', monthStart]  }, '$quantity', 0] } },
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

      const recentRequests = await MaterialRequest.find({ contractor: cid, ...branchFilter })
        .populate('items.material', 'name unit')
        .populate('project', 'name')
        .sort('-createdAt')
        .limit(10);

      const contractorUser = await User.findById(cid).select('name email phone');

      detail = { contractor: contractorUser, topMaterials, recentRequests };
    }

    res.status(200).json({ success: true, data: { summary, detail } });
  } catch (error) {
    next(error);
  }
};


// @desc    Get Warehouse Analytics
// @route   GET /api/analytics/warehouse
// @access  Private (admin)
const getWarehouseAnalytics = async (req, res, next) => {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // 1. Material usage across branches
    const usageData = await Transaction.aggregate([
      { $match: { type: 'issue', createdAt: { $gte: thirtyDaysAgo } } },
      {
        $group: {
          _id: { material: '$material', branchId: '$branchId' },
          totalQuantity: { $sum: '$quantity' }
        }
      },
      {
        $lookup: {
          from: 'materials',
          localField: '_id.material',
          foreignField: '_id',
          as: 'materialInfo'
        }
      },
      {
        $lookup: {
          from: 'branches',
          localField: '_id.branchId',
          foreignField: '_id',
          as: 'branchInfo'
        }
      },
      { $unwind: '$materialInfo' },
      { $unwind: '$branchInfo' },
      {
        $project: {
          materialName: '$materialInfo.name',
          materialId: '$materialInfo._id',
          branchName: '$branchInfo.branchName',
          totalQuantity: 1
        }
      }
    ]);

    // Group by material
    const usageByMaterial = usageData.reduce((acc, curr) => {
      if (!acc[curr.materialName]) acc[curr.materialName] = { id: curr.materialId, branches: [], total: 0 };
      acc[curr.materialName].branches.push({ branchName: curr.branchName, quantity: curr.totalQuantity });
      acc[curr.materialName].total += curr.totalQuantity;
      return acc;
    }, {});

    // 2. Branch demand comparison (Top consuming branch)
    const demandComparison = await Transaction.aggregate([
      { $match: { type: 'issue', createdAt: { $gte: thirtyDaysAgo } } },
      {
        $group: {
          _id: '$branchId',
          totalQuantity: { $sum: '$quantity' },
          totalValue: { $sum: '$totalPrice' }
        }
      },
      { $sort: { totalValue: -1 } },
      {
        $lookup: {
          from: 'branches',
          localField: '_id',
          foreignField: '_id',
          as: 'branch'
        }
      },
      { $unwind: '$branch' },
      {
        $project: {
          branchName: '$branch.branchName',
          totalQuantity: 1,
          totalValue: 1
        }
      }
    ]);

    // 3. Restock prediction (Central Warehouse)
    const centralWarehouse = await Branch.findOne({ isCentralWarehouse: true });
    let restockPredictions = [];
    if (centralWarehouse) {
      const warehouseMaterials = await Material.find({ branchId: centralWarehouse._id, isActive: true });
      
      // Calculate average daily consumption over the last 30 days
      for (const mat of warehouseMaterials) {
        // Find total issued from branches for this material (matching name)
        // or just calculate based on how much was transferred OUT of central warehouse
        const transfersOut = await Transaction.aggregate([
          { $match: { type: 'transfer', material: mat._id, createdAt: { $gte: thirtyDaysAgo }, fromBranch: centralWarehouse._id } },
          { $group: { _id: null, totalQty: { $sum: '$quantity' } } }
        ]);

        const totalLast30Days = transfersOut[0]?.totalQty || 0;
        const dailyVelocity = totalLast30Days / 30;

        let daysUntilShortage = -1; // -1 means infinite/no data
        if (dailyVelocity > 0) {
          const daysToMin = (mat.quantity - mat.minStockLevel) / dailyVelocity;
          daysUntilShortage = Math.max(0, Math.floor(daysToMin));
        } else if (mat.quantity <= mat.minStockLevel) {
          daysUntilShortage = 0;
        }

        let recommendedPurchase = 0;
        if (daysUntilShortage !== -1 && daysUntilShortage < 15) { // Threshold for recommendation
           // Recommend enough to cover 30 days + min stock
           recommendedPurchase = Math.ceil((dailyVelocity * 30) + mat.minStockLevel - mat.quantity);
           if (recommendedPurchase < 0) recommendedPurchase = 0;
        }

        restockPredictions.push({
          materialName: mat.name,
          unit: mat.unit,
          currentStock: mat.quantity,
          minStock: mat.minStockLevel,
          dailyVelocity: dailyVelocity.toFixed(2),
          daysUntilShortage,
          recommendedPurchase,
          status: daysUntilShortage === 0 ? 'Need Restock' : (daysUntilShortage > 0 && daysUntilShortage < 15) ? 'Approaching Shortage' : 'Healthy'
        });
      }
    }

    res.status(200).json({
      success: true,
      data: {
        usageByMaterial,
        demandComparison,
        restockPredictions: restockPredictions.sort((a, b) => a.daysUntilShortage === -1 ? 1 : b.daysUntilShortage === -1 ? -1 : a.daysUntilShortage - b.daysUntilShortage)
      }
    });
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
  getWarehouseAnalytics,
};
