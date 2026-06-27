const mongoose = require('mongoose');
require('dotenv').config();

mongoose.connect(process.env.MONGO_URI).then(async () => {
  const Transaction = require('../models/Transaction');
  const MaterialRequest = require('../models/MaterialRequest');

  const count = await Transaction.countDocuments({ type: 'issue' });
  const withReq = await Transaction.countDocuments({ type: 'issue', materialRequest: { $exists: true, $ne: null } });
  const withPrice = await Transaction.countDocuments({ type: 'issue', totalPrice: { $gt: 0 } });
  const mrCount = await MaterialRequest.countDocuments({ status: 'issued' });

  console.log('Total issue transactions:', count);
  console.log('With materialRequest linked:', withReq);
  console.log('With totalPrice > 0:', withPrice);
  console.log('Total issued material requests:', mrCount);

  // Sample a transaction to see its shape
  const sample = await Transaction.findOne({ type: 'issue' }).lean();
  console.log('\nSample issue transaction:');
  console.log(JSON.stringify(sample, null, 2));

  // Test the aggregation pipeline
  const now = new Date();
  const monthStart = new Date(now); monthStart.setDate(now.getDate() - 30);

  const result = await Transaction.aggregate([
    { $match: { type: 'issue', createdAt: { $gte: new Date(0) } } },
    { $lookup: { from: 'materials', localField: 'material', foreignField: '_id', as: 'mat' } },
    { $unwind: { path: '$mat', preserveNullAndEmptyArrays: true } },
    { $lookup: { from: 'materialrequests', localField: 'materialRequest', foreignField: '_id', as: 'req' } },
    { $unwind: { path: '$req', preserveNullAndEmptyArrays: true } },
    { $match: { 'req.contractor': { $exists: true, $ne: null } } },
    {
      $group: {
        _id: '$req.contractor',
        txnCount: { $sum: 1 },
        monthQty: { $sum: { $cond: [{ $gte: ['$createdAt', monthStart] }, '$quantity', 0] } },
        totalValue: {
          $sum: {
            $cond: [
              { $gt: ['$totalPrice', 0] },
              '$totalPrice',
              { $multiply: ['$quantity', { $ifNull: ['$mat.purchasePrice', 0] }] },
            ],
          },
        },
      }
    },
    { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'contractor' } },
    { $unwind: '$contractor' },
    { $project: { name: '$contractor.name', txnCount: 1, monthQty: 1, totalValue: 1 } }
  ]);

  console.log('\nAggregation result:', JSON.stringify(result, null, 2));
  process.exit(0);
}).catch(e => { console.error(e.message); process.exit(1); });
