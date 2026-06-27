require('dotenv').config();
const mongoose = require('mongoose');
const Branch = require('../models/Branch');
const User = require('../models/User');
const Material = require('../models/Material');
const MaterialRequest = require('../models/MaterialRequest');
const Transaction = require('../models/Transaction');
const Supplier = require('../models/Supplier');

async function migrate() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('MongoDB Connected for Migration');

    // 1. Create a default branch
    let defaultBranch = await Branch.findOne({ branchName: 'Main Headquarters' });
    if (!defaultBranch) {
      defaultBranch = await Branch.create({
        branchName: 'Main Headquarters',
        location: 'HQ Location',
        address: '123 Main St, City',
        phone: '1234567890',
        status: 'active',
      });
      console.log('Created Default Branch:', defaultBranch._id);
    } else {
      console.log('Default Branch already exists:', defaultBranch._id);
    }

    const branchId = defaultBranch._id;

    // 2. Update all Users (except Admin maybe? Admins don't strictly need a branch, but let's assign them to HQ for now, or just leave admin null. Actually, the user says "Admin has access to ALL branches", so Admin doesn't need a specific branch, but let's assign everyone to HQ to be safe, except if we want Admin branchId to be null).
    // Let's just update all users that don't have a branchId.
    const userRes = await User.updateMany({ branchId: { $exists: false } }, { $set: { branchId } });
    console.log('Updated Users:', userRes.modifiedCount);

    // 3. Update all Materials
    const matRes = await Material.updateMany({ branchId: { $exists: false } }, { $set: { branchId } });
    console.log('Updated Materials:', matRes.modifiedCount);

    // 4. Update all MaterialRequests
    const reqRes = await MaterialRequest.updateMany({ branchId: { $exists: false } }, { $set: { branchId } });
    console.log('Updated MaterialRequests:', reqRes.modifiedCount);

    // 5. Update all Transactions
    const txnRes = await Transaction.updateMany({ branchId: { $exists: false } }, { $set: { branchId } });
    console.log('Updated Transactions:', txnRes.modifiedCount);

    // 6. Update all Suppliers
    const supRes = await Supplier.updateMany({ branchId: { $exists: false } }, { $set: { branchId } });
    console.log('Updated Suppliers:', supRes.modifiedCount);

    console.log('Migration Completed Successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Migration Failed:', error);
    process.exit(1);
  }
}

migrate();
