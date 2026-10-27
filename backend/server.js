/**
 * Safe Bike Ride Planner — Express Server Entry Point
 * K K K Ekanayake — Safe Bike Ride Planner Backend
 *
 * Main server: Express + Mongoose + Passport Google OAuth
 * Mounts authentication, external API proxy, and ride check routes.
 *
 * Phase 3 Security Hardening applied:
 *   FIX-12 — helmet HTTP security headers + Content Security Policy
 *   FIX-13 — MongoDB-backed session store (connect-mongo) — no more memory-only sessions
 *   FIX-14 — Origin-based CSRF protection on write routes
 *   FIX-15 — Hard-fail on missing required env vars in production
 *   FIX-16 — Strict CORS allowlist (env-controlled in production)
 *   FIX-17 — express-mongo-sanitize (NoSQL injection prevention) + trust proxy
 */

const fs   = require('fs');
const path = require('path');

// Load environment variables from backend/.env or root .env
const backendEnvPath = path.join(__dirname, '.env');
const rootEnvPath    = path.join(__dirname, '..', '.env');
if (fs.existsSync(backendEnvPath)) {
  require('dotenv').config({ path: backendEnvPath });
} else if (fs.existsSync(rootEnvPath)) {
  require('dotenv').config({ path: rootEnvPath });
} else {
  require('dotenv').config();
}

const express    = require('express');
const session    = require('express-session');
const passport   = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const cors       = require('cors');
const rateLimit  = require('express-rate-limit');
const helmet     = require('helmet');
const connectMongo   = require('connect-mongo');
const MongoStore     = connectMongo.MongoStore || connectMongo.default || connectMongo;
const mongoSanitize = require('express-mongo-sanitize');

const connectDB = require('./config/db');
const User      = require('./models/User');

// Route imports
const authRoutes      = require('./routes/auth');
const externalRoutes  = require('./routes/external');
const rideCheckRoutes = require('./routes/ridechecks');

const app = express();

// ---------------------------------------------------------------------------
// FIX-15: Hard-fail on missing required environment variables in production.
// Prevents silent deployment with placeholder/default secrets.
// ---------------------------------------------------------------------------
if (process.env.NODE_ENV === 'production') {
  const required = [
    'SESSION_SECRET', 'MONGODB_URI', 'GOOGLE_CLIENT_ID',
    'GOOGLE_CLIENT_SECRET', 'OPENWEATHER_API_KEY', 'GEOLOCATION_API_KEY',
  ];
  const suspicious = ['change-this', 'your-', '<username>', 'fallback', 'dev-only'];
  const missing = required.filter(k =>
    !process.env[k] || suspicious.some(p => (process.env[k] || '').toLowerCase().includes(p))
  );
  if (missing.length > 0) {
    console.error('[Server] FATAL: Missing or placeholder required env vars:', missing.join(', '));
    process.exit(1);
  }
}

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

// FIX-17: Trust reverse-proxy (Render, Vercel, Heroku, etc.) in production
// so req.ip reflects the real client IP and rate-limiting works correctly.
if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}

// FIX-12: Helmet — sets security-critical HTTP response headers.
// Includes: X-Frame-Options, X-Content-Type-Options, Strict-Transport-Security, etc.
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc:  ["'self'"],
      scriptSrc:   ["'self'"],
      styleSrc:    ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      fontSrc:     ["'self'", 'https://fonts.gstatic.com'],
      imgSrc:      [
        "'self'", 'data:',
        'https://lh3.googleusercontent.com',
        'https://openweathermap.org',
        'https://openweathermap.org/img/',
      ],
      connectSrc:  ["'self'"],
    },
  },
}));

// FIX-16: Strict CORS — production only allows CLIENT_URL; dev allows localhost variants.
const allowedOrigins = process.env.NODE_ENV === 'production'
  ? [process.env.CLIENT_URL].filter(Boolean)
  : ['http://localhost:3000', 'http://127.0.0.1:3000'];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow same-origin requests (no Origin header) and listed origins
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('CORS: origin not allowed'));
      }
    },
    credentials: true,
  })
);

// JSON body parser
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: false }));

// FIX-17: express-mongo-sanitize — strips $ and . from user input to prevent
// NoSQL operator injection attacks (e.g., { "$gt": "" } in login fields).
app.use(mongoSanitize());

// FIX-13: MongoDB-backed session store (connect-mongo).
// With MongoStore sessions survive restarts and scale across multiple processes.
const sessionConfig = {
  secret: process.env.SESSION_SECRET || 'dev-only-secret-change-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure:   process.env.NODE_ENV === 'production', // HTTPS-only in prod
    httpOnly: true,                                   // not accessible via JS
    sameSite: 'lax',                                  // 'strict' breaks OAuth redirects
    maxAge:   24 * 60 * 60 * 1000,                   // 24 hours in ms
  },
};

const isPlaceholderMongo = !process.env.MONGODB_URI ||
  process.env.MONGODB_URI.includes('<username>') ||
  process.env.MONGODB_URI.includes('xxxxx');

if (!isPlaceholderMongo) {
  sessionConfig.store = MongoStore.create({
    mongoUrl:   process.env.MONGODB_URI,
    ttl:        24 * 60 * 60,  // sessions expire after 24 hours
    autoRemove: 'native',      // MongoDB TTL index handles cleanup
  });
} else if (process.env.NODE_ENV === 'production') {
  console.error('[Server] FATAL: Valid MONGODB_URI required for production session store.');
  process.exit(1);
} else {
  console.warn('[Server] Notice: Using in-memory session store (development placeholder MONGODB_URI detected).');
  console.warn('[Server] Set your real MongoDB Atlas URI in backend/.env for persistent sessions.');
}

app.use(session(sessionConfig));

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

// FIX-21: Static files with production-appropriate cache headers.
// HTML pages are never cached (no-cache) so deploys are picked up immediately.
// Other assets (JS, CSS, images) get a 7-day max-age in production.
app.use(express.static(path.join(__dirname, '..', 'public'), {
  maxAge: process.env.NODE_ENV === 'production' ? '7d' : 0,
  etag:   true,
  setHeaders: (res, fp) => {
    if (fp.endsWith('.html')) {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    }
  },
}));

// ---------------------------------------------------------------------------
// FIX-14: Origin-based CSRF protection on mutating (write) routes.
// Blocks cross-origin POST/DELETE requests that arrive without a matching Origin.
// Using 'lax' sameSite on the cookie still allows the OAuth flow to work.
// ---------------------------------------------------------------------------
function verifySameOrigin(req, res, next) {
  const origin  = req.headers.origin || req.headers.referer || '';
  const allowed = process.env.CLIENT_URL || 'http://localhost:3000';
  if (origin && !origin.startsWith(allowed)) {
    return res.status(403).json({ success: false, error: 'Forbidden: origin mismatch' });
  }
  return next();
}

// ---------------------------------------------------------------------------
// Route Mounting
// ---------------------------------------------------------------------------
app.use('/auth', authRoutes);
app.use('/', authRoutes);
app.use('/api/external', externalRoutes);
// FIX-14: Apply CSRF guard to write routes (ridechecks creates/deletes user data)
app.use('/api/ridechecks', verifySameOrigin, rideCheckRoutes);

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