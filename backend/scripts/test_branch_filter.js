const mongoose = require('mongoose');
require('dotenv').config();
mongoose.connect(process.env.MONGO_URI).then(async () => {
  const Transaction = require('../models/Transaction');
  const branchIdStr = '6a3f4e47d86140a2d7d94e1d';
  
  // Test aggregate with STRING branchId (what getBranchFilter returns from header)
  const r1 = await Transaction.aggregate([
    { $match: { type: 'issue', branchId: branchIdStr } },
    { $count: 'total' }
  ]);
  console.log('Aggregate with STRING branchId:', JSON.stringify(r1));
  
  // Test aggregate with ObjectId
  const r2 = await Transaction.aggregate([
    { $match: { type: 'issue', branchId: new mongoose.Types.ObjectId(branchIdStr) } },
    { $count: 'total' }
  ]);
  console.log('Aggregate with ObjectId branchId:', JSON.stringify(r2));
  
  process.exit(0);
}).catch(e => { console.error(e.message); process.exit(1); });
