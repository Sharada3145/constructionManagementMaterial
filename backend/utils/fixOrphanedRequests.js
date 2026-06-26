/**
 * Fix Orphaned MaterialRequest Records
 * 
 * Run: node utils/fixOrphanedRequests.js
 *
 * This script finds MaterialRequest records where the contractor reference
 * points to a deleted/non-existent User, then tries to re-link them using
 * the contractor name stored in Transaction notes. If it cannot find a match,
 * it deletes the orphaned request.
 */
require('dotenv').config();
const mongoose = require('mongoose');
const MaterialRequest = require('../models/MaterialRequest');
const Transaction = require('../models/Transaction');
const User = require('../models/User');

const MONGO_URI = process.env.MONGO_URI;

async function fixOrphans() {
  await mongoose.connect(MONGO_URI, { tlsAllowInvalidCertificates: true });
  console.log('✅ Connected to MongoDB\n');

  // Find all requests
  const requests = await MaterialRequest.find({}).lean();
  console.log(`📋 Total requests found: ${requests.length}`);

  // Get all active contractor users
  const contractors = await User.find({ role: 'contractor', isActive: true }).lean();
  console.log(`👤 Active contractors: ${contractors.length}\n`);

  const existingUserIds = new Set(contractors.map(u => u._id.toString()));

  let fixed = 0;
  let deleted = 0;
  let ok = 0;

  for (const req of requests) {
    const contractorId = req.contractor?.toString();
    
    // Check if contractor still exists
    if (existingUserIds.has(contractorId)) {
      ok++;
      continue;
    }

    // Contractor is orphaned — try to find via Transaction notes
    const txn = await Transaction.findOne({ materialRequest: req._id }).lean();
    let matched = null;

    if (txn?.notes) {
      // Notes format: "Issued to <ContractorName> — REQ-XXXXXX"
      const nameMatch = txn.notes.match(/^Issued to (.+?) —/);
      if (nameMatch) {
        const name = nameMatch[1].trim();
        matched = contractors.find(c => c.name.toLowerCase() === name.toLowerCase());
      }
    }

    if (matched) {
      await MaterialRequest.findByIdAndUpdate(req._id, { contractor: matched._id });
      console.log(`🔗 Re-linked ${req.requestId} → ${matched.name}`);
      fixed++;
    } else {
      await MaterialRequest.findByIdAndDelete(req._id);
      console.log(`🗑️  Deleted orphaned ${req.requestId} (no contractor recoverable)`);
      deleted++;
    }
  }

  console.log(`\n─────────────────────────────────`);
  console.log(`✅ Already valid: ${ok}`);
  console.log(`🔗 Re-linked:     ${fixed}`);
  console.log(`🗑️  Deleted:       ${deleted}`);
  console.log(`─────────────────────────────────\n`);

  process.exit(0);
}

fixOrphans().catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
