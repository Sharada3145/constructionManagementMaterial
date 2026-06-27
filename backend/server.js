require('dotenv').config();
const express = require('express');
const cors = require('cors');
const db = require('./config/database');
const errorHandler = require('./middleware/errorHandler');

// Import routes
const authRoutes = require('./routes/authRoutes');
const materialRoutes = require('./routes/materialRoutes');
const requestRoutes = require('./routes/requestRoutes');
const transactionRoutes = require('./routes/transactionRoutes');
const supplierRoutes = require('./routes/supplierRoutes');
const projectRoutes = require('./routes/projectRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');
const reportRoutes = require('./routes/reportRoutes');
const branchRoutes = require('./routes/branchRoutes');
const userRoutes = require('./routes/userRoutes');

const app = express();

// --------------- Middleware ---------------
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// --------------- Connect to MongoDB ---------------
db.connect();

// --------------- API Routes ---------------
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'Construction Material Management API running',
    timestamp: new Date().toISOString(),
    endpoints: {
      auth: '/api/auth',
      materials: '/api/materials',
      requests: '/api/requests',
      transactions: '/api/transactions',
      suppliers: '/api/suppliers',
      projects: '/api/projects',
      analytics: '/api/analytics',
      reports: '/api/reports',
      branches: '/api/branches',
    },
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/materials', materialRoutes);
app.use('/api/requests', requestRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/suppliers', supplierRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/branches', branchRoutes);
app.use('/api/users', userRoutes);

// --------------- Global Error Handler ---------------
app.use(errorHandler);

// --------------- 404 Handler ---------------
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`,
  });
});

// --------------- Start Server ---------------
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`\n🚀  Server running on port ${PORT}`);
  console.log(`📡  Health check: http://localhost:${PORT}/api/health`);
  console.log(`🔗  API base URL: http://localhost:${PORT}/api\n`);
});
