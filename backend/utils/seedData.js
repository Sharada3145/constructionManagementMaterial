/**
 * Database Seeder
 * Run: node utils/seedData.js
 *
 * Creates sample users, suppliers, projects, and materials.
 */
require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const User = require('../models/User');
const Material = require('../models/Material');
const Supplier = require('../models/Supplier');
const Project = require('../models/Project');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/construction_materials';

const seedUsers = [
  {
    name: 'Admin User',
    email: 'admin@construction.com',
    password: 'admin123',
    role: 'admin',
    phone: '9876543210',
  },
  {
    name: 'Stock Manager',
    email: 'manager@construction.com',
    password: 'manager123',
    role: 'manager',
    phone: '9876543211',
  },
  {
    name: 'Rajesh Kumar',
    email: 'rajesh@construction.com',
    password: 'contractor123',
    role: 'contractor',
    phone: '9876543212',
  },
  {
    name: 'Suresh Patel',
    email: 'suresh@construction.com',
    password: 'contractor123',
    role: 'contractor',
    phone: '9876543213',
  },
];

const seedSuppliers = [
  {
    name: 'UltraTech Cement Ltd',
    contactPerson: 'Vikram Sharma',
    email: 'sales@ultratech.com',
    phone: '9800012345',
    address: 'Industrial Area, Mumbai, Maharashtra',
    gstNumber: '27AABCU1234F1Z5',
    materialsSupplied: ['Cement', 'Concrete'],
    rating: 5,
  },
  {
    name: 'Tata Steel Dealers',
    contactPerson: 'Anand Verma',
    email: 'orders@tatasteel.com',
    phone: '9800012346',
    address: 'Steel Market, Jamshedpur, Jharkhand',
    gstNumber: '20AABCT5678G1Z3',
    materialsSupplied: ['Steel Rods', 'Iron'],
    rating: 5,
  },
  {
    name: 'Rajasthan Sand Suppliers',
    contactPerson: 'Mahesh Joshi',
    email: 'info@rajsand.com',
    phone: '9800012347',
    address: 'Jodhpur Road, Rajasthan',
    gstNumber: '08AABCR9012H1Z1',
    materialsSupplied: ['Sand', 'Gravel'],
    rating: 4,
  },
  {
    name: 'Kajaria Tiles Distributor',
    contactPerson: 'Priya Singh',
    email: 'supply@kajaria.com',
    phone: '9800012348',
    address: 'Ceramic Zone, Morbi, Gujarat',
    gstNumber: '24AABCK3456I1Z9',
    materialsSupplied: ['Tiles', 'Flooring'],
    rating: 4,
  },
  {
    name: 'Asian Paints Warehouse',
    contactPerson: 'Rohit Mehra',
    email: 'wholesale@asianpaints.com',
    phone: '9800012349',
    address: 'Paint Hub, Ankleshwar, Gujarat',
    gstNumber: '24AABCA7890J1Z7',
    materialsSupplied: ['Paint', 'Primer', 'Coatings'],
    rating: 5,
  },
];

const seedProjects = [
  {
    name: 'Sunshine Residency - Tower A',
    description: 'Residential apartment complex - 20 floors, 80 units',
    location: 'Whitefield, Bangalore',
    startDate: new Date('2026-01-15'),
    expectedEndDate: new Date('2027-06-30'),
    budget: 50000000,
    status: 'in_progress',
  },
  {
    name: 'Green Valley Commercial Complex',
    description: 'Commercial office building - 10 floors with parking',
    location: 'Hinjewadi, Pune',
    startDate: new Date('2026-03-01'),
    expectedEndDate: new Date('2027-12-31'),
    budget: 75000000,
    status: 'in_progress',
  },
  {
    name: 'Highway Bridge Construction - NH48',
    description: 'Four-lane highway overpass bridge - 200m span',
    location: 'NH48, Karnataka',
    startDate: new Date('2026-06-01'),
    expectedEndDate: new Date('2027-05-31'),
    budget: 120000000,
    status: 'planning',
  },
];

