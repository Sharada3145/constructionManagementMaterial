// distributeRandomStock.js – one‑off script to randomly allocate Central Warehouse inventory to all active branches
// Usage: node backend/scripts/distributeRandomStock.js
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const User = require('../models/User');
const Branch = require('../models/Branch');
const Material = require('../models/Material');
const MaterialTransfer = require('../models/MaterialTransfer');
const Transaction = require('../models/Transaction');

function getRandomIntInclusive(min, max) {
  // inclusive bounds
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

(async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');

    const central = await Branch.findOne({ isCentralWarehouse: true });
    if (!central) throw new Error('Central Warehouse not found');

    const adminUser = await User.findOne({ role: 'admin' });
    if (!adminUser) throw new Error('Admin user not found to record performedBy');

    const branches = await Branch.find({ _id: { $ne: central._id }, status: 'active' });
    if (!branches.length) {
      console.log('⚠️ No other active branches found');
      process.exit(0);
    }
    console.log(`📦 Distributing stock randomly to ${branches.length} branches`);

    const warehouseMats = await Material.find({ branchId: central._id, quantity: { $gt: 0 }, isActive: true });
    if (!warehouseMats.length) {
      console.log('🏷️ No stocked materials in the Central Warehouse');
      process.exit(0);
    }

    for (const whMat of warehouseMats) {
      let remainingQty = whMat.quantity;
      console.log(`🔧 Processing ${whMat.name} – total ${remainingQty}`);

      // Continue allocating randomly until stock is exhausted
      while (remainingQty > 0) {
        // Pick a random branch
        const randIdx = getRandomIntInclusive(0, branches.length - 1);
        const branch = branches[randIdx];

        // Random qty (at least 1, at most remainingQty)
        const qtyToTransfer = getRandomIntInclusive(1, remainingQty);

        // Update warehouse material
        const beforeWarehouseQty = whMat.quantity;
        whMat.quantity -= qtyToTransfer;
        await whMat.save();
        remainingQty = whMat.quantity;

        // Create / update material in destination branch
        let branchMat = await Material.findOne({ name: whMat.name, branchId: branch._id });
        const beforeBranchQty = branchMat ? branchMat.quantity : 0;
        if (!branchMat) {
          branchMat = await Material.create({
            name: whMat.name,
            category: whMat.category,
            unit: whMat.unit,
            quantity: qtyToTransfer,
            minStockLevel: whMat.minStockLevel,
            purchasePrice: whMat.purchasePrice,
            description: whMat.description,
            branchId: branch._id,
          });
        } else {
          branchMat.quantity += qtyToTransfer;
          await branchMat.save();
        }

        // Log outgoing transaction (warehouse)
        await Transaction.create({
          type: 'transfer',
          material: whMat._id,
          quantity: qtyToTransfer,
          unit: whMat.unit,
          previousStock: beforeWarehouseQty,
          newStock: whMat.quantity,
          fromBranch: central._id,
          toBranch: branch._id,
          branchId: central._id,
          performedBy: adminUser._id,
          notes: `Randomly distributed to ${branch.branchName}`,
        });

        // Log incoming transaction (branch)
        await Transaction.create({
          type: 'transfer',
          material: branchMat._id,
          quantity: qtyToTransfer,
          unit: branchMat.unit,
          previousStock: beforeBranchQty,
          newStock: branchMat.quantity,
          fromBranch: central._id,
          toBranch: branch._id,
          branchId: branch._id,
          performedBy: adminUser._id,
          notes: `Received from Central Warehouse (random distribution)`,
        });

        // Create a transfer record for audit (one per branch allocation)
        await MaterialTransfer.create({
          fromBranch: central._id,
          toBranch: branch._id,
          items: [{ material: branchMat._id, quantity: qtyToTransfer, unit: branchMat.unit }],
          status: 'approved',
          requestedBy: null,
          approvedBy: null,
          approvedAt: Date.now(),
        });
      }
    }

    console.log('✅ Random distribution complete');
    process.exit(0);
  } catch (err) {
    console.error('❌ Error during random distribution:', err);
    process.exit(1);
  }
})();
