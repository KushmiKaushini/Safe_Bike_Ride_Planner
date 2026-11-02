/**
 * RideCheck CRUD Routes
 * Safe Bike Ride Planner — Microservice & Mobile Routing
 *
 * Protected routes for creating, reading, paginating, aggregating, and deleting ride safety checks.
 */

const express = require('express');
const RideCheck = require('../models/RideCheck');
const User = require('../models/User');
const RefreshToken = require('../models/RefreshToken');
const { ensureAuth } = require('../middleware/auth');
const { calculateSafetyScore } = require('../services/safetyScore');
const router = express.Router();

/**
 * POST /api/ridechecks & /api/rides
 * Save a new ride check for the authenticated user.
 */
router.post('/', ensureAuth, async (req, res) => {
  try {
    const { city, lat, lon, weather, airQuality } = req.body;

    if (!city || !city.trim()) {
      return res.status(400).json({ success: false, error: 'City is required' });
    }

    const scored = calculateSafetyScore({
      temp: weather?.temp,
      humidity: weather?.humidity,
      windSpeed: weather?.windSpeed,
      condition: weather?.condition,
      aqi: airQuality?.aqi,
    });

    const rideCheck = await RideCheck.create({
      userId: req.user._id,
      city: city.trim(),
      lat,
      lon,
      safetyScore: scored.safetyScore,
      weather: weather || {},
      airQuality: airQuality || {},
      recommendation: scored.recommendation,
      summary: scored.summary,
    });

    return res.status(201).json({ success: true, data: rideCheck });
  } catch (err) {
    console.error('[RideChecks] Create error:', err.message);
    return res.status(500).json({ success: false, error: 'Failed to save ride check' });
  }
});

/**
 * GET /api/ridechecks & /api/rides
 * Paginated list of ride checks for the current user.
 */
router.get('/', ensureAuth, async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const skip = parseInt(req.query.skip) || 0;

    const [total, rideChecks] = await Promise.all([
      RideCheck.countDocuments({ userId: req.user._id }),
      RideCheck.find({ userId: req.user._id })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
    ]);

    return res.json({
      success: true,
      data: rideChecks,
      pagination: {
        total,
        limit,
        skip,
        hasMore: skip + limit < total,
      },
    });
  } catch (err) {
    console.error('[RideChecks] Fetch error:', err.message);
    return res.status(500).json({ success: false, error: 'Failed to fetch ride checks' });
  }
});

/**
 * GET /api/ridechecks/stats & /api/rides/stats
 * Aggregated statistics for the authenticated cyclist.
 */
router.get('/stats', ensureAuth, async (req, res) => {
  try {
    const userId = req.user._id;
    const checks = await RideCheck.find({ userId }).lean();

    if (checks.length === 0) {
      return res.json({
        success: true,
        data: {
          totalChecks: 0,
          averageScore: 0,
          safestCity: 'N/A',
          safestScore: 0,
          scoreDistribution: { safe: 0, caution: 0, unsafe: 0 },
        },
      });
    }

    const totalChecks = checks.length;
    let sumScore = 0;
    let safestCheck = checks[0];
    const scoreDistribution = { safe: 0, caution: 0, unsafe: 0 };

    for (const c of checks) {
      sumScore += c.safetyScore || 0;
      if ((c.safetyScore || 0) > (safestCheck.safetyScore || 0)) {
        safestCheck = c;
      }
      if (c.recommendation === 'safe') scoreDistribution.safe++;
      else if (c.recommendation === 'caution') scoreDistribution.caution++;
      else scoreDistribution.unsafe++;
    }

    const averageScore = Math.round((sumScore / totalChecks) * 10) / 10;

    return res.json({
      success: true,
      data: {
        totalChecks,
        averageScore,
        safestCity: safestCheck.city || 'N/A',
        safestScore: safestCheck.safetyScore || 0,
        scoreDistribution,
      },
    });
  } catch (err) {
    console.error('[RideChecks] Stats error:', err.message);
    return res.status(500).json({ success: false, error: 'Failed to compute user statistics' });
  }
});

/**
 * DELETE /api/ridechecks/account & /api/rides/account
 * GDPR Article 17 right to erasure — delete user and cascade across all ride history and session tokens.
 */
router.delete('/account', ensureAuth, async (req, res) => {
  try {
    const userId = req.user._id;
    await Promise.all([
      RideCheck.deleteMany({ userId }),
      RefreshToken.deleteMany({ userId }),
      User.findByIdAndDelete(userId),
    ]);

    if (req.logout) {
      req.logout(() => {});
    }

    return res.json({
      success: true,
      message: 'Account and all associated ride history permanently erased.',
    });
  } catch (err) {
    console.error('[RideChecks] Account delete error:', err.message);
    return res.status(500).json({ success: false, error: 'Failed to delete account' });
  }
});

/**
 * GET /api/ridechecks/:id & /api/rides/:id
 * Retrieve full details of a specific ride check.
 */
router.get('/:id', ensureAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const check = await RideCheck.findById(id).lean();

    if (!check) {
      return res.status(404).json({ success: false, error: 'Ride check not found' });
    }

    if (check.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, error: 'Not authorized to view this ride check' });
    }

    return res.json({ success: true, data: check });
  } catch (err) {
    console.error('[RideChecks] Get by ID error:', err.message);
    return res.status(500).json({ success: false, error: 'Failed to fetch ride check' });
  }
});

/**
 * DELETE /api/ridechecks/:id & /api/rides/:id
 * Delete a ride check (only the owner can delete their own).
 */
router.delete('/:id', ensureAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const rideCheck = await RideCheck.findById(id);

    if (!rideCheck) {
      return res.status(404).json({ success: false, error: 'Ride check not found' });
    }

    if (rideCheck.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, error: 'Not authorized to delete this ride check' });
    }

    await RideCheck.findByIdAndDelete(id);

    return res.json({ success: true, message: 'Ride check deleted successfully' });
  } catch (err) {
    console.error('[RideChecks] Delete error:', err.message);
    return res.status(500).json({ success: false, error: 'Failed to delete ride check' });
  }
});

module.exports = router;
