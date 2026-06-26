require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const Transaction = require('../models/Transaction');
const Material = require('../models/Material');

mongoose.connect(process.env.MONGO_URI, { tlsAllowInvalidCertificates: true }).then(async () => {
  // Test Consumption
  let startDate = new Date();
  startDate.setDate(startDate.getDate() - 30);
  const consumption = await Transaction.aggregate([
    { $match: { type: 'issue', createdAt: { $gte: startDate } } },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
        totalQuantity: { $sum: '$quantity' },
        totalValue: { $sum: '$totalPrice' },
        count: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
  ]);
  console.log('Consumption:', consumption);

  // Test Top Materials
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
    { $limit: 5 },
    { $lookup: { from: 'materials', localField: '_id', foreignField: '_id', as: 'material' } },
    { $unwind: '$material' },
    {
      $project: {
        materialName: '$material.name',
        totalQuantity: 1,
      },
    },
  ]);
  console.log('Top Materials:', topMaterials);

  // Test Category Dist
  const catDist = await Material.aggregate([
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
  console.log('Category Dist:', catDist);

  process.exit(0);
}).catch(e => { console.error('ERROR:', e.message); process.exit(1); });
