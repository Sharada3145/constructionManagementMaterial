const mongoose = require('mongoose');
require('dotenv').config();
const Material = require('./models/Material');

mongoose.connect(process.env.MONGO_URI).then(async () => {
  const name = 'TMT Steel Rods 16mm';
  const branchId = '6a3f4e47d86140a2d7d94e1d';
  
  const existingMaterial = await Material.findOne({
    name: { $regex: new RegExp('^' + name.trim().replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&') + '$', 'i') },
    branchId: branchId,
    isActive: true,
  });

  console.log('Found:', existingMaterial ? existingMaterial._id : null);
  process.exit();
});
