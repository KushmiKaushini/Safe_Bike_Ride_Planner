/**
 * User Model
 * K K K Ekanayake — Safe Bike Ride Planner Backend
 *
 * Schema for Google OAuth-authenticated users.
 */

const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  googleId: {
    type: String,
    required: [true, 'Google ID is required'],
    unique: true,
  },
  displayName: {
    type: String,
    trim: true,
  },
  email: {
    type: String,
    trim: true,
    lowercase: true,
  },
  photo: {
    type: String,
    description: 'Profile picture URL from Google',
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Index for fast lookups by Google ID
userSchema.index({ googleId: 1 });

module.exports = mongoose.model('User', userSchema);
