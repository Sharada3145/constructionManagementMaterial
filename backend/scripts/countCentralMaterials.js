const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const Material = require('../models/Material');
const Branch = require('../models/Branch');

(async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    const central = await Branch.findOne({ isCentralWarehouse: true });
    if (!central) {
      console.log('No central warehouse');
      process.exit(1);
    }
    const count = await Material.countDocuments({ branchId: central._id });
    console.log('Materials in central warehouse:', count);
    const list = await Material.find({ branchId: central._id }).select('name quantity unit supplier -_id');
    console.log(JSON.stringify(list, null, 2));
    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
})();
