/**
 * Authentication Middleware
 * K K K Ekanayake — Safe Bike Ride Planner Backend
 *
 * ensureAuth: blocks unauthenticated requests (redirects to /)
 * optionalAuth: attaches user to req if logged in, continues regardless
 */

/**
 * Middleware that requires authentication.
 * Redirects to the home page if the user is not authenticated.
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

/**
 * Middleware that optionally attaches the authenticated user to the request.
 * Continues to the next handler regardless of authentication state.
 */
function optionalAuth(req, res, next) {
  if (req.isAuthenticated && req.isAuthenticated()) {
    // req.user is already populated by Passport; nothing else to do
    return next();
  }
  // No user attached — route handlers can check req.user === undefined
  return next();
}

module.exports = { ensureAuth, optionalAuth };
