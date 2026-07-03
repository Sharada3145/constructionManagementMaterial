const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const Branch = require('../models/Branch');
const Supplier = require('../models/Supplier');
const Material = require('../models/Material');
const Transaction = require('../models/Transaction');
const User = require('../models/User');

// Category & unit mappings to valid schema enums
// Valid categories: 'Cement & Concrete','Sand & Aggregates','Bricks & Blocks','Steel & Iron',
//   'Tiles & Flooring','Paint & Coatings','Pipes & Fittings','Electrical','Wood & Timber','Plumbing','Hardware','Other'
// Valid units: 'kg','bags','tonnes','pieces','meters','liters','cubic_meters','sq_ft','bundles'

const SUPPLIERS_DATA = [
  {
    name: 'BuildMate Cement Suppliers',
    contactPerson: 'Ravi Sharma',
    email: 'sales@buildmate.com',
    phone: '9900011001',
    address: 'Industrial Area, Hyderabad',
    materialsSupplied: ['Cement'],
    rating: 5,
  },
  {
    name: 'Shree Sai Steel Traders',
    contactPerson: 'Suresh Sai',
    email: 'orders@shreesai.com',
    phone: '9900011002',
    address: 'Steel Market, Mumbai',
    materialsSupplied: ['Steel', 'Binding Wire'],
    rating: 5,
  },
  {
    name: 'Southern Aggregates & Sand Co.',
    contactPerson: 'Lakshmi Nair',
    email: 'info@southernagg.com',
    phone: '9900011003',
    address: 'Quarry Road, Bangalore',
    materialsSupplied: ['Sand', 'Aggregate'],
    rating: 4,
  },
  {
    name: 'Krishna Bricks Industries',
    contactPerson: 'Gopal Krishna',
    email: 'supply@krishnabricks.com',
    phone: '9900011004',
    address: 'Brick Kiln Road, Hyderabad',
    materialsSupplied: ['Bricks', 'Blocks'],
    rating: 4,
  },
  {
    name: 'Metro Pipes & Plumbing Solutions',
    contactPerson: 'Arun Mehta',
    email: 'metro@pipes.com',
    phone: '9900011005',
    address: 'Hardware Zone, Pune',
    materialsSupplied: ['GI Pipes', 'PVC Pipes'],
    rating: 4,
  },
  {
    name: 'Elite Electrical Supplies',
    contactPerson: 'Deepak Jain',
    email: 'elite@electrical.com',
    phone: '9900011006',
    address: 'Electrical Market, Delhi',
    materialsSupplied: ['Cables', 'Conduits'],
    rating: 5,
  },
  {
    name: 'Supreme Paints & Chemicals',
    contactPerson: 'Anita Patel',
    email: 'supreme@paints.com',
    phone: '9900011007',
    address: 'Chemical Zone, Ahmedabad',
    materialsSupplied: ['Paints', 'Primers', 'Tiles', 'Waterproofing'],
    rating: 5,
  },
];

