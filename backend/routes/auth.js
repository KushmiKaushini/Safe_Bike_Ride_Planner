/**
 * Google OAuth Authentication Routes
 * K K K Ekanayake — Safe Bike Ride Planner Backend
 *
 * Handles Passport Google OAuth login, callback, logout, and current-user check.
 */

const express = require('express');
const passport = require('passport');
const router = express.Router();

/**
 * GET /auth/google
 * Initiate Google OAuth authentication
 */
router.get(
  '/google',
  passport.authenticate('google', { scope: ['profile', 'email'] })
);

/**
 * GET /auth/google/callback
 * Google OAuth callback — redirects to client on success/failure
 */
router.get(
  '/google/callback',
  passport.authenticate('google', {
    failureRedirect: `${process.env.CLIENT_URL || 'http://localhost:3000'}?login=failed`,
    successRedirect: process.env.CLIENT_URL || 'http://localhost:3000',
  })
);

/**
 * GET /auth/logout
 * Log the current user out and destroy the session
 */
router.get('/logout', (req, res, next) => {
  req.logout((err) => {
    if (err) {
      return next(err);
    }
    req.session.destroy((sessionErr) => {
      if (sessionErr) {
        console.error('[Auth] Session destruction error:', sessionErr.message);
      }
      res.clearCookie('connect.sid');
      return res.redirect(process.env.CLIENT_URL || 'http://localhost:3000');
    });
  });
});

/**
 * GET /auth/current-user
 * Return the currently authenticated user or null
 */
router.get('/current-user', (req, res) => {
  if (req.isAuthenticated && req.isAuthenticated()) {
    return res.json({ success: true, data: req.user });
  }
  return res.json({ success: true, data: null });
});

module.exports = router;