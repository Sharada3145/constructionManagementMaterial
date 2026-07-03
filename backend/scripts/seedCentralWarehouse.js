const mongoose = require('mongoose');
const dotenv = require('dotenv');

// Load env vars
dotenv.config({ path: '../.env' });

const Branch = require('../models/Branch');
const Supplier = require('../models/Supplier');
const Material = require('../models/Material');

mongoose.connect(process.env.MONGO_URI);

const migrate = async () => {
  try {
    console.log('Starting Central Warehouse migration...');

    // 1. Create or get Central Warehouse
    let centralWarehouse = await Branch.findOne({ isCentralWarehouse: true });
    
    if (!centralWarehouse) {
      console.log('Creating Central Warehouse...');
      centralWarehouse = await Branch.create({
        branchName: 'Central Warehouse',
        location: 'HQ',
        address: 'Main Company HQ',
        phone: '1234567890',
        status: 'active',
        isCentralWarehouse: true,
      });
      console.log('Central Warehouse created:', centralWarehouse._id);
    } else {
      console.log('Central Warehouse already exists:', centralWarehouse._id);
    }

    // 2. Unset branchId from all suppliers
    console.log('Migrating suppliers to Central Warehouse...');
    const suppliersUpdate = await Supplier.updateMany(
      { branchId: { $exists: true } },
      { $unset: { branchId: "" } }
    );
    console.log(`Updated ${suppliersUpdate.modifiedCount} suppliers to be global.`);

    console.log('Migration completed successfully');
    process.exit();
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

migrate();
