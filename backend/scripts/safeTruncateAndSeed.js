const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const User = require('../models/User');
const Branch = require('../models/Branch');
const Material = require('../models/Material');
const Supplier = require('../models/Supplier');
const Project = require('../models/Project');
const Transaction = require('../models/Transaction');
const MaterialTransfer = require('../models/MaterialTransfer');
const MaterialRequest = require('../models/MaterialRequest');

const truncateAndSeed = async () => {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to Database. Commencing safe truncation...');

    const report = {
      transactions: 0,
      materialTransfers: 0,
      materialRequests: 0,
      projects: 0,
      materials: 0,
      suppliers: 0,
      users: 0,
      branches: 0,
    };

    // Note: Local MongoDB instances might not support multi-document transactions unless replica sets are configured.
    // So we safely execute sequentially from leaves to roots.
    
    // 1. Transactions (depends on mostly everything)
    const tRes = await Transaction.deleteMany({});
    report.transactions = tRes.deletedCount;

    // 2. Material Transfers
    const mtRes = await MaterialTransfer.deleteMany({});
    report.materialTransfers = mtRes.deletedCount;

    // 3. Material Requests
    const mrRes = await MaterialRequest.deleteMany({});
    report.materialRequests = mrRes.deletedCount;

    // 4. Projects
    const pRes = await Project.deleteMany({});
    report.projects = pRes.deletedCount;

    // 5. Materials
    const mRes = await Material.deleteMany({});
    report.materials = mRes.deletedCount;

    // 6. Suppliers
    const sRes = await Supplier.deleteMany({});
    report.suppliers = sRes.deletedCount;

    // 7. Users
    const uRes = await User.deleteMany({});
    report.users = uRes.deletedCount;

    // 8. Branches
    const bRes = await Branch.deleteMany({});
    report.branches = bRes.deletedCount;

    console.log('Truncation complete. Generating Report...');
    console.log('----------------------------------------------------');
    console.log('TRUNCATION REPORT');
    console.log('----------------------------------------------------');
    for (const [collection, count] of Object.entries(report)) {
      console.log(`- ${collection}: Removed ${count} records`);
    }
    console.log('----------------------------------------------------');

    console.log('Seeding minimal required default data...');

    // A. Seed Central Warehouse Branch
    const centralWarehouse = await Branch.create({
      branchName: 'Central Warehouse',
      location: 'HQ',
      address: 'Main Company HQ',
      phone: '1234567890',
      status: 'active',
      isCentralWarehouse: true,
    });
    console.log('✅ Default Central Warehouse created.');

    // B. Seed Admin User
    const adminUser = await User.create({
      name: 'Admin User',
      email: 'admin@construction.com',
      password: 'admin123', // Model pre-save hook will hash this
      role: 'admin',
      phone: '9876543210',
      isActive: true,
      isVerified: true
    });
    console.log('✅ Default Admin user created (admin@construction.com).');

    console.log('----------------------------------------------------');
    console.log('Operation complete. Database has been safely reset.');
    process.exit(0);

  } catch (error) {
    console.error('Critical Error during Truncation/Seeding:', error);
    process.exit(1);
  }
};

truncateAndSeed();
