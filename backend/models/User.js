/**
 * User Model
 * K K K Ekanayake — Safe Bike Ride Planner Backend
 *
 * Schema for Google OAuth-authenticated users.
 */

const mongoose = require('mongoose');

// FIX-09: Use Mongoose timestamps option instead of manual createdAt field.
// This also adds `updatedAt` automatically, and Mongoose manages both correctly.
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
  lastLoginPlatform: {
    type: String,
    enum: ['android', 'ios'],
    default: 'android',
  },
  thresholdProfile: {
    profileName: { type: String, enum: ['beginner', 'experienced'], default: 'beginner' },
    maxWindSpeedMs: { type: Number, default: 8.0 },
    minTempC: { type: Number, default: 10.0 },
    maxTempC: { type: Number, default: 35.0 },
    maxAqi: { type: Number, default: 2 },
  },
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
