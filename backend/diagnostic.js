#!/usr/bin/env node

/**
 * Backend Diagnostic Script
 * K K K Ekanayake — Safe Bike Ride Planner Backend
 *
 * Validates the environment setup and reports any issues.
 * Run: node diagnostic.js
 * Run tests: node diagnostic.js --test
 */

const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');

// ANSI color helpers
const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const CYAN = '\x1b[36m';
const BOLD = '\x1b[1m';
const RESET = '\x1b[0m';

const PASS = `${GREEN}✓${RESET}`;
const FAIL = `${RED}✗${RESET}`;
const WARN = `${YELLOW}⚠${RESET}`;

const results = { passed: 0, failed: 0, warnings: 0 };
const report = [];

function check(label, passed, fixHint) {
  if (passed) {
    report.push(`  ${PASS} ${label}`);
    results.passed++;
  } else {
    report.push(`  ${FAIL} ${label}`);
    report.push(`      ${YELLOW}Fix: ${fixHint}${RESET}`);
    results.failed++;
  }
}

function warn(label, hint) {
  report.push(`  ${WARN} ${label}`);
  if (hint) report.push(`      ${YELLOW}${hint}${RESET}`);
  results.warnings++;
}

// -------------------------------------------------------------------------
// 1. Node Version
// -------------------------------------------------------------------------
function checkNodeVersion() {
  const version = process.version;
  const major = parseInt(version.replace('v', '').split('.')[0], 10);
  const ok = major >= 18;
  check(
    `Node.js version ${version} (>= 18.x)`,
    ok,
    'Install Node.js v18 or later from https://nodejs.org'
  );
}

// -------------------------------------------------------------------------
// 2. .env file & key variables
// -------------------------------------------------------------------------
function checkEnvFile() {
  const envPath = path.join(__dirname, '.env');
  const envExists = fs.existsSync(envPath);
  check('.env file exists', envExists, 'Copy .env.example to .env and fill in your keys');

  if (envExists) {
    // Load env
    require('dotenv').config({ path: envPath });

    const requiredVars = [
      ['MONGODB_URI', 'Set MONGODB_URI in .env (MongoDB Atlas connection string)'],
      ['SESSION_SECRET', 'Set SESSION_SECRET in .env (run: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))")'],
      ['GOOGLE_CLIENT_ID', 'Set GOOGLE_CLIENT_ID in .env (from Google Cloud Console)'],
      ['GOOGLE_CLIENT_SECRET', 'Set GOOGLE_CLIENT_SECRET in .env (from Google Cloud Console)'],
      ['OPENWEATHER_API_KEY', 'Set OPENWEATHER_API_KEY in .env (from openweathermap.org)'],
      ['GEOLOCATION_API_KEY', 'Set GEOLOCATION_API_KEY in .env (from ipgeolocation.io)'],
    ];

    requiredVars.forEach(([varName, fixHint]) => {
      const val = process.env[varName];
      const placeholderPatterns = [
        'change-this',
        'your-',
        '<username>',
        'xxxxx',
      ];
      const isPlaceholder = placeholderPatterns.some((p) =>
        (val || '').toLowerCase().includes(p)
      );
      const isSet = !!val && !isPlaceholder;

      if (!isSet && val) {
        warn(`${varName} is set but looks like a placeholder (${val.substring(0, 20)}...)`, fixHint);
      } else {
        check(`${varName} is configured`, isSet, fixHint);
      }
    });
  }
}

// -------------------------------------------------------------------------
// 3. node_modules installed
// -------------------------------------------------------------------------
function checkNodeModules() {
  const nmPath = path.join(__dirname, 'node_modules');
  const exists = fs.existsSync(nmPath);

  if (!exists) {
    check('node_modules directory exists', false, 'Run: npm install');
    return;
  }

  // Check critical packages
  const critical = ['express', 'mongoose', 'passport', 'passport-google-oauth20', 'dotenv', 'axios', 'cors', 'express-session', 'express-rate-limit'];
  let allPresent = true;

  critical.forEach((pkg) => {
    const pkgPath = path.join(nmPath, pkg, 'package.json');
    if (!fs.existsSync(pkgPath)) {
      allPresent = false;
      warn(`Missing package: ${pkg}`, 'Run: npm install');
    }
  });

  check('node_modules installed with all required packages', allPresent, 'Run: npm install');
}

