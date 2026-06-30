/**
 * Safe Bike Ride Planner — Express Server Entry Point
 * K K K Ekanayake — Safe Bike Ride Planner Backend
 *
 * Main server: Express + Mongoose + Passport Google OAuth
 * Mounts authentication, external API proxy, and ride check routes.
 */

require('dotenv').config({ path: require('path').join(__dirname, '.env') });

const express = require('express');
const session = require('express-session');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const path = require('path');

const connectDB = require('./config/db');
const User = require('./models/User');

// Route imports
const authRoutes = require('./routes/auth');
const externalRoutes = require('./routes/external');
const rideCheckRoutes = require('./routes/ridechecks');

const app = express();

// ---------------------------------------------------------------------------
// Database Connection
// ---------------------------------------------------------------------------
connectDB();

// ---------------------------------------------------------------------------
// Passport Google OAuth Strategy Configuration
// ---------------------------------------------------------------------------
passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_CALLBACK_URL || 'http://localhost:3000/auth/google/callback',
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        // Find existing user or create a new one
        let user = await User.findOne({ googleId: profile.id });

        if (!user) {
          user = await User.create({
            googleId: profile.id,
            displayName: profile.displayName,
            email: profile.emails?.[0]?.value || '',
            photo: profile.photos?.[0]?.value || '',
          });
        } else {
          // Update profile information on subsequent logins
          user.displayName = profile.displayName || user.displayName;
          user.email = profile.emails?.[0]?.value || user.email;
          user.photo = profile.photos?.[0]?.value || user.photo;
          await user.save();
        }

        return done(null, user);
      } catch (err) {
        console.error('[Passport] Google strategy error:', err.message);
        return done(err, null);
      }
    }
  )
);

// Serialize user ID into the session
passport.serializeUser((user, done) => {
  done(null, user._id);
});

// Deserialize user from the session
passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id).lean();
    done(null, user);
  } catch (err) {
    done(err, null);
  }
});

// ---------------------------------------------------------------------------
// Middleware Setup
// ---------------------------------------------------------------------------

// CORS — allow client origin
app.use(
  cors({
    origin: process.env.CLIENT_URL || 'http://localhost:3000',
    credentials: true,
  })
);

// JSON body parser
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: false }));

// Session
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'fallback-secret-change-in-production',
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    },
  })
);

// Passport initialization
app.use(passport.initialize());
app.use(passport.session());

// Rate limiting — 100 requests per 15 minutes on API routes
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many requests, please try again later.' },
});
app.use('/api/', apiLimiter);

// Static files from the public directory
app.use(express.static(path.join(__dirname, '..', 'public')));

// ---------------------------------------------------------------------------
// Route Mounting
// ---------------------------------------------------------------------------
app.use('/', authRoutes);
app.use('/api/external', externalRoutes);
app.use('/api/ridechecks', rideCheckRoutes);

// ---------------------------------------------------------------------------
// Health Check
// ---------------------------------------------------------------------------
app.get('/health', (req, res) => {
  return res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    uptime: process.uptime(),
  });
});

// ---------------------------------------------------------------------------
// SPA Catch-All — serve index.html for client-side routing
// ---------------------------------------------------------------------------
app.get('*', (req, res) => {
  // Only serve index.html for non-API routes
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ success: false, error: 'Route not found' });
  }
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'), (err) => {
    if (err) {
      // If index.html doesn't exist, return a basic response
      if (err.code === 'ENOENT') {
        return res.status(200).json({
          message: 'Safe Bike Ride Planner API is running. Frontend not yet built.',
        });
      }
      return res.status(500).json({ success: false, error: 'Internal server error' });
    }
  });
});

// ---------------------------------------------------------------------------
// Global Error Handler
// ---------------------------------------------------------------------------
app.use((err, req, res, _next) => {
  console.error('[Server] Unhandled error:', err.stack || err.message);
  return res.status(err.status || 500).json({
    success: false,
    error: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
  });
});

// ---------------------------------------------------------------------------
// Start Server
// ---------------------------------------------------------------------------
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`[Server] Safe Bike Ride Planner running on port ${PORT} (${process.env.NODE_ENV || 'development'})`);
  console.log(`[Server] Health check: http://localhost:${PORT}/health`);
});

module.exports = app;