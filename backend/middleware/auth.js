/**
 * Authentication Middleware
 * Safe Bike Ride Planner — Mobile & Gateway Authentication
 *
 * Supports dual-mode authentication:
 * 1. Bearer Token (JWT) in Authorization header (Mobile Client)
 * 2. Session Cookie via Passport (Legacy Web Client)
 */

const jwt = require('jsonwebtoken');
const User = require('../models/User');

const JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || process.env.SESSION_SECRET || 'dev-jwt-secret-key-change-in-production';

/**
 * Middleware that requires authentication via either Bearer JWT or Passport session.
 */
async function ensureAuth(req, res, next) {
  // Check for Authorization: Bearer <token> (Primary Mobile Flow)
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7).trim();
    try {
      const decoded = jwt.verify(token, JWT_ACCESS_SECRET);
      const user = await User.findById(decoded.sub).lean();
      if (!user) {
        return res.status(401).json({ success: false, error: 'User account not found' });
      }
      req.user = user;
      return next();
    } catch (err) {
      return res.status(401).json({
        success: false,
        error: 'Invalid or expired token',
        code: 'TOKEN_EXPIRED',
      });
    }
  }

  // Fallback for session-based auth
  if (req.isAuthenticated && req.isAuthenticated()) {
    return next();
  }

  // Deny access
  return res.status(401).json({
    success: false,
    error: 'Authentication required',
  });
}

/**
 * Internal Microservice API Key verification middleware.
 */
function requireApiKey(req, res, next) {
  const apiKey = req.headers['x-api-key'];
  const expectedKey = process.env.INTERNAL_API_KEY || 'default-internal-microservice-key';
  if (!apiKey || apiKey !== expectedKey) {
    return res.status(401).json({ success: false, error: 'Unauthorized: Invalid internal API key' });
  }
  return next();
}

module.exports = { ensureAuth, requireApiKey };
