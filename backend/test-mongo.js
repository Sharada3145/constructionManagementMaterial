require('dotenv').config();

const mongoose = require('mongoose');

console.log("URI loaded:", !!process.env.MONGO_URI);
console.log("URI starts with:", process.env.MONGO_URI?.substring(0, 20));

mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log("✅ MONGODB CONNECTION SUCCESS");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ MONGODB CONNECTION FAILED");
    console.error(error);
    process.exit(1);
  });