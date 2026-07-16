const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    // Validate MongoDB URI
    if (!process.env.MONGODB_URI) {
      console.error('\x1b[31m%s\x1b[0m', 'MongoDB URI is not defined in environment variables');
      throw new Error('MongoDB URI is not defined in environment variables');
    }
    console.log('\x1b[33m%s\x1b[0m', `MongoDB URI from .env: ${process.env.MONGODB_URI}`);

    // Configure Mongoose
    mongoose.set('strictQuery', false);
    
    // Connect to MongoDB
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000, // Timeout after 5s instead of 30s
      autoIndex: true, // Build indexes
      maxPoolSize: 10, // Maintain up to 10 socket connections
      family: 4 // Use IPv4, skip trying IPv6
    });

    console.log('\x1b[32m%s\x1b[0m', `MongoDB Connected: ${conn.connection.host}`);
    
    // Handle connection events
    mongoose.connection.on('error', err => {
      console.error('\x1b[31m%s\x1b[0m', 'MongoDB connection error:', err);
    });

    mongoose.connection.on('disconnected', () => {
      console.warn('\x1b[33m%s\x1b[0m', 'MongoDB disconnected');
    });

    process.on('SIGINT', async () => {
      await mongoose.connection.close();
      process.exit(0);
    });

  } catch (error) {
    console.error('\x1b[31m%s\x1b[0m', 'MongoDB connection error:', error.message);
    // Exit with failure
    process.exit(1);
  }
};

module.exports = connectDB; 