const seedMaterials = [
  {
    name: 'Cement',
    category: 'Cement & Concrete',
    unit: 'bags',
    quantity: 500,
    minStockLevel: 100,
    purchasePrice: 380,
    description: 'OPC 53 Grade Cement - 50kg bags',
    location: 'Warehouse A - Section 1',
  },
  {
    name: 'River Sand',
    category: 'Sand & Aggregates',
    unit: 'cubic_meters',
    quantity: 200,
    minStockLevel: 50,
    purchasePrice: 1500,
    description: 'Fine river sand for plastering and masonry',
    location: 'Open Yard - Section B',
  },
  {
    name: 'M-Sand',
    category: 'Sand & Aggregates',
    unit: 'cubic_meters',
    quantity: 150,
    minStockLevel: 30,
    purchasePrice: 1200,
    description: 'Manufactured sand for concrete work',
    location: 'Open Yard - Section B',
  },
  {
    name: 'Red Bricks',
    category: 'Bricks & Blocks',
    unit: 'pieces',
    quantity: 25000,
    minStockLevel: 5000,
    purchasePrice: 8,
    description: 'Standard red clay bricks - 9x4x3 inches',
    location: 'Open Yard - Section C',
  },
  {
    name: 'Fly Ash Bricks',
    category: 'Bricks & Blocks',
    unit: 'pieces',
    quantity: 15000,
    minStockLevel: 3000,
    purchasePrice: 6,
    description: 'Fly ash bricks - lightweight and durable',
    location: 'Open Yard - Section C',
  },
  {
    name: 'TMT Steel Rods 12mm',
    category: 'Steel & Iron',
    unit: 'tonnes',
    quantity: 10,
    minStockLevel: 3,
    purchasePrice: 55000,
    description: 'TMT Fe-500D grade - 12mm diameter rods',
    location: 'Warehouse B - Steel Section',
  },
  {
    name: 'TMT Steel Rods 16mm',
    category: 'Steel & Iron',
    unit: 'tonnes',
    quantity: 8,
    minStockLevel: 2,
    purchasePrice: 56000,
    description: 'TMT Fe-500D grade - 16mm diameter rods',
    location: 'Warehouse B - Steel Section',
  },
  {
    name: 'Ceramic Floor Tiles',
    category: 'Tiles & Flooring',
    unit: 'sq_ft',
    quantity: 5000,
    minStockLevel: 1000,
    purchasePrice: 45,
    description: 'Glossy ceramic floor tiles - 2x2 feet',
    location: 'Warehouse A - Section 3',
  },
  {
    name: 'Exterior Emulsion Paint',
    category: 'Paint & Coatings',
    unit: 'liters',
    quantity: 800,
    minStockLevel: 200,
    purchasePrice: 350,
    description: 'Weather-proof exterior emulsion - White',
    location: 'Warehouse A - Section 4',
  },
  {
    name: 'PVC Pipes 4 inch',
    category: 'Pipes & Fittings',
    unit: 'meters',
    quantity: 600,
    minStockLevel: 100,
    purchasePrice: 120,
    description: '4-inch PVC drainage pipes',
    location: 'Warehouse C - Plumbing',
  },
  {
    name: 'Electrical Wire 2.5mm',
    category: 'Electrical',
    unit: 'meters',
    quantity: 2000,
    minStockLevel: 500,
    purchasePrice: 18,
    description: 'Copper electrical wire - 2.5mm single core',
    location: 'Warehouse C - Electrical',
  },
  {
    name: 'Plywood 18mm',
    category: 'Wood & Timber',
    unit: 'pieces',
    quantity: 100,
    minStockLevel: 20,
    purchasePrice: 1800,
    description: 'BWR grade marine plywood - 8x4 feet - 18mm',
    location: 'Warehouse A - Section 5',
  },
  {
    name: 'Coarse Aggregate 20mm',
    category: 'Sand & Aggregates',
    unit: 'cubic_meters',
    quantity: 120,
    minStockLevel: 30,
    purchasePrice: 1800,
    description: '20mm crushed stone aggregate for concrete',
    location: 'Open Yard - Section A',
  },
  {
    name: 'Waterproofing Chemical',
    category: 'Other',
    unit: 'liters',
    quantity: 300,
    minStockLevel: 50,
    purchasePrice: 250,
    description: 'Liquid waterproofing membrane for terraces and basements',
    location: 'Warehouse A - Section 6',
  },
  {
    name: 'GI Binding Wire',
    category: 'Steel & Iron',
    unit: 'kg',
    quantity: 500,
    minStockLevel: 100,
    purchasePrice: 65,
    description: 'Galvanized iron binding wire for rebar tying',
    location: 'Warehouse B - Steel Section',
  },
];

async function seedDatabase() {
  try {
    await mongoose.connect(MONGO_URI, {
      tlsAllowInvalidCertificates: true
    });
    console.log('✅ Connected to MongoDB');

    // Clear existing data
    await User.deleteMany({});
    await Supplier.deleteMany({});
    await Project.deleteMany({});
    await Material.deleteMany({});
    console.log('🗑️  Cleared existing data');

    // Seed users (password hashing handled by pre-save hook)
    const users = await User.create(seedUsers);
    console.log(`👤 Created ${users.length} users`);

    // Seed suppliers
    const suppliers = await Supplier.create(seedSuppliers);
    console.log(`🏭 Created ${suppliers.length} suppliers`);

    // Seed projects — assign manager and contractors
    seedProjects[0].manager = users[1]._id; // Stock Manager
    seedProjects[0].contractors = [users[2]._id, users[3]._id];
    seedProjects[1].manager = users[1]._id;
    seedProjects[1].contractors = [users[2]._id];
    seedProjects[2].manager = users[1]._id;
    seedProjects[2].contractors = [users[3]._id];

    const projects = await Project.create(seedProjects);
    console.log(`🏗️  Created ${projects.length} projects`);

    // Assign suppliers to materials
    seedMaterials[0].supplier = suppliers[0]._id; // Cement → UltraTech
    seedMaterials[1].supplier = suppliers[2]._id; // River Sand → Rajasthan Sand
    seedMaterials[2].supplier = suppliers[2]._id; // M-Sand → Rajasthan Sand
    seedMaterials[5].supplier = suppliers[1]._id; // Steel 12mm → Tata Steel
    seedMaterials[6].supplier = suppliers[1]._id; // Steel 16mm → Tata Steel
    seedMaterials[7].supplier = suppliers[3]._id; // Tiles → Kajaria
    seedMaterials[8].supplier = suppliers[4]._id; // Paint → Asian Paints

    const materials = await Material.create(seedMaterials);
    console.log(`📦 Created ${materials.length} materials`);

    console.log('\n🎉 Database seeded successfully!\n');
    console.log('--- Login Credentials ---');
    console.log('Admin:      admin@construction.com / admin123');
    console.log('Manager:    manager@construction.com / manager123');
    console.log('Contractor: rajesh@construction.com / contractor123');
    console.log('Contractor: suresh@construction.com / contractor123');
    console.log('-------------------------\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding failed:', error.message);
    process.exit(1);
  }
}

seedDatabase();
