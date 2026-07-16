require('./shims/node25Compat');
require('dotenv').config(); 
console.log('\x1b[33m%s\x1b[0m', `MongoDB URI from .env: ${process.env.MONGODB_URI}`);

const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');
const connectDB = require('./config/database');

// Import routes
const productRoutes = require('./routes/productRoutes');
const userRoutes = require('./routes/userRoutes');
const orderRoutes = require('./routes/orderRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');
const blogRoutes = require('./routes/blogRoutes');
const categoryRoutes = require('./routes/categoryRoutes');
const reviewRoutes = require('./routes/reviewRoutes'); 
const couponRoutes = require('./routes/couponRoutes')
const healthRoutes = require('./routes/healthRoutes');

// Validate required environment variables
const requiredEnvVars = ['MONGODB_URI', 'JWT_SECRET'];
for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    console.error(`Error: ${envVar} is not defined in environment variables`);
    process.exit(1);
  }
}

// Initialize express app
const app = express();

// Connect to database
connectDB().catch(err => {
  console.error('Failed to connect to MongoDB:', err);
  process.exit(1);
});

// Middleware
const allowedOrigins = [
  'https://sribogat.com',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://192.168.158.105:5173',
  'https://bogat.netlify.app',
  'https://sribogat.com',
  process.env.CORS_ORIGIN,
];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.warn(`❌ CORS blocked origin: ${origin}`);
      callback(new Error('CORS not allowed'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Cache-Control', 'Pragma'],
  exposedHeaders: ['Content-Range', 'X-Content-Range'],
  maxAge: 600
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(morgan('dev'));

// Serve uploaded images
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));



app.use('/', healthRoutes);
app.use('/health', healthRoutes);

// API routes
app.use('/api/products', productRoutes);
app.use('/api/users', userRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/analytics', analyticsRoutes);

//Blog Routes
app.use('/api/blogs', blogRoutes);

// Review routes 
app.use('/api/reviews', reviewRoutes);
// Category routes
app.use('/api/categories', categoryRoutes);

//Coupons Routes
app.use('/api/coupons', couponRoutes);  
app.use('/api/admin/coupons', couponRoutes); 

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('\x1b[31m%s\x1b[0m', 'Error:', err.stack);
  
  // Handle specific error types
  if (err.name === 'ValidationError') {
    return res.status(400).json({ 
      error: 'Validation Error', 
      details: err.message 
    });
  }
  
  if (err.name === 'UnauthorizedError') {
    return res.status(401).json({ 
      error: 'Unauthorized', 
      details: 'Invalid token or no token provided' 
    });
  }

  // Default error
  res.status(err.status || 500).json({
    error: err.message || 'Something went wrong!',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Route not found',
    path: req.originalUrl
  });
});

// Start server
const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, () => {
  console.log('\x1b[36m%s\x1b[0m', `Server running on port ${PORT}`);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('\x1b[31m%s\x1b[0m', 'Unhandled Promise Rejection:', err);
  // Close server & exit process
  server.close(() => process.exit(1));
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('\x1b[31m%s\x1b[0m', 'Uncaught Exception:', err);
  // Close server & exit process
  server.close(() => process.exit(1));
}); 

