/**
 * RideCheck Model
 * K K K Ekanayake — Safe Bike Ride Planner Backend
 *
 * Schema for storing historical ride safety checks performed by users.
 */

const mongoose = require('mongoose');

const weatherSubSchema = new mongoose.Schema(
  {
    temp: { type: Number },
    feelsLike: { type: Number },
    humidity: { type: Number },
    windSpeed: { type: Number },
    description: { type: String },
    icon: { type: String },
    condition: { type: String },
  },
  { _id: false }
);

const airQualitySubSchema = new mongoose.Schema(
  {
    aqi: { type: Number },
    // FIX-04: Removed duplicate `index` field — it stored identical value to `aqi`.
    pm25: { type: Number },
    pm10: { type: Number },
    o3: { type: Number },
    no2: { type: Number },
    so2: { type: Number },
    co: { type: Number },
    mainPollutant: { type: String },
  },
  { _id: false }
);

const rideCheckSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required'],
    // FIX-09: Removed redundant `index: true` here — the compound index
    // { userId: 1, createdAt: -1 } at the bottom already covers userId lookups.
  },
  city: {
    type: String,
    required: [true, 'City is required'],
    trim: true,
  },
  // FIX-09: Added coordinate bounds validation
  lat: { type: Number, min: -90,  max: 90  },
  lon: { type: Number, min: -180, max: 180 },
  // FIX-09: safetyScore is now required (always set server-side via calculateSafetyScore)
  safetyScore: {
    type: Number,
    required: true,
    min: 0,
    max: 100,
  },
  weather: { type: weatherSubSchema, default: {} },
  airQuality: { type: airQualitySubSchema, default: {} },
  recommendation: {
    type: String,
    enum: ['safe', 'caution', 'unsafe'],
  },
  summary: { type: String, trim: true },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Index for fetching user ride checks sorted by newest first
rideCheckSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('RideCheck', rideCheckSchema);
