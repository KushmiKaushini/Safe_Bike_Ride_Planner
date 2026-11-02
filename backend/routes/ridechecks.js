/**
 * RideCheck CRUD Routes
 * K K K Ekanayake — Safe Bike Ride Planner Backend
 *
 * Protected routes for creating, reading, and deleting ride safety checks.
 */

const express = require('express');
const RideCheck = require('../models/RideCheck');
const User = require('../models/User');
const { ensureAuth } = require('../middleware/auth');
const { calculateSafetyScore } = require('../services/safetyScore');
const router = express.Router();

/**
 * POST /api/ridechecks
 * Save a new ride check for the authenticated user.
 * FIX-08: Safety score is ALWAYS recalculated server-side from weather + AQI inputs.
 * The client-supplied `safetyScore` is intentionally ignored — clients cannot forge scores.
 * Body: { city, lat, lon, weather, airQuality }
 */
router.post('/', ensureAuth, async (req, res) => {
  try {
    const { city, lat, lon, weather, airQuality } = req.body;

    if (!city || !city.trim()) {
      return res.status(400).json({ success: false, error: 'City is required' });
    }

    // FIX-08: Recalculate score server-side; ignore client-supplied safetyScore entirely
    const scored = calculateSafetyScore({
      temp:      weather?.temp,
      humidity:  weather?.humidity,
      windSpeed: weather?.windSpeed,
      condition: weather?.condition,
      aqi:       airQuality?.aqi,
    });

    const rideCheck = await RideCheck.create({
      userId:         req.user._id,
      city:           city.trim(),
      lat,
      lon,
      safetyScore:    scored.safetyScore,
      weather:        weather || {},
      airQuality:     airQuality || {},
      recommendation: scored.recommendation,
      summary:        scored.summary,
    });

    return res.status(201).json({ success: true, data: rideCheck });
  } catch (err) {
    console.error('[RideChecks] Create error:', err.message);
    return res.status(500).json({ success: false, error: 'Failed to save ride check' });
  }
});

/**
 * GET /api/ridechecks
 * Get ride checks for the current user (newest first).
 * FIX-24: Supports pagination via ?limit= and ?skip= query params.
 * Defaults to limit=20, max limit=100.
 */
router.get('/', ensureAuth, async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const skip  = parseInt(req.query.skip) || 0;

    const [total, rideChecks] = await Promise.all([
      RideCheck.countDocuments({ userId: req.user._id }),
      RideCheck.find({ userId: req.user._id })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
    ]);

    return res.json({ success: true, data: rideChecks, total, limit, skip });
  } catch (err) {
    console.error('[RideChecks] Fetch error:', err.message);
    return res.status(500).json({ success: false, error: 'Failed to fetch ride checks' });
  }
});

/**
 * DELETE /api/ridechecks/account
 * FIX-24: GDPR right to erasure — delete the authenticated user and ALL their data.
 * IMPORTANT: Must be placed BEFORE the DELETE /:id route so Express does not
 * match the string "account" as a MongoDB ObjectId and throw a CastError.
 */
router.delete('/account', ensureAuth, async (req, res) => {
  try {
    const userId = req.user._id;
    await RideCheck.deleteMany({ userId });
    await User.findByIdAndDelete(userId);
    req.logout(() => req.session.destroy(() => {
      res.clearCookie('connect.sid');
      return res.json({ success: true, data: { message: 'Account and all data deleted' } });
    }));
  } catch (err) {
    console.error('[RideChecks] Account delete error:', err.message);
    return res.status(500).json({ success: false, error: 'Failed to delete account' });
  }
});

/**
 * DELETE /api/ridechecks/:id
 * Delete a ride check (only the owner can delete their own)
 */
router.delete('/:id', ensureAuth, async (req, res) => {
  try {
    const { id } = req.params;

    const rideCheck = await RideCheck.findById(id);

    if (!rideCheck) {
      return res.status(404).json({ success: false, error: 'Ride check not found' });
    }

    // Ensure the user owns this ride check
    if (rideCheck.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, error: 'Not authorized to delete this ride check' });
    }

    await RideCheck.findByIdAndDelete(id);

    return res.json({ success: true, data: { message: 'Ride check deleted successfully' } });
  } catch (err) {
    console.error('[RideChecks] Delete error:', err.message);
    return res.status(500).json({ success: false, error: 'Failed to delete ride check' });
  }
});

module.exports = router;