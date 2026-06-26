const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      tlsAllowInvalidCertificates: true
    });
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`❌ MongoDB Connection Error: ${error.message}`);
    console.error('⚠️  Server will continue running. Fix the connection and restart.');
    // Don't exit — let the server stay alive for health checks
    // process.exit(1);
  }
};

module.exports = { connect: connectDB };
