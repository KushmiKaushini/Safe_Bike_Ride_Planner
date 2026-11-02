const express = require('express');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const User = require('../models/User');
const RefreshToken = require('../models/RefreshToken');
const { ensureAuth } = require('../middleware/auth');

const router = express.Router();

const JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || process.env.SESSION_SECRET || 'dev-jwt-secret-key-change-in-production';
const JWT_ACCESS_TTL = parseInt(process.env.JWT_ACCESS_TTL || '900', 10); // 15 minutes (in seconds)
const REFRESH_TOKEN_TTL = parseInt(process.env.JWT_REFRESH_TTL || '604800', 10); // 7 days (in seconds)

const googleClient = new OAuth2Client();

/**
 * Generate a SHA-256 hash of an opaque token string.
 */
function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/**
 * Generate a signed JWT Access Token.
 */
function generateAccessToken(user) {
  return jwt.sign(
    {
      sub: user._id.toString(),
      email: user.email,
      displayName: user.displayName,
    },
    JWT_ACCESS_SECRET,
    { expiresIn: JWT_ACCESS_TTL }
  );
}

/**
 * Create and persist a rotating Refresh Token record.
 */
async function createRefreshTokenRecord(userId, platform, existingFamilyId = null) {
  const rawToken = 'rt_' + crypto.randomBytes(32).toString('hex');
  const tokenHash = hashToken(rawToken);
  const familyId = existingFamilyId || crypto.randomUUID();
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL * 1000);

  await RefreshToken.create({
    userId,
    tokenHash,
    familyId,
    platform: platform === 'ios' ? 'ios' : 'android',
    expiresAt,
  });

  return { rawToken, expiresAt };
}

/**
 * POST /api/auth/register
 * Manual User Registration (Email/Password)
 */
