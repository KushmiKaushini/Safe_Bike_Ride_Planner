/**
 * Authentication Middleware
 * K K K Ekanayake — Safe Bike Ride Planner Backend
 *
 * ensureAuth: blocks unauthenticated requests with 401 (API routes) or redirect (page routes).
 *
 * FIX-11: Removed `optionalAuth` and `validateApiKey` — both were dead exports.
 * Neither was mounted anywhere in server.js or any route file, creating a false
 * sense of security. `validateApiKey` requires an API_KEY env var that was never
 * documented and silently no-ops in development, making it ineffective.
 */

/**
 * Middleware that requires authentication.
 * For API routes: returns 401 JSON. For page requests: redirects to /.
 */
function ensureAuth(req, res, next) {
  if (req.isAuthenticated && req.isAuthenticated()) {
    return next();
  }
  // For API routes, return 401; for page requests, redirect
  if (req.path.startsWith('/api/')) {
    return res.status(401).json({ success: false, error: 'Authentication required' });
  }
  return res.redirect('/');
}

module.exports = { ensureAuth };