const MATERIALS_DATA = [
  // --- CEMENT & CONCRETE ---
  {
    name: 'OPC 53 Grade Cement',
    category: 'Cement & Concrete',
    unit: 'bags',
    quantity: 5000,
    minStockLevel: 200,
    purchasePrice: 420,
    supplierName: 'BuildMate Cement Suppliers',
    location: 'Warehouse A - Section 1',
    description: '50kg Ordinary Portland Cement for RCC works.',
  },
  {
    name: 'PPC Cement',
    category: 'Cement & Concrete',
    unit: 'bags',
    quantity: 3000,
    minStockLevel: 150,
    purchasePrice: 390,
    supplierName: 'BuildMate Cement Suppliers',
    location: 'Warehouse A - Section 1',
    description: 'Portland Pozzolana Cement for masonry and plastering.',
  },
  // --- STEEL & IRON ---
  {
    name: 'TMT Steel Bars 8mm',
    category: 'Steel & Iron',
    unit: 'tonnes',
    quantity: 50,
    minStockLevel: 5,
    purchasePrice: 57000,
    supplierName: 'Shree Sai Steel Traders',
    location: 'Warehouse B - Rack 1',
    description: 'TMT bars used in slabs and stirrups.',
  },
  {
    name: 'TMT Steel Bars 12mm',
    category: 'Steel & Iron',
    unit: 'tonnes',
    quantity: 100,
    minStockLevel: 10,
    purchasePrice: 58000,
    supplierName: 'Shree Sai Steel Traders',
    location: 'Warehouse B - Rack 2',
    description: 'High-strength reinforcement bars.',
  },
  {
    name: 'TMT Steel Bars 16mm',
    category: 'Steel & Iron',
    unit: 'tonnes',
    quantity: 80,
    minStockLevel: 10,
    purchasePrice: 58500,
    supplierName: 'Shree Sai Steel Traders',
    location: 'Warehouse B - Rack 3',
    description: 'Structural reinforcement for beams and columns.',
  },
  {
    name: 'Binding Wire',
    category: 'Steel & Iron',
    unit: 'kg',
    quantity: 2000,
    minStockLevel: 100,
    purchasePrice: 70,
    supplierName: 'Shree Sai Steel Traders',
    location: 'Warehouse B - Rack 5',
    description: 'Used for tying reinforcement bars.',
  },
  // --- SAND & AGGREGATES ---
  {
    name: 'River Sand',
    category: 'Sand & Aggregates',
    unit: 'tonnes',
    quantity: 500,
    minStockLevel: 50,
    purchasePrice: 1800,
    supplierName: 'Southern Aggregates & Sand Co.',
    location: 'Open Yard - Zone A',
    description: 'Fine aggregate for concrete and plastering.',
  },
  {
    name: 'M-Sand',
    category: 'Sand & Aggregates',
    unit: 'tonnes',
    quantity: 400,
    minStockLevel: 40,
    purchasePrice: 1600,
    supplierName: 'Southern Aggregates & Sand Co.',
    location: 'Open Yard - Zone B',
    description: 'Manufactured sand for construction works.',
  },
  {
    name: 'Aggregate 20mm',
    category: 'Sand & Aggregates',
    unit: 'tonnes',
    quantity: 700,
    minStockLevel: 100,
    purchasePrice: 1200,
    supplierName: 'Southern Aggregates & Sand Co.',
    location: 'Open Yard - Zone C',
    description: 'Coarse aggregate for RCC concrete.',
  },
  // --- BRICKS & BLOCKS ---
  {
    name: 'Red Bricks',
    category: 'Bricks & Blocks',
    unit: 'pieces',
    quantity: 100000,
    minStockLevel: 10000,
    purchasePrice: 9,
    supplierName: 'Krishna Bricks Industries',
    location: 'Yard - Section A',
    description: 'Standard burnt clay bricks.',
  },
  {
    name: 'Fly Ash Bricks',
    category: 'Bricks & Blocks',
    unit: 'pieces',
    quantity: 80000,
    minStockLevel: 8000,
    purchasePrice: 7,
    supplierName: 'Krishna Bricks Industries',
    location: 'Yard - Section B',
    description: 'Eco-friendly fly ash bricks.',
  },
  {
    name: 'Concrete Blocks 6 inch',
    category: 'Bricks & Blocks',
    unit: 'pieces',
    quantity: 10000,
    minStockLevel: 1000,
    purchasePrice: 55,
    supplierName: 'Krishna Bricks Industries',
    location: 'Yard - Section C',
    description: 'Hollow concrete blocks for partition walls.',
  },
  // --- PLUMBING ---
  {
    name: 'GI Pipe 2 inch',
    category: 'Plumbing',
    unit: 'pieces',
    quantity: 300,
    minStockLevel: 20,
    purchasePrice: 1200,
    supplierName: 'Metro Pipes & Plumbing Solutions',
    location: 'Warehouse C - Rack 1',
    description: 'Galvanized pipes for water supply.',
  },
  {
    name: 'PVC Pipe 4 inch',
    category: 'Plumbing',
    unit: 'pieces',
    quantity: 500,
    minStockLevel: 30,
    purchasePrice: 850,
    supplierName: 'Metro Pipes & Plumbing Solutions',
    location: 'Warehouse C - Rack 2',
    description: 'PVC drainage pipes.',
  },
  // --- ELECTRICAL ---
  {
    name: 'Electrical Cable 2.5 sq.mm',
    category: 'Electrical',
    unit: 'meters',
    quantity: 10000,
    minStockLevel: 1000,
    purchasePrice: 35,
    supplierName: 'Elite Electrical Supplies',
    location: 'Warehouse D - Rack 1',
    description: 'Copper electrical cable.',
  },
  {
    name: 'PVC Conduit Pipe',
    category: 'Electrical',
    unit: 'pieces',
    quantity: 1500,
    minStockLevel: 100,
    purchasePrice: 120,
    supplierName: 'Elite Electrical Supplies',
    location: 'Warehouse D - Rack 2',
    description: 'Electrical conduit pipe for wiring.',
  },
  // --- TILES & FLOORING ---
  // Note: 'box' is not a valid unit; using 'bundles' as closest match
  {
    name: 'Ceramic Floor Tiles 600x600',
    category: 'Tiles & Flooring',
    unit: 'bundles',
    quantity: 1000,
    minStockLevel: 100,
    purchasePrice: 750,
    supplierName: 'Supreme Paints & Chemicals',
    location: 'Warehouse E - Section 1',
    description: 'Vitrified floor tiles.',
  },
  // --- PAINT & COATINGS ---
  {
    name: 'Exterior Wall Paint',
    category: 'Paint & Coatings',
    unit: 'liters',
    quantity: 1000,
    minStockLevel: 100,
    purchasePrice: 280,
    supplierName: 'Supreme Paints & Chemicals',
    location: 'Warehouse E - Shelf 1',
    description: 'Weather-resistant exterior paint.',
  },
  {
    name: 'Primer',
    category: 'Paint & Coatings',
    unit: 'liters',
    quantity: 600,
    minStockLevel: 50,
    purchasePrice: 180,
    supplierName: 'Supreme Paints & Chemicals',
    location: 'Warehouse E - Shelf 2',
    description: 'Wall primer before painting.',
  },
  // --- OTHER (Construction Chemicals) ---
  {
    name: 'Waterproofing Chemical',
    category: 'Other',
    unit: 'liters',
    quantity: 500,
    minStockLevel: 50,
    purchasePrice: 350,
    supplierName: 'Supreme Paints & Chemicals',
    location: 'Warehouse F - Shelf 1',
    description: 'Chemical used for waterproofing structures.',
  },
];

