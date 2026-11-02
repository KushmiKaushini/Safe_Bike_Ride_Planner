/**
 * User Model
 * K K K Ekanayake — Safe Bike Ride Planner Backend
 *
 * Supports both Google OAuth and Local (Email/Password) authentication.
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  googleId: {
    type: String,
    sparse: true,
    unique: true,
  },
  authProvider: {
    type: String,
    enum: ['google', 'local'],
    default: 'google',
  },
  displayName: {
    type: String,
    trim: true,
  },
  email: {
    type: String,
    trim: true,
    lowercase: true,
    sparse: true,
  },
  password: {
    type: String,
    select: false,
  },
  photo: {
    type: String,
    description: 'Profile picture URL',
    default: '',
  },
  lastLoginPlatform: {
    type: String,
    enum: ['android', 'ios', 'web'],
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

// Pre-save hook to hash password if modified
userSchema.pre('save', async function (next) {
  if (!this.isModified('password') || !this.password) return next();
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (err) {
    next(err);
  }
});

// Instance method to compare password
userSchema.methods.comparePassword = async function (candidatePassword) {
  if (!this.password) return false;
  return bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
