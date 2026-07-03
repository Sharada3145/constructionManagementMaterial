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

const backup = async () => {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected.');

    const collections = {
      users: await User.find({}).lean(),
      branches: await Branch.find({}).lean(),
      materials: await Material.find({}).lean(),
      suppliers: await Supplier.find({}).lean(),
      projects: await Project.find({}).lean(),
      transactions: await Transaction.find({}).lean(),
      materialTransfers: await MaterialTransfer.find({}).lean(),
      materialRequests: await MaterialRequest.find({}).lean(),
    };

    const backupDir = path.join(__dirname, '../backups');
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = path.join(backupDir, `backup-${timestamp}.json`);

    fs.writeFileSync(backupPath, JSON.stringify(collections, null, 2));

    console.log(`Backup successfully created at ${backupPath}`);
    process.exit(0);
  } catch (error) {
    console.error('Backup failed:', error);
    process.exit(1);
  }
};

backup();
