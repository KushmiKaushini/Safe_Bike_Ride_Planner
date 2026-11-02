const mongoose = require('mongoose');

/**
 * RefreshToken Schema
 * Secure Mobile Session & Token Rotation Model
 *
 * Persists SHA-256 hashes of mobile refresh tokens. Raw tokens are never stored in the database.
 * Supports token rotation and family tracking to detect and mitigate token theft.
 */
const refreshTokenSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  tokenHash: {
    type: String,
    required: true,
    unique: true,
  },
  familyId: {
    type: String,
    required: true,
  },
  platform: {
    type: String,
    enum: ['android', 'ios'],
    default: 'android',
  },
  expiresAt: {
    type: Date,
    required: true,
  },
  revokedAt: {
    type: Date,
    default: null,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Index for rapid lookup of active tokens during refresh requests
refreshTokenSchema.index({ tokenHash: 1, revokedAt: 1 });
refreshTokenSchema.index({ userId: 1, revokedAt: 1 });

// TTL index to automatically remove expired refresh tokens
refreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('RefreshToken', refreshTokenSchema);
