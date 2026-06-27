const fs = require('fs');

const file = 'backend/controllers/reportController.js';
let content = fs.readFileSync(file, 'utf8');

if (!content.includes('getBranchFilter')) {
  content = content.replace("const User = require('../models/User');", "const User = require('../models/User');\nconst { getBranchFilter } = require('../middleware/auth');");
}

content = content.replace(
  'let record = await MaterialRequest.findById(req.params.id)',
  'const branchFilter = getBranchFilter(req);\n    let record = await MaterialRequest.findOne({ _id: req.params.id, ...branchFilter })'
);

content = content.replace(
  'record = await MaterialRequest.findOne({ requestId: req.params.id })',
  'record = await MaterialRequest.findOne({ requestId: req.params.id, ...branchFilter })'
);

content = content.replace(
  'const txn = await Transaction.findById(req.params.id)',
  'const branchFilter = getBranchFilter(req);\n    const txn = await Transaction.findOne({ _id: req.params.id, ...branchFilter })'
);

content = content.replace(
  'const generateBulkIssueReport = async (req, res, next) => {\n  try {\n    const { startDate, endDate, contractor } = req.query;\n    const query = {};',
  'const generateBulkIssueReport = async (req, res, next) => {\n  try {\n    const { startDate, endDate, contractor } = req.query;\n    const query = { ...getBranchFilter(req) };'
);

content = content.replace(
  "const generateBulkPurchaseReport = async (req, res, next) => {\n  try {\n    const { startDate, endDate, supplier } = req.query;\n    const query = { type: 'purchase' };",
  "const generateBulkPurchaseReport = async (req, res, next) => {\n  try {\n    const { startDate, endDate, supplier } = req.query;\n    const query = { type: 'purchase', ...getBranchFilter(req) };"
);

content = content.replace(
  'const generateStockReport = async (req, res, next) => {\n  try {\n    const { category, lowStock } = req.query;\n    const query = { isActive: true };',
  'const generateStockReport = async (req, res, next) => {\n  try {\n    const { category, lowStock } = req.query;\n    const query = { isActive: true, ...getBranchFilter(req) };'
);

content = content.replace(
  'const generateSystemSummary = async (req, res, next) => {\n  try {\n    const today = new Date();',
  'const generateSystemSummary = async (req, res, next) => {\n  try {\n    const branchFilter = getBranchFilter(req);\n    const today = new Date();'
);

content = content.replace(
  "const totalIssues = await Transaction.countDocuments({ type: 'issue' });",
  "const totalIssues = await Transaction.countDocuments({ type: 'issue', ...branchFilter });"
);

content = content.replace(
  "const totalPurchases = await Transaction.countDocuments({ type: 'purchase' });",
  "const totalPurchases = await Transaction.countDocuments({ type: 'purchase', ...branchFilter });"
);

content = content.replace(
  "const purchaseVal = await Transaction.aggregate([\n      { $match: { type: 'purchase' } },",
  "const purchaseVal = await Transaction.aggregate([\n      { $match: { type: 'purchase', ...branchFilter } },"
);

content = content.replace(
  'const totalMaterials = await Material.countDocuments({ isActive: true });',
  'const totalMaterials = await Material.countDocuments({ isActive: true, ...branchFilter });'
);

content = content.replace(
  "const lowStockCount = await Material.countDocuments({ isActive: true, $expr: { $lte: ['$quantity', '$minStockLevel'] } });",
  "const lowStockCount = await Material.countDocuments({ isActive: true, $expr: { $lte: ['$quantity', '$minStockLevel'] }, ...branchFilter });"
);

content = content.replace(
  "const activeContractors = await User.countDocuments({ role: 'contractor', isActive: true });",
  "const activeContractors = await User.countDocuments({ role: 'contractor', isActive: true, ...branchFilter });"
);

content = content.replace(
  "const recentIssues = await MaterialRequest.find()\n      .populate('contractor', 'name')\n      .populate('project', 'name')\n      .sort('-createdAt')\n      .limit(5);",
  "const recentIssues = await MaterialRequest.find(branchFilter)\n      .populate('contractor', 'name')\n      .populate('project', 'name')\n      .sort('-createdAt')\n      .limit(5);"
);

content = content.replace(
  "const recentPurchases = await Transaction.find({ type: 'purchase' })\n      .populate('material', 'name')\n      .populate('supplier', 'name')\n      .sort('-createdAt')\n      .limit(5);",
  "const recentPurchases = await Transaction.find({ type: 'purchase', ...branchFilter })\n      .populate('material', 'name')\n      .populate('supplier', 'name')\n      .sort('-createdAt')\n      .limit(5);"
);

fs.writeFileSync(file, content, 'utf8');
console.log('Successfully updated reportController.js');