// -------------------------------------------------------------------------
// 4. MongoDB connectivity
// -------------------------------------------------------------------------
async function checkMongoDB() {
  const uri = process.env.MONGODB_URI;
  if (!uri || uri.includes('change-this') || uri.includes('<username>')) {
    warn('MongoDB connectivity', 'MONGODB_URI not configured — skipping connectivity test');
    return;
  }

  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
    check('MongoDB connection successful', true, '');
    await mongoose.connection.close();
  } catch (err) {
    check(`MongoDB connection failed: ${err.message}`, false, 'Check your MONGODB_URI, network, and IP whitelist in MongoDB Atlas');
  }
}

// -------------------------------------------------------------------------
// 5. Required directories exist
// -------------------------------------------------------------------------
function checkDirectories() {
  const requiredDirs = [
    ['config', 'config/'],
    ['models', 'models/'],
    ['routes', 'routes/'],
    ['services', 'services/'],
    ['middleware', 'middleware/'],
  ];

  let allExist = true;
  requiredDirs.forEach(([name, relPath]) => {
    const fullPath = path.join(__dirname, relPath);
    const exists = fs.existsSync(fullPath) && fs.statSync(fullPath).isDirectory();
    if (!exists) allExist = false;
    check(`Directory: ${name}/`, exists, `Create directory: ${relPath}`);
  });

  // Also check parent public/ dir
  const publicPath = path.join(__dirname, '..', 'public');
  if (!fs.existsSync(publicPath)) {
    warn('Parent public/ directory not found', 'Create: ../public/ (optional — server will work without it)');
  }
}

// -------------------------------------------------------------------------
// Main
// -------------------------------------------------------------------------
async function main() {
  const isTestMode = process.argv.includes('--test');

  console.log(`\n${CYAN}${BOLD}══════════════════════════════════════════════${RESET}`);
  console.log(`${CYAN}${BOLD}  Safe Bike Ride Planner — Backend Diagnostics${RESET}`);
  console.log(`${CYAN}${BOLD}  K K K Ekanayake${RESET}`);
  console.log(`${CYAN}${BOLD}══════════════════════════════════════════════${RESET}\n`);

  const startTime = Date.now();

  // 1. Node version
  console.log(`${BOLD}1. Runtime Environment${RESET}`);
  checkNodeVersion();

  // 2. .env
  console.log(`\n${BOLD}2. Environment Configuration${RESET}`);
  checkEnvFile();

  // 3. node_modules
  console.log(`\n${BOLD}3. Dependencies${RESET}`);
  checkNodeModules();

  // 4. Directories
  console.log(`\n${BOLD}4. Project Structure${RESET}`);
  checkDirectories();

  // 5. MongoDB
  console.log(`\n${BOLD}5. Database${RESET}`);
  await checkMongoDB();

  // Summary
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`\n${BOLD}──────────────────────────────────────────${RESET}`);
  console.log(`  Results: ${GREEN}${results.passed} passed${RESET}, ${RED}${results.failed} failed${RESET}, ${YELLOW}${results.warnings} warnings${RESET}`);
  console.log(`  Duration: ${elapsed}s`);

  if (results.failed > 0) {
    console.log(`\n${RED}${BOLD}  ❌ Some checks failed. Review the issues above.${RESET}\n`);
    process.exit(isTestMode ? 1 : 0);
  } else if (results.warnings > 0) {
    console.log(`\n${YELLOW}${BOLD}  ⚠ All critical checks passed with warnings.${RESET}\n`);
    process.exit(0);
  } else {
    console.log(`\n${GREEN}${BOLD}  ✅ All checks passed! Backend is ready.${RESET}\n`);
    process.exit(0);
  }
}

main().catch((err) => {
  console.error(`${RED}Diagnostic script crashed:${RESET}`, err.message);
  process.exit(1);
});