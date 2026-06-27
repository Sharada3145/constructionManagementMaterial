const mongoose = require('mongoose');
require('dotenv').config({path: './.env'});
mongoose.connect(process.env.MONGO_URI).then(async () => {
  const Transaction = require('./models/Transaction');
  require('./models/MaterialRequest');
  
  // Verify collection names
  const MaterialRequest = require('./models/MaterialRequest');
  console.log("MaterialRequest collection name:", MaterialRequest.collection.collectionName);

  // Run the exact same aggregation as the controller
  const monthStart = new Date();
  monthStart.setFullYear(monthStart.getFullYear() - 10);
  
  const pipeline = [
    { $match: { type: 'issue', createdAt: { $gte: monthStart } } },
    { $lookup: { from: 'materials', localField: 'material', foreignField: '_id', as: 'mat' } },
    { $unwind: '$mat' },
    { $addFields: { computedValue: { $multiply: ['$quantity', { $ifNull: ['$mat.purchasePrice', 0] }] } } },
    { $lookup: { from: 'materialrequests', localField: 'materialRequest', foreignField: '_id', as: 'req' } },
    { $unwind: '$req' },
    { $group: { _id: '$req.contractor', txnCount: { $sum: 1 }, totalValue: { $sum: '$computedValue' } } },
    { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'contractor' } },
    { $unwind: '$contractor' },
    { $project: { contractorId: '$_id', name: '$contractor.name', txnCount: 1, totalValue: 1 } }
  ];
  
  const summary = await Transaction.aggregate(pipeline);
  console.log("Summary count:", summary.length);
  console.log("Summary:", JSON.stringify(summary, null, 2));
  
  process.exit();
});
