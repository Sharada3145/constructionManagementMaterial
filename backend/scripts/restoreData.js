const mongoose = require('mongoose');
const dotenv = require('dotenv');
const fs = require('fs');
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

const restore = async () => {
  const backupFile = process.argv[2];
  if (!backupFile) {
    console.error('Please provide the backup file path as an argument. Example: node restoreData.js ../backups/backup-xxxx.json');
    process.exit(1);
  }

  try {
    console.log(`Connecting to MongoDB...`);
    await mongoose.connect(process.env.MONGO_URI);
    
    console.log(`Reading backup file from ${backupFile}...`);
    const backupPath = path.resolve(__dirname, backupFile);
    const data = JSON.parse(fs.readFileSync(backupPath, 'utf-8'));

    console.log('Clearing existing data before restore...');
    await User.deleteMany({});
    await Branch.deleteMany({});
    await Material.deleteMany({});
    await Supplier.deleteMany({});
    await Project.deleteMany({});
    await Transaction.deleteMany({});
    await MaterialTransfer.deleteMany({});
    await MaterialRequest.deleteMany({});

    console.log('Restoring collections...');
    if (data.users && data.users.length) await User.insertMany(data.users);
    if (data.branches && data.branches.length) await Branch.insertMany(data.branches);
    if (data.materials && data.materials.length) await Material.insertMany(data.materials);
    if (data.suppliers && data.suppliers.length) await Supplier.insertMany(data.suppliers);
    if (data.projects && data.projects.length) await Project.insertMany(data.projects);
    if (data.transactions && data.transactions.length) await Transaction.insertMany(data.transactions);
    if (data.materialTransfers && data.materialTransfers.length) await MaterialTransfer.insertMany(data.materialTransfers);
    if (data.materialRequests && data.materialRequests.length) await MaterialRequest.insertMany(data.materialRequests);

    console.log('Restore successfully completed!');
    process.exit(0);
  } catch (error) {
    console.error('Restore failed:', error);
    process.exit(1);
  }
};

restore();
