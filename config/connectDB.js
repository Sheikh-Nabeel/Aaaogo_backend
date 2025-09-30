// Importing mongoose for MongoDB connection
import mongoose from "mongoose";

// Connection pool configuration options
const connectionOptions = {
  // Connection pool settings
  maxPoolSize: 10, // Maximum number of connections in the pool
  minPoolSize: 2,  // Minimum number of connections in the pool
  maxIdleTimeMS: 30000, // Close connections after 30 seconds of inactivity
  serverSelectionTimeoutMS: 30000, // Increased timeout for server selection
  socketTimeoutMS: 60000, // Increased socket timeout
  connectTimeoutMS: 30000, // Connection timeout
  
  // Connection behavior
  bufferCommands: false, // Disable mongoose buffering
  
  // Retry logic
  retryWrites: true, // Enable retryable writes
  retryReads: true,  // Enable retryable reads
  
  // Heartbeat and monitoring
  heartbeatFrequencyMS: 10000, // How often to check server status
  
  // Additional performance options
  compressors: ['zlib'], // Enable compression
  zlibCompressionLevel: 6 // Compression level (1-9)
};

// Function to establish connection to MongoDB with connection pooling
const connectDB = async () => {
  try {
    // Set mongoose options for better performance
    mongoose.set('strictQuery', false);
    // Control autoIndex based on environment (disable in production for performance)
    const isProduction = process.env.NODE_ENV === 'production';
    mongoose.set('autoIndex', !isProduction);
    
    console.log("Attempting to connect to MongoDB...".yellow);
    console.log("MongoDB URL:", process.env.MONGO_URL?.replace(/\/\/.*@/, '//***:***@')); // Hide credentials in logs
    
    // Connect with connection pooling options
    await mongoose.connect(process.env.MONGO_URL, connectionOptions);
    
    console.log("Connected to MongoDB with connection pooling".green);
    
    // Log connection pool status
    const db = mongoose.connection.db;
    console.log(`Connection pool configured: maxPoolSize=${connectionOptions.maxPoolSize}, minPoolSize=${connectionOptions.minPoolSize}`.cyan);
    
    // Handle connection events
    mongoose.connection.on('error', (err) => {
      console.error('MongoDB connection error:', err.message.red);
    });
    
    mongoose.connection.on('disconnected', () => {
      console.log('MongoDB disconnected'.yellow);
    });
    
    mongoose.connection.on('reconnected', () => {
      console.log('MongoDB reconnected'.green);
    });
    
  } catch (err) {
    console.error("MongoDB connection error:", err.message.red);
    console.error("Full error:", err);
    
    // Don't exit immediately, let the app try to continue
    console.log("Retrying connection in 5 seconds...".yellow);
    setTimeout(() => {
      connectDB();
    }, 5000);
  }
};

export default connectDB;
