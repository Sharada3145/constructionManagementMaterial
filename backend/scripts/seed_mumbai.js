const mongoose = require('mongoose');
require('dotenv').config();

const Branch = require('../models/Branch');
const User = require('../models/User');
const Supplier = require('../models/Supplier');
const Project = require('../models/Project');
const Material = require('../models/Material');
const Transaction = require('../models/Transaction');
const MaterialRequest = require('../models/MaterialRequest');

const seedMumbaiBranch = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    const mumbaiBranchId = '6a3f51d5413d421000db15bd';

    // Cleanup partial runs first
    await Supplier.deleteMany({ branchId: mumbaiBranchId });
    await User.deleteMany({ email: { $in: ['arjun.mumbai@contractors.com', 'priya.const@mumbai.com'] } });
    await Project.deleteMany({ branchId: mumbaiBranchId });
    await Material.deleteMany({ branchId: mumbaiBranchId });
    await Transaction.deleteMany({ branchId: mumbaiBranchId });
    await MaterialRequest.deleteMany({ branchId: mumbaiBranchId });
    console.log('Cleaned up existing Mumbai branch data');

    // 1. Create Suppliers
    const suppliers = await Supplier.insertMany([
      { name: 'Mumbai Cement Co', contactPerson: 'Ravi Desai', email: 'ravi@mumbaicement.com', phone: '9876543200', address: 'Andheri West, Mumbai', status: 'active', branchId: mumbaiBranchId },
      { name: 'Dharavi Steels Ltd', contactPerson: 'Sanjay Dutt', email: 'sanjay@dharavisteels.com', phone: '9876543201', address: 'Dharavi, Mumbai', status: 'active', branchId: mumbaiBranchId },
      { name: 'Navi Mumbai Hardware', contactPerson: 'Amit Patel', email: 'amit@nmhardware.com', phone: '9876543202', address: 'Vashi, Navi Mumbai', status: 'active', branchId: mumbaiBranchId },
    ]);
    console.log(`Created ${suppliers.length} suppliers`);

    // 2. Create Contractors
    const contractors = await User.insertMany([
      { name: 'Arjun Singh', email: 'arjun.mumbai@contractors.com', password: 'password123', role: 'contractor', phone: '9876543210', branchId: mumbaiBranchId, isActive: true, isVerified: true },
      { name: 'Priya Constructions', email: 'priya.const@mumbai.com', password: 'password123', role: 'contractor', phone: '9876543211', branchId: mumbaiBranchId, isActive: true, isVerified: true },
    ]);
    console.log(`Created ${contractors.length} contractors`);

    // 3. Create Projects
    const projects = await Project.insertMany([
      { name: 'Marine Drive Renovation', clientName: 'BMC', location: 'Marine Drive, Mumbai', status: 'in_progress', startDate: new Date('2026-05-01'), branchId: mumbaiBranchId },
      { name: 'Bandra Tech Park', clientName: 'Reliance', location: 'Bandra Kurla Complex', status: 'in_progress', startDate: new Date('2026-06-01'), branchId: mumbaiBranchId },
    ]);
    console.log(`Created ${projects.length} projects`);

    // 4. Create Materials
    const materials = await Material.insertMany([
      { name: 'UltraTech Cement (50kg)', category: 'Cement & Concrete', minStockLevel: 50, quantity: 0, unit: 'bags', purchasePrice: 420, supplier: suppliers[0]._id, branchId: mumbaiBranchId, isActive: true },
      { name: 'Tata Tiscon TMT Bar (12mm)', category: 'Steel & Iron', minStockLevel: 100, quantity: 0, unit: 'kg', purchasePrice: 75, supplier: suppliers[1]._id, branchId: mumbaiBranchId, isActive: true },
      { name: 'Asian Paints Apex (20L)', category: 'Paint & Coatings', minStockLevel: 20, quantity: 0, unit: 'liters', purchasePrice: 3200, supplier: suppliers[2]._id, branchId: mumbaiBranchId, isActive: true },
      { name: 'Red Bricks (Premium)', category: 'Bricks & Blocks', minStockLevel: 1000, quantity: 0, unit: 'pieces', purchasePrice: 12, supplier: suppliers[0]._id, branchId: mumbaiBranchId, isActive: true },
    ]);
    console.log(`Created ${materials.length} materials`);

    // Find admin user to act as performer
    const admin = await User.findOne({ role: 'admin' });

    // Helper for random dates within last 30 days
    const randomDate = (start, end) => new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
    const now = new Date();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(now.getDate() - 30);

    // 5. Create Purchases
    for (const mat of materials) {
      const pQty = mat.minStockLevel * 3 + Math.floor(Math.random() * 50);
      const pDate = randomDate(thirtyDaysAgo, new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000));
      
      const txn = new Transaction({
        type: 'purchase',
        material: mat._id,
        quantity: pQty,
        unit: mat.unit,
        unitPrice: mat.purchasePrice,
        totalPrice: pQty * mat.purchasePrice,
        previousStock: 0,
        newStock: pQty,
        supplier: mat.supplier,
        project: projects[0]._id,
        performedBy: admin._id,
        notes: 'Initial stock setup for Mumbai',
        branchId: mumbaiBranchId,
        createdAt: pDate,
        updatedAt: pDate,
      });
      await txn.save();
      
      mat.quantity = pQty;
      await mat.save();
    }
    console.log('Created purchase transactions and updated stock');

    // 6. Create Material Requests & Issues
    for (let i = 0; i < 8; i++) {
      const contractor = contractors[i % contractors.length];
      const project = projects[i % projects.length];
      
      // Request 1-2 materials
      const items = [];
      const numItems = Math.floor(Math.random() * 2) + 1;
      
      for (let j = 0; j < numItems; j++) {
        const mat = materials[(i + j) % materials.length];
        const reqQty = Math.floor(mat.minStockLevel * 0.5) + 5;
        items.push({
          material: mat._id,
          requestedQuantity: reqQty,
          approvedQuantity: reqQty,
          unit: mat.unit,
        });
      }

      const reqDate = randomDate(new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000), now);
      
      const request = new MaterialRequest({
        contractor: contractor._id,
        project: project._id,
        items,
        status: 'issued',
        notes: `Requirement for ${project.name}`,
        branchId: mumbaiBranchId,
        createdAt: reqDate,
        updatedAt: reqDate,
      });
      await request.save();

      // Create issue transactions for this request
      for (const item of items) {
        const mat = await Material.findById(item.material);
        const prevStock = mat.quantity;
        const newStock = prevStock - item.approvedQuantity;
        
        const txn = new Transaction({
          type: 'issue',
          material: mat._id,
          quantity: item.approvedQuantity,
          unit: item.unit,
          unitPrice: mat.purchasePrice,
          totalPrice: item.approvedQuantity * mat.purchasePrice,
          previousStock: prevStock,
          newStock: newStock,
          materialRequest: request._id,
          project: project._id,
          performedBy: admin._id,
          notes: 'Issued for ' + project.name,
          branchId: mumbaiBranchId,
          createdAt: reqDate,
          updatedAt: reqDate,
        });
        await txn.save();
        
        mat.quantity = newStock;
        await mat.save();
      }
    }
    console.log('Created material requests and issue transactions');
    
    console.log('Successfully seeded dummy data for Mumbai branch!');
    process.exit(0);
  } catch (error) {
    console.error('Seeding error:', error);
    process.exit(1);
  }
};

seedMumbaiBranch();