router.post('/register', async (req, res) => {
  try {
    const { email, password, displayName, platform } = req.body;

    if (!email || !email.trim()) {
      return res.status(400).json({ success: false, error: 'Email is required' });
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      return res.status(400).json({ success: false, error: 'Please enter a valid email address' });
    }
    if (!password || password.length < 6) {
      return res.status(400).json({ success: false, error: 'Password must be at least 6 characters long' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const existing = await User.findOne({ email: cleanEmail });
    if (existing) {
      return res.status(400).json({ success: false, error: 'An account with this email already exists' });
    }

    const name = displayName && displayName.trim() ? displayName.trim() : cleanEmail.split('@')[0];

    const user = await User.create({
      email: cleanEmail,
      password,
      displayName: name,
      authProvider: 'local',
      lastLoginPlatform: platform === 'ios' ? 'ios' : 'android',
    });

    const accessToken = generateAccessToken(user);
    const { rawToken: refreshToken } = await createRefreshTokenRecord(user._id, platform);

    return res.status(201).json({
      success: true,
      data: {
        accessToken,
        refreshToken,
        tokenType: 'Bearer',
        expiresIn: JWT_ACCESS_TTL,
        user: {
          id: user._id.toString(),
          displayName: user.displayName,
          email: user.email,
          photo: user.photo || '',
          thresholdProfile: user.thresholdProfile,
        },
      },
    });
  } catch (err) {
    console.error('[Auth] Registration error:', err);
    return res.status(500).json({ success: false, error: 'Registration failed: ' + err.message });
  }
});

/**
 * POST /api/auth/login
 * Manual User Login (Email/Password)
 */
router.post('/login', async (req, res) => {
  try {
    const { email, password, platform } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, error: 'Email and password are required' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const user = await User.findOne({ email: cleanEmail }).select('+password');
    if (!user) {
      return res.status(401).json({ success: false, error: 'Invalid email or password' });
    }

    if (user.authProvider === 'google' && !user.password) {
      return res.status(400).json({
        success: false,
        error: 'This account was created with Google Sign-In. Please sign in using Google.',
      });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ success: false, error: 'Invalid email or password' });
    }

    user.lastLoginPlatform = platform === 'ios' ? 'ios' : 'android';
    await user.save();

    const accessToken = generateAccessToken(user);
    const { rawToken: refreshToken } = await createRefreshTokenRecord(user._id, platform);

    return res.json({
      success: true,
      data: {
        accessToken,
        refreshToken,
        tokenType: 'Bearer',
        expiresIn: JWT_ACCESS_TTL,
        user: {
          id: user._id.toString(),
          displayName: user.displayName,
          email: user.email,
          photo: user.photo || '',
          thresholdProfile: user.thresholdProfile,
        },
      },
    });
  } catch (err) {
    console.error('[Auth] Login error:', err);
    return res.status(500).json({ success: false, error: 'Login failed: ' + err.message });
  }
});

/**
 * POST /api/auth/mobile/token
 * Mobile OAuth 2.0 PKCE Token Exchange Endpoint
 *
 * Verifies the Google id_token from the mobile app (RFC 8252 PKCE flow),
 * upserts the user, and issues a JWT access token & rotating refresh token.
 */
router.post('/mobile/token', async (req, res) => {
  try {
    const { idToken, platform } = req.body;

    if (!idToken) {
      return res.status(400).json({
        success: false,
        error: 'idToken is required',
      });
    }

    let payload;
    // Development/mock token support
    if (process.env.NODE_ENV !== 'production' && typeof idToken === 'string' && idToken.startsWith('mock_')) {
      payload = {
        sub: 'mock_google_user_' + idToken.replace(/[^a-zA-Z0-9]/g, '').slice(-8),
        email: 'cyclist@example.com',
        displayName: 'Demo Cyclist',
        picture: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100',
      };
    } else {
      try {
        // In production, verify with Google.
        // In development/test environments, allow decoding if GOOGLE_CLIENT_ID isn't yet live.
        const ticket = await googleClient.verifyIdToken({
          idToken,
          audience: process.env.GOOGLE_CLIENT_ID ? process.env.GOOGLE_CLIENT_ID.split(',') : undefined,
        });
        payload = ticket.getPayload();
      } catch (verifyErr) {
        // Fallback for development/mock tokens
        if (process.env.NODE_ENV !== 'production') {
          const decoded = jwt.decode(idToken);
          if (decoded && decoded.sub) {
            payload = decoded;
          } else {
            return res.status(401).json({
              success: false,
              error: 'Invalid Google id_token: ' + verifyErr.message,
            });
          }
        } else {
          return res.status(401).json({
            success: false,
            error: 'Google id_token verification failed',
          });
        }
      }
    }

    const googleId = payload.sub;
    const email = payload.email || '';
    const displayName = payload.name || payload.displayName || email.split('@')[0] || 'Cyclist';
    const photo = payload.picture || payload.photo || '';

    // Find existing user or create a new one
    let user = await User.findOne(email ? { $or: [{ googleId }, { email }] } : { googleId });
    if (!user) {
      user = await User.create({
        googleId,
        displayName,
        email,
        photo,
        lastLoginPlatform: platform === 'ios' ? 'ios' : 'android',
      });
    } else {
      user.displayName = displayName || user.displayName;
      user.email = email || user.email;
      user.photo = photo || user.photo;
      user.lastLoginPlatform = platform === 'ios' ? 'ios' : user.lastLoginPlatform;
      await user.save();
    }

    // Generate token pair
    const accessToken = generateAccessToken(user);
    const { rawToken: refreshToken } = await createRefreshTokenRecord(user._id, platform);

    return res.json({
      success: true,
      data: {
        accessToken,
        refreshToken,
        tokenType: 'Bearer',
        expiresIn: JWT_ACCESS_TTL,
        user: {
          id: user._id,
          displayName: user.displayName,
          email: user.email,
          photo: user.photo,
          thresholdProfile: user.thresholdProfile,
        },
      },
    });
  } catch (err) {
    console.error('[Auth] Mobile token exchange error:', err.message);
    return res.status(500).json({
      success: false,
      error: 'Authentication failed',
    });
  }
});

/**
 * POST /api/auth/refresh
 * Silent Refresh Token Rotation
 */
router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        error: 'refreshToken is required',
      });
    }

    const tokenHash = hashToken(refreshToken);
    const existing = await RefreshToken.findOne({ tokenHash });

    if (!existing) {
      return res.status(401).json({
        success: false,
        error: 'Invalid or unrecognized refresh token',
      });
    }

    // Detect reuse of revoked token (token theft detection)
    if (existing.revokedAt) {
      // Invalidate all tokens in this family
      await RefreshToken.updateMany(
        { familyId: existing.familyId },
        { $set: { revokedAt: new Date() } }
      );
      return res.status(401).json({
        success: false,
        error: 'Compromised refresh token chain. Session terminated.',
      });
    }

    // Check expiration
    if (new Date() > existing.expiresAt) {
      return res.status(401).json({
        success: false,
        error: 'Refresh token has expired. Please log in again.',
      });
    }

    // Mark current token as revoked
    existing.revokedAt = new Date();
    await existing.save();

    // Look up user
    const user = await User.findById(existing.userId);
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Associated user account no longer exists',
      });
    }

    // Issue rotated token pair
    const newAccessToken = generateAccessToken(user);
    const { rawToken: newRefreshToken } = await createRefreshTokenRecord(
      user._id,
      existing.platform,
      existing.familyId
    );

    return res.json({
      success: true,
      data: {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
        tokenType: 'Bearer',
        expiresIn: JWT_ACCESS_TTL,
      },
    });
  } catch (err) {
    console.error('[Auth] Token refresh error:', err.message);
    return res.status(500).json({
      success: false,
      error: 'Failed to refresh token',
    });
  }
});

/**
 * POST /api/auth/logout
 * Revokes active refresh token
 */
router.post('/logout', async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (refreshToken) {
      const tokenHash = hashToken(refreshToken);
      await RefreshToken.updateOne({ tokenHash }, { $set: { revokedAt: new Date() } });
    }
    if (req.logout) {
      req.logout(() => {});
    }
    return res.json({
      success: true,
      message: 'Logged out successfully',
    });
  } catch (err) {
    console.error('[Auth] Logout error:', err.message);
    return res.status(500).json({
      success: false,
      error: 'Logout failed',
    });
  }
});

/**
 * GET /api/auth/me
 * Retrieves profile of authenticated mobile user
 */
router.get('/me', ensureAuth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-__v');
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }
    return res.json({
      success: true,
      data: user,
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: 'Failed to fetch user profile' });
  }
});

module.exports = router;