const seedWarehouse = async () => {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected.\n');

    // 1. Get Central Warehouse
    const centralWarehouse = await Branch.findOne({ isCentralWarehouse: true });
    if (!centralWarehouse) {
      console.error('Central Warehouse not found! Please run safeTruncateAndSeed.js first.');
      process.exit(1);
    }
    console.log(`Central Warehouse found: ${centralWarehouse.branchName} (${centralWarehouse._id})`);

    // 2. Get Admin user for transactions
    const admin = await User.findOne({ role: 'admin' });

    // 3. Create Suppliers (skip if already exist)
    console.log('\nCreating suppliers...');
    const supplierMap = {};
    for (const sup of SUPPLIERS_DATA) {
      let existing = await Supplier.findOne({ name: sup.name });
      if (!existing) {
        existing = await Supplier.create(sup);
        console.log(`  ✅ Created supplier: ${sup.name}`);
      } else {
        console.log(`  ⏭  Supplier already exists: ${sup.name}`);
      }
      supplierMap[sup.name] = existing._id;
    }

    // 4. Create Materials in Central Warehouse
    console.log('\nCreating materials in Central Warehouse...');
    let created = 0;
    let skipped = 0;

    for (const mat of MATERIALS_DATA) {
      // Check for duplicate in this warehouse
      const existing = await Material.findOne({
        name: { $regex: new RegExp(`^${mat.name.trim().replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')}$`, 'i') },
        branchId: centralWarehouse._id,
        isActive: true,
      });

      if (existing) {
        console.log(`  ⏭  Material already exists: ${mat.name}`);
        skipped++;
        continue;
      }

      const newMat = await Material.create({
        name: mat.name,
        category: mat.category,
        unit: mat.unit,
        quantity: mat.quantity,
        minStockLevel: mat.minStockLevel,
        purchasePrice: mat.purchasePrice,
        supplier: supplierMap[mat.supplierName] || null,
        location: mat.location,
        description: mat.description,
        branchId: centralWarehouse._id,
        isActive: true,
      });

      // Create an initial purchase transaction for audit trail
      await Transaction.create({
        type: 'purchase',
        material: newMat._id,
        quantity: mat.quantity,
        unit: mat.unit,
        previousStock: 0,
        newStock: mat.quantity,
        branchId: centralWarehouse._id,
        performedBy: admin ? admin._id : null,
        notes: `Initial stock loaded into Central Warehouse`,
      });

      console.log(`  ✅ Created: ${mat.name} (${mat.quantity} ${mat.unit}) @ ₹${mat.purchasePrice}`);
      created++;
    }

    console.log('\n====================================================');
    console.log(`SEEDING COMPLETE`);
    console.log('====================================================');
    console.log(`  Suppliers created/found : ${SUPPLIERS_DATA.length}`);
    console.log(`  Materials created       : ${created}`);
    console.log(`  Materials skipped (dup) : ${skipped}`);
    console.log(`  Total stock value       : ₹${MATERIALS_DATA.reduce((s, m) => s + m.quantity * m.purchasePrice, 0).toLocaleString('en-IN')}`);
    console.log('====================================================\n');

    process.exit(0);
  } catch (error) {
    console.error('Seeding failed:', error);
    process.exit(1);
  }
};

seedWarehouse();
