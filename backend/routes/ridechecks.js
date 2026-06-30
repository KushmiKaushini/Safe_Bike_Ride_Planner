/**
 * RideCheck CRUD Routes
 * K K K Ekanayake — Safe Bike Ride Planner Backend
 *
 * Protected routes for creating, reading, and deleting ride safety checks.
 */

const express = require('express');
const RideCheck = require('../models/RideCheck');
const { ensureAuth } = require('../middleware/auth');
const router = express.Router();

/**
 * POST /api/ridechecks
 * Save a new ride check for the authenticated user
 * Body: { city, lat, lon, safetyScore, weather, airQuality, recommendation, summary }
 */
router.post('/', ensureAuth, async (req, res) => {
  try {
    const { city, lat, lon, safetyScore, weather, airQuality, recommendation, summary } = req.body;

    if (!city || !city.trim()) {
      return res.status(400).json({ success: false, error: 'City is required' });
    }

    if (safetyScore !== undefined && (typeof safetyScore !== 'number' || safetyScore < 0 || safetyScore > 100)) {
      return res.status(400).json({ success: false, error: 'Safety score must be a number between 0 and 100' });
    }

    const rideCheck = await RideCheck.create({
      userId: req.user._id,
      city: city.trim(),
      lat,
      lon,
      safetyScore,
      weather: weather || {},
      airQuality: airQuality || {},
      recommendation,
      summary,
    });

    return res.status(201).json({ success: true, data: rideCheck });
  } catch (err) {
    console.error('[RideChecks] Create error:', err.message);
    return res.status(500).json({ success: false, error: 'Failed to save ride check' });
  }
});

/**
 * GET /api/ridechecks
 * Get all ride checks for the current user (newest first, limit 50)
 */
router.get('/', ensureAuth, async (req, res) => {
  try {
    const rideChecks = await RideCheck.find({ userId: req.user._id })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    return res.json({ success: true, data: rideChecks });
  } catch (err) {
    console.error('[RideChecks] Fetch error:', err.message);
    return res.status(500).json({ success: false, error: 'Failed to fetch ride checks' });
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