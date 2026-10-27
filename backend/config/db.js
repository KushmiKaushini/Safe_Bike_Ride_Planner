/**
 * MongoDB Connection Configuration
 * K K K Ekanayake — Safe Bike Ride Planner Backend
 *
 * Connects to MongoDB using Mongoose with connection event handlers.
 */

const mongoose = require('mongoose');

/**
 * connectDB — Establish connection to MongoDB
 * Reads MONGODB_URI from environment variables
 */
async function connectDB() {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    console.error('[DB] MONGODB_URI is not defined in environment variables');
    if (process.env.NODE_ENV === 'production') {
      process.exit(1);
    }
    return;
  }

  if (uri.includes('<username>') || uri.includes('xxxxx')) {
    console.warn('[DB] Notice: Placeholder MONGODB_URI detected from .env.example.');
    console.warn('[DB] Set your actual MongoDB Atlas connection string in backend/.env to enable database persistence.');
    if (process.env.NODE_ENV === 'production') {
      process.exit(1);
    }
    return;
  }

  try {
    await mongoose.connect(uri);
  } catch (err) {
    console.error(`[DB] Initial connection failed: ${err.message}`);
    if (process.env.NODE_ENV === 'production') {
      process.exit(1);
    }
  }
}

// Connection event handlers
mongoose.connection.on('connected', () => {
  console.log('[DB] MongoDB connected successfully');
});

mongoose.connection.on('error', (err) => {
  console.error(`[DB] MongoDB connection error: ${err.message}`);
});

mongoose.connection.on('disconnected', () => {
  console.warn('[DB] MongoDB disconnected');
});

// Graceful shutdown
process.on('SIGINT', async () => {
  await mongoose.connection.close();
  console.log('[DB] MongoDB connection closed due to application termination');
  process.exit(0);
});

module.exports = connectDB;
