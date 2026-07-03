// seed_contractors_and_issues.js – populate contractors and issue random material requests for analytics
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const User = require('../models/User');
const Branch = require('../models/Branch');
const Material = require('../models/Material');
const MaterialRequest = require('../models/MaterialRequest');
const Transaction = require('../models/Transaction');

function getRandomIntInclusive(min, max) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

(async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');

    const adminUser = await User.findOne({ role: 'admin' });
    if (!adminUser) throw new Error('Admin user not found');

    // Create contractor users for each active branch (excluding central warehouse)
    const branches = await Branch.find({ isCentralWarehouse: { $ne: true }, status: 'active' });
    for (const branch of branches) {
      const email = `${branch.branchName.replace(/\s+/g, '').toLowerCase()}@contractor.com`;
      let contractor = await User.findOne({ email });
      if (!contractor) {
        contractor = await User.create({
          name: `${branch.branchName} Contractor`,
          email,
          password: 'contractor123', // hashed by pre‑save hook
          role: 'contractor',
          branchId: branch._id,
          phone: '+91 9000000000',
        });
        console.log(`Created contractor ${contractor.email}`);
      }
    }

    // Issue random material requests for each contractor
    const contractors = await User.find({ role: 'contractor' });
    for (const contractor of contractors) {
      const branchId = contractor.branchId;
      const availableMats = await Material.find({ branchId, quantity: { $gt: 0 }, isActive: true });
      if (!availableMats.length) continue;

      const itemsCount = getRandomIntInclusive(1, Math.min(3, availableMats.length));
      const shuffled = availableMats.sort(() => Math.random() - 0.5);
      const selected = shuffled.slice(0, itemsCount);

      const issueItems = [];
      for (const mat of selected) {
        const maxIssue = Math.min(mat.quantity, getRandomIntInclusive(1, Math.min(20, mat.quantity)));
        if (maxIssue <= 0) continue;
        issueItems.push({
          material: mat._id,
          requestedQuantity: maxIssue,
          unit: mat.unit,
        });
        const prevQty = mat.quantity;
        mat.quantity -= maxIssue;
        await mat.save();
        await Transaction.create({
          type: 'issue',
          material: mat._id,
          quantity: maxIssue,
          unit: mat.unit,
          previousStock: prevQty,
          newStock: mat.quantity,
          performedBy: adminUser._id,
          branchId,
          notes: `Issued to contractor ${contractor.email}`,
        });
      }

      if (issueItems.length) {
        await MaterialRequest.create({
          contractor: contractor._id,
          priority: 'medium',
          status: 'issued',
          reviewedBy: adminUser._id,
          reviewedAt: new Date(),
          branchId,
          items: issueItems.map(i => ({
            material: i.material,
            requestedQuantity: i.requestedQuantity,
            approvedQuantity: i.requestedQuantity,
            unit: i.unit,
          })),
        });
        console.log(`Issued materials to contractor ${contractor.email}`);
      }
    }

    console.log('✅ Contractor seeding and issue generation complete');
    process.exit(0);
  } catch (err) {
    console.error('❌ Error during seeding:', err);
    process.exit(1);
  }
})();
