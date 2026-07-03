const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const Material = require('../models/Material');
const Transaction = require('../models/Transaction');
const MaterialTransfer = require('../models/MaterialTransfer');
const Branch = require('../models/Branch');
const User = require('../models/User');
const Supplier = require('../models/Supplier');

const seed = async () => {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI);

    console.log('Truncating Materials, Transactions, and Transfers...');
    await Material.deleteMany({});
    await Transaction.deleteMany({});
    await MaterialTransfer.deleteMany({});

    // Ensure we have a Central Warehouse
    let centralWarehouse = await Branch.findOne({ isCentralWarehouse: true });
    if (!centralWarehouse) {
      centralWarehouse = await Branch.create({
        branchName: 'Central Warehouse',
        location: 'HQ',
        address: 'HQ Address',
        phone: '1234567890',
        status: 'active',
        isCentralWarehouse: true,
      });
      console.log('Created Central Warehouse');
    }

    // Get other branches
    const otherBranches = await Branch.find({ isCentralWarehouse: { $ne: true } }).limit(2);
    if (otherBranches.length === 0) {
      console.log('No other branches found. Please create branches first.');
      process.exit(1);
    }

    const admin = await User.findOne({ role: 'admin' });
    const adminId = admin ? admin._id : null;

    // Dummy Suppliers
    let supplier = await Supplier.findOne();
    if (!supplier) {
      supplier = await Supplier.create({ name: 'Alpha Suppliers', phone: '9998887776', email: 'alpha@test.com' });
    }

    console.log('Creating initial stock in Central Warehouse...');
    
    const matDetails = [
      { name: 'UltraTech Cement 53 Grade', category: 'Cement & Concrete', unit: 'bags', quantity: 1000, price: 400 },
      { name: 'TMT Steel Rods 16mm', category: 'Steel & Iron', unit: 'tonnes', quantity: 50, price: 56000 },
      { name: 'Red Bricks', category: 'Bricks & Blocks', unit: 'pieces', quantity: 10000, price: 8 },
    ];

    const centralMaterials = [];

    for (let mat of matDetails) {
      const createdMat = await Material.create({
        name: mat.name,
        category: mat.category,
        unit: mat.unit,
        quantity: mat.quantity,
        minStockLevel: 50,
        purchasePrice: mat.price,
        description: `Premium ${mat.name}`,
        supplier: supplier._id,
        branchId: centralWarehouse._id,
        isActive: true
      });
      centralMaterials.push(createdMat);

      await Transaction.create({
        type: 'purchase',
        material: createdMat._id,
        quantity: mat.quantity,
        unit: mat.unit,
        previousStock: 0,
        newStock: mat.quantity,
        branchId: centralWarehouse._id,
        performedBy: adminId,
        notes: 'Initial bulk purchase into Central Warehouse',
      });
    }

    console.log('Distributing stock from Central Warehouse to Branches...');

    // Distribution logic
    for (let i = 0; i < otherBranches.length; i++) {
      const branch = otherBranches[i];
      const itemsToTransfer = [
        { material: centralMaterials[0]._id, quantity: 200, unit: 'bags' },
        { material: centralMaterials[1]._id, quantity: 10, unit: 'tonnes' }
      ];

      const transfer = new MaterialTransfer({
        fromBranch: centralWarehouse._id,
        toBranch: branch._id,
        items: itemsToTransfer,
        notes: `Initial distribution to ${branch.branchName}`,
        status: 'approved',
        requestedBy: adminId,
        approvedBy: adminId,
        approvedAt: Date.now(),
      });

      for (let item of itemsToTransfer) {
        // Deduct from central
        const cMat = await Material.findById(item.material);
        const cPrev = cMat.quantity;
        cMat.quantity -= item.quantity;
        await cMat.save();

        await Transaction.create({
          type: 'transfer',
          material: cMat._id,
          quantity: item.quantity,
          unit: item.unit,
          previousStock: cPrev,
          newStock: cMat.quantity,
          fromBranch: centralWarehouse._id,
          toBranch: branch._id,
          branchId: centralWarehouse._id,
          performedBy: adminId,
          notes: `Transferred OUT to ${branch.branchName}`,
        });

        // Add to branch
        let bMat = await Material.findOne({ name: cMat.name, branchId: branch._id });
        let bPrev = 0;
        if (!bMat) {
          bMat = await Material.create({
            name: cMat.name,
            category: cMat.category,
            unit: cMat.unit,
            quantity: item.quantity,
            minStockLevel: 10,
            purchasePrice: cMat.purchasePrice,
            description: cMat.description,
            branchId: branch._id,
            isActive: true
          });
        } else {
          bPrev = bMat.quantity;
          bMat.quantity += item.quantity;
          await bMat.save();
        }

        await Transaction.create({
          type: 'transfer',
          material: bMat._id,
          quantity: item.quantity,
          unit: item.unit,
          previousStock: bPrev,
          newStock: bMat.quantity,
          fromBranch: centralWarehouse._id,
          toBranch: branch._id,
          branchId: branch._id,
          performedBy: adminId,
          notes: `Transferred IN from Central Warehouse`,
        });
      }

      await transfer.save();
      console.log(`Transferred to ${branch.branchName}`);
    }

    console.log('Simulating Consumption at Branches...');
    // Simulate consumption
    for (let i = 0; i < otherBranches.length; i++) {
      const branch = otherBranches[i];
      // Find cement in branch
      const bMat = await Material.findOne({ name: centralMaterials[0].name, branchId: branch._id });
      if (bMat) {
        const consumedQty = 50;
        const bPrev = bMat.quantity;
        bMat.quantity -= consumedQty;
        await bMat.save();

        await Transaction.create({
          type: 'issue',
          material: bMat._id,
          quantity: consumedQty,
          unit: bMat.unit,
          previousStock: bPrev,
          newStock: bMat.quantity,
          branchId: branch._id,
          performedBy: adminId,
          notes: `Daily consumption on site`,
        });
      }
    }

    console.log('Seeding completed successfully! Data perfectly records central-to-branch flow.');
    process.exit();
  } catch (error) {
    console.error('Seeding failed:', error);
    process.exit(1);
  }
};

seed();
