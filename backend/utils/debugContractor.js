require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const Transaction = require('../models/Transaction');

mongoose.connect(process.env.MONGO_URI, { tlsAllowInvalidCertificates: true }).then(async () => {
  const now = new Date();
  const todayStart = new Date(now); todayStart.setHours(0,0,0,0);
  const weekStart = new Date(now); weekStart.setDate(now.getDate() - 7);
  const monthStart = new Date(now); monthStart.setDate(now.getDate() - 30);

  const pipeline = [
    { $match: { type: 'issue', createdAt: { $gte: monthStart } } },
    { $lookup: { from: 'materials', localField: 'material', foreignField: '_id', as: 'mat' } },
    { $unwind: '$mat' },
    { $addFields: { computedValue: { $multiply: ['$quantity', { $ifNull: ['$mat.purchasePrice', 0] }] } } },
    { $lookup: { from: 'materialrequests', localField: 'materialRequest', foreignField: '_id', as: 'req' } },
    { $unwind: '$req' },
    { $group: {
      _id: '$req.contractor',
      todayQty: { $sum: { $cond: [{ $gte: ['$createdAt', todayStart] }, '$quantity', 0] } },
      weekQty: { $sum: { $cond: [{ $gte: ['$createdAt', weekStart] }, '$quantity', 0] } },
      monthQty: { $sum: '$quantity' },
      totalValue: { $sum: '$computedValue' },
      txnCount: { $sum: 1 },
    }},
    { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'contractor' } },
    { $unwind: '$contractor' },
    { $project: { contractorId: '$_id', name: '$contractor.name', todayQty: 1, weekQty: 1, monthQty: 1, totalValue: 1, txnCount: 1 } },
    { $sort: { totalValue: -1 } },
  ];

  const result = await Transaction.aggregate(pipeline);
  console.log('\n✅ Fixed aggregation result:');
  result.forEach(r => {
    console.log(`  ${r.name}: today=${r.todayQty} week=${r.weekQty} month=${r.monthQty} value=₹${r.totalValue} txns=${r.txnCount}`);
  });
  process.exit(0);
}).catch(e => { console.error('ERROR:', e.message); process.exit(1); });
