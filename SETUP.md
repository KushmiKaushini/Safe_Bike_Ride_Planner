# Safe Bike Ride Planner - Complete Setup Guide 🚴

A comprehensive web application that integrates weather, air quality, and location data to provide cyclists with real-time safety assessments.

---

## 📋 Table of Contents

1. [Prerequisites](#-prerequisites)
2. [Software Installation](#-software-installation)
3. [API Keys Setup](#-api-keys-setup)
4. [Project Installation](#-project-installation)
5. [Configuration](#-configuration)
6. [Running the Application](#-running-the-application)
7. [Verification](#-verification)
8. [Troubleshooting](#-troubleshooting)
9. [Project Structure](#-project-structure)
10. [Deployment](#-deployment)

---

## 🔧 Prerequisites

### Required Software

Before setting up the project, you need to install the following software on your PC:

| Software | Minimum Version | Purpose | Download Link |
|----------|----------------|---------|---------------|
| **Node.js** | v14.0.0+ | JavaScript runtime | https://nodejs.org/ |
| **npm** | v6.0.0+ | Package manager (comes with Node.js) | - |
| **Git** | Latest | Version control | https://git-scm.com/ |
| **MongoDB** | v4.4+ (optional) | Local database | https://www.mongodb.com/try/download/community |
| **Code Editor** | Any | VS Code recommended | https://code.visualstudio.com/ |

### Required Accounts

You'll need to create free accounts on these platforms:

1. **MongoDB Atlas** (Cloud Database) - https://www.mongodb.com/cloud/atlas
2. **Google Cloud Console** (OAuth Authentication) - https://console.cloud.google.com/
3. **OpenWeatherMap** (Weather API) - https://openweathermap.org/api
4. **IP Geolocation** (Location API) - https://ipgeolocation.io/

---

## 💻 Software Installation

### Step 1: Install Node.js and npm

#### Windows:
1. Download Node.js installer from https://nodejs.org/
2. Run the installer (.msi file)
3. Follow installation wizard (accept defaults)
4. Verify installation:
```bash
node --version  # Should show v14.0.0 or higher
npm --version   # Should show v6.0.0 or higher
```

#### macOS:
```bash
# Using Homebrew (recommended)
brew install node

# Verify installation
node --version
npm --version
```

#### Linux (Ubuntu/Debian):
```bash
# Update package index
sudo apt update

# Install Node.js and npm
sudo apt install nodejs npm

# Verify installation
node --version
npm --version
```

### Step 2: Install Git

#### Windows:
1. Download from https://git-scm.com/download/win
2. Run installer
3. Use recommended settings
4. Verify: `git --version`

#### macOS:
```bash
# Using Homebrew
brew install git

# Verify
git --version
```

#### Linux:
```bash
sudo apt install git
git --version
```

### Step 3: Install MongoDB (Optional - for local database)

**Note:** You can skip this if using MongoDB Atlas (cloud database)

#### Windows:
1. Download MongoDB Community Server from https://www.mongodb.com/try/download/community
2. Run installer
3. Choose "Complete" installation
4. Install as a Windows Service
5. Start MongoDB service:
```bash
net start MongoDB
```

#### macOS:
```bash
brew tap mongodb/brew
brew install mongodb-community
brew services start mongodb-community
```

#### Linux:
```bash
# Import MongoDB public GPG key
wget -qO - https://www.mongodb.org/static/pgp/server-6.0.asc | sudo apt-key add -

# Create list file
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu focal/mongodb-org/6.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-6.0.list

# Install MongoDB
sudo apt update
sudo apt install -y mongodb-org

# Start MongoDB
sudo systemctl start mongod
sudo systemctl enable mongod
```

---

## 🔑 API Keys Setup

### 1. MongoDB Atlas Setup

1. **Create Account:**
   - Go to https://www.mongodb.com/cloud/atlas
   - Click "Try Free" and sign up

2. **Create Cluster:**
   - Click "Build a Database"
   - Choose "FREE" tier (M0 Sandbox)
   - Select cloud provider and region (closest to you)
   - Click "Create Cluster" (takes 3-5 minutes)

3. **Configure Database Access:**
   - Go to "Database Access" in left sidebar
   - Click "Add New Database User"
   - Choose "Password" authentication
   - Username: `bikeapp` (or your choice)
   - Password: Generate secure password (save it!)
   - Database User Privileges: "Read and write to any database"
   - Click "Add User"

4. **Configure Network Access:**
   - Go to "Network Access" in left sidebar
   - Click "Add IP Address"
   - Click "Allow Access from Anywhere" (for development)
   - Click "Confirm"

5. **Get Connection String:**
   - Go to "Database" in left sidebar
   - Click "Connect" on your cluster
   - Choose "Connect your application"
   - Copy the connection string
   - Replace `<password>` with your database user password
   - Save this for later!

**Example Connection String:**
```
mongodb+srv://bikeapp:YOUR_PASSWORD@cluster0.xxxxx.mongodb.net/safe-bike-planner?retryWrites=true&w=majority
```

### 2. Google OAuth 2.0 Setup

1. **Create Project:**
   - Go to https://console.cloud.google.com/
   - Click "Select a project" → "New Project"
   - Project name: "Safe Bike Ride Planner"
   - Click "Create"

2. **Enable Google+ API:**
   - In the project dashboard, go to "APIs & Services" → "Library"
   - Search for "Google+ API"
   - Click on it and click "Enable"

3. **Configure OAuth Consent Screen:**
   - Go to "APIs & Services" → "OAuth consent screen"
   - Choose "External" user type
   - Click "Create"
   - Fill in:
     - App name: "Safe Bike Ride Planner"
     - User support email: your email
     - Developer contact: your email
   - Click "Save and Continue"
   - Skip "Scopes" (click "Save and Continue")
   - Add test users (your email)
   - Click "Save and Continue"

4. **Create OAuth Credentials:**
   - Go to "APIs & Services" → "Credentials"
   - Click "Create Credentials" → "OAuth client ID"
   - Application type: "Web application"
   - Name: "Safe Bike Ride Planner Web Client"
   - Authorized redirect URIs:
     - Add: `http://localhost:3000/auth/google/callback`
   - Click "Create"
   - **SAVE** the Client ID and Client Secret!

**Example:**
```
Client ID: 123456789-abcdefghijklmnop.apps.googleusercontent.com
Client Secret: GOCSPX-aBcDeFgHiJkLmNoPqRsTuVwXyZ
```

### 3. OpenWeatherMap API Key

1. **Create Account:**
   - Go to https://openweathermap.org/api
   - Click "Sign Up"
   - Fill in registration form
   - Verify email

2. **Get API Key:**
   - After login, go to https://home.openweathermap.org/api_keys
   - Your default API key is already generated
   - Or click "Generate" to create a new one
   - Copy the API key

**Note:** New API keys take 10-15 minutes to activate

**Free Tier Limits:**
- 60 calls/minute
- 1,000,000 calls/month

### 4. IP Geolocation API Key

1. **Create Account:**
   - Go to https://ipgeolocation.io/
   - Click "Sign Up Free"
   - Verify email

2. **Get API Key:**
   - After login, dashboard shows your API key
   - Copy it

**Free Tier Limits:**
- 1,500 requests/month
- 30,000 requests/month (with credit card on file)

---

## 📥 Project Installation

### Step 1: Clone or Download Project

#### Option A: Using Git (Recommended)
```bash
# Clone the repository
git clone https://github.com/YOUR_USERNAME/Safe_Bike_Ride_Planner.git

# Navigate to project directory
cd Safe_Bike_Ride_Planner
```

#### Option B: Download ZIP
1. Download project ZIP file
2. Extract to desired location
3. Open terminal/command prompt in that folder

### Step 2: Install Dependencies

```bash
# Navigate to backend directory
cd backend

# Install all required packages
npm install
```

**Expected output:**
```
added 150 packages, and audited 151 packages in 15s
```

**Packages installed:**
- express (web framework)
- mongoose (MongoDB ODM)
- passport (authentication)
- passport-google-oauth20 (Google OAuth)
- express-session (session management)
- cors (cross-origin requests)
- dotenv (environment variables)
- axios (HTTP client)
- express-rate-limit (rate limiting)

---

## ⚙️ Configuration

### Step 1: Create Environment File

```bash
# In the backend directory
cd backend

# Copy example file
cp .env.example .env

# Windows (if cp doesn't work):
copy .env.example .env
```

### Step 2: Edit .env File

Open `backend/.env` in your text editor and fill in all values:

```env
# Server Configuration
PORT=3000
NODE_ENV=development

# MongoDB Configuration
# Replace with YOUR connection string from MongoDB Atlas
MONGODB_URI=mongodb+srv://bikeapp:YOUR_PASSWORD@cluster0.xxxxx.mongodb.net/safe-bike-planner?retryWrites=true&w=majority

# Session Secret
# Generate a random string (at least 32 characters)
# You can use: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
SESSION_SECRET=your-super-secret-session-key-change-this-to-random-string

# Google OAuth 2.0 Credentials
# From Google Cloud Console
GOOGLE_CLIENT_ID=123456789-abcdefghijklmnop.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-aBcDeFgHiJkLmNoPqRsTuVwXyZ
GOOGLE_CALLBACK_URL=http://localhost:3000/auth/google/callback

# External API Keys
# From OpenWeatherMap
OPENWEATHER_API_KEY=your-openweathermap-api-key-here

# From IP Geolocation
GEOLOCATION_API_KEY=your-ipgeolocation-api-key-here

# OpenAQ API (optional - no key needed for basic usage)
OPENAQ_API_KEY=

# Client URL (for CORS)
CLIENT_URL=http://localhost:3000

# API Key for client authentication
# Generate a random string
API_KEY=client-api-key-change-this
```

### Step 3: Generate Secure Secrets

**For SESSION_SECRET and API_KEY**, generate random strings:

```bash
# In terminal/command prompt
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Copy the output and use it for SESSION_SECRET and API_KEY.

---

## 🚀 Running the Application

### Option 1: Development Mode (Recommended for testing)

```bash
# Make sure you're in the backend directory
cd backend

# Start server with auto-reload
npm run dev
```

**Expected output:**
```
✅ MongoDB connected successfully
🚀 Server running on port 3000
🌍 Environment: development
📍 Access the app at: http://localhost:3000
```

### Option 2: Production Mode

```bash
cd backend
npm start
```

### Option 3: Using Startup Scripts

#### Windows:
```bash
# From project root directory
start.bat
```

#### Mac/Linux:
```bash
chmod +x start.sh
./start.sh
```

### Access the Application

Open your web browser and go to:
```
http://localhost:3000
```

You should see the Safe Bike Ride Planner landing page with:
- ✅ Splash screen (3 seconds)
- ✅ Header with logo
- ✅ "Detect My Location" button
- ✅ City input field
- ✅ "Get Ride Report" button

---

## ✅ Verification

### Step 1: Check Server Status

Visit: http://localhost:3000/health

**Expected response:**
```json
{
  "status": "OK",
  "timestamp": "2024-12-10T...",
  "environment": "development"
}
```

### Step 2: Test Location Detection

1. Click "Detect My Location" button
2. Should show your city name
3. Check browser console (F12) for any errors

### Step 3: Test Report Generation

1. Enter a city name (e.g., "Singapore", "London", "New York")
2. Click "Get Ride Report"
3. Should display:
   - Safety score (0-100)
   - Weather information
   - Air quality data
   - Recommendations

### Step 4: Test Authentication

1. Click "Sign in with Google"
2. Should redirect to Google login
3. After login, should return to app
4. Your name should appear in header

### Step 5: Test Save Feature

1. Generate a report (while logged in)
2. Click "Save Report"
3. Should see success message
4. Click "View History"
5. Should see saved report

### Step 6: Check Database

```bash
# Connect to MongoDB
mongosh "YOUR_MONGODB_URI"

# Switch to database
use safe-bike-planner

# Check collections
show collections

# Should see:
# - ridechecks
# - sessions
# - users

# Count documents
db.ridechecks.countDocuments()
```

---

## 🐛 Troubleshooting

### Issue 1: "Cannot connect to MongoDB"

**Error:**
```
MongooseServerSelectionError: connect ECONNREFUSED
```

**Solutions:**

1. **Check MongoDB URI:**
   ```bash
   # Verify .env file has correct connection string
   cat backend/.env | grep MONGODB_URI
   ```

2. **Check IP Whitelist (MongoDB Atlas):**
   - Go to MongoDB Atlas → Network Access
   - Ensure your IP is whitelisted
   - Or use "Allow Access from Anywhere" (0.0.0.0/0)

3. **Check Database User:**
   - Go to MongoDB Atlas → Database Access
   - Verify user exists and has correct password
   - Ensure user has "Read and write" permissions

4. **Test Connection:**
   ```bash
   cd backend
   node -e "require('dotenv').config(); const mongoose = require('mongoose'); mongoose.connect(process.env.MONGODB_URI).then(() => console.log('✅ Connected')).catch(err => console.error('❌ Error:', err.message));"
   ```

### Issue 2: "Google OAuth not working"

**Error:** Redirect URI mismatch or OAuth error

**Solutions:**

1. **Verify Redirect URI:**
   - Google Cloud Console → Credentials
   - Check authorized redirect URIs includes:
     `http://localhost:3000/auth/google/callback`

2. **Check .env values:**
   ```bash
   # Verify credentials
   cat backend/.env | grep GOOGLE_
   ```

3. **Ensure Google+ API is enabled:**
   - Google Cloud Console → APIs & Services → Library
   - Search "Google+ API"
   - Should show "Enabled"

4. **Clear browser cookies:**
   - Chrome: Settings → Privacy → Clear browsing data
   - Select "Cookies" and "Cached images"

### Issue 3: "Port 3000 already in use"

**Error:**
```
Error: listen EADDRINUSE: address already in use :::3000
```

**Solutions:**

#### Windows:
```bash
# Find process using port 3000
netstat -ano | findstr :3000

# Kill process (replace PID with actual number)
taskkill /PID <PID> /F
```

#### Mac/Linux:
```bash
# Find and kill process
lsof -ti:3000 | xargs kill -9

# Or use a different port
PORT=3001 npm start
```

### Issue 4: "API calls failing"

**Error:** Weather or air quality data not loading

**Solutions:**

1. **Check API keys:**
   ```bash
   cat backend/.env | grep API_KEY
   ```

2. **Verify API key activation:**
   - OpenWeatherMap keys take 10-15 minutes to activate
   - Check https://home.openweathermap.org/api_keys

3. **Check rate limits:**
   - OpenWeatherMap: 60 calls/minute
   - IP Geolocation: 1,500/month
   - Wait a few minutes and try again

4. **Test API directly:**
   ```bash
   # Test OpenWeatherMap
   curl "https://api.openweathermap.org/data/2.5/weather?lat=1.3521&lon=103.8198&appid=YOUR_API_KEY"
   ```

### Issue 5: "Module not found"

**Error:**
```
Error: Cannot find module 'express'
```

**Solution:**
```bash
cd backend

# Remove node_modules and package-lock.json
rm -rf node_modules package-lock.json

# Windows:
rmdir /s node_modules
del package-lock.json

# Reinstall dependencies
npm install
```

### Issue 6: "Splash screen not showing"

**Solution:**
```bash
# Hard refresh browser
# Windows/Linux: Ctrl + Shift + R
# Mac: Cmd + Shift + R

# Clear browser cache
# Chrome: Settings → Privacy → Clear browsing data

# Check browser console for errors (F12)
```

### Issue 7: "CORS errors"

**Error:**
```
Access to fetch at '...' from origin '...' has been blocked by CORS policy
```

**Solution:**

1. **Check CLIENT_URL in .env:**
   ```env
   CLIENT_URL=http://localhost:3000
   ```

2. **Restart server after changing .env**

3. **Verify CORS middleware in server.js:**
   ```javascript
   app.use(cors({
       origin: process.env.CLIENT_URL,
       credentials: true
   }));
   ```

---

## 📁 Project Structure

```
Safe_Bike_Ride_Planner/
├── backend/                      # Backend server
│   ├── config/
│   │   └── passport.js          # OAuth configuration
│   ├── middleware/
│   │   └── auth.js              # Authentication middleware
│   ├── models/
│   │   ├── User.js              # User schema
│   │   └── RideCheck.js         # Ride check schema
│   ├── routes/
│   │   ├── api.js               # API endpoints
│   │   ├── auth.js              # Auth routes
│   │   └── external.js          # External API proxy
│   ├── .env                     # Environment variables (create this)
│   ├── .env.example             # Environment template
│   ├── package.json             # Dependencies
│   ├── diagnostic.js            # System diagnostic tool
│   └── server.js                # Main server file
├── public/                       # Frontend files
│   ├── css/
│   │   └── styles.css           # All styles
│   ├── js/
│   │   ├── app.js               # Main application logic
│   │   ├── api-service.js       # API communication
│   │   └── safety-calculator.js # Safety scoring
│   ├── index.html               # Main page
│   └── splash-test.html         # Splash screen test
├── start.bat                     # Windows startup script
├── start.sh                      # Mac/Linux startup script
├── SETUP.md                      # This file
├── SYNC.md                       # Quick sync guide
└── README.md                     # Project overview
```

---

## 🚢 Deployment

### Preparing for Production

1. **Update Environment Variables:**
```env
NODE_ENV=production
CLIENT_URL=https://yourdomain.com
GOOGLE_CALLBACK_URL=https://yourdomain.com/auth/google/callback
```

2. **Update Google OAuth:**
   - Add production URL to authorized redirect URIs
   - Add production domain to authorized domains

3. **MongoDB Atlas:**
   - Update IP whitelist to production server IP
   - Or keep "Allow from anywhere" with strong credentials

4. **Security Checklist:**
   - [ ] Strong SESSION_SECRET (64+ characters)
   - [ ] Strong API_KEY
   - [ ] HTTPS enabled
   - [ ] Environment variables secured
   - [ ] Database user has minimal required permissions

### Deployment Platforms

#### Heroku
```bash
# Install Heroku CLI
# Create Heroku app
heroku create safe-bike-planner

# Set environment variables
heroku config:set MONGODB_URI=...
heroku config:set GOOGLE_CLIENT_ID=...
# ... set all other variables

# Deploy
git push heroku main
```

#### Vercel
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Set environment variables in Vercel dashboard
```

#### DigitalOcean / AWS / Azure
- Use PM2 for process management
- Configure Nginx as reverse proxy
- Set up SSL with Let's Encrypt
- Configure firewall rules

---

## 📚 Additional Resources

- **Node.js Documentation:** https://nodejs.org/docs/
- **Express.js Guide:** https://expressjs.com/en/guide/routing.html
- **MongoDB Manual:** https://docs.mongodb.com/manual/
- **Mongoose Docs:** https://mongoosejs.com/docs/
- **Passport.js:** http://www.passportjs.org/docs/

---

## 🎯 Quick Start Checklist

- [ ] Install Node.js and npm
- [ ] Install Git
- [ ] Create MongoDB Atlas account and cluster
- [ ] Create Google Cloud project and OAuth credentials
- [ ] Get OpenWeatherMap API key
- [ ] Get IP Geolocation API key
- [ ] Clone/download project
- [ ] Run `npm install` in backend directory
- [ ] Create `.env` file from `.env.example`
- [ ] Fill in all API keys in `.env`
- [ ] Run `npm start` in backend directory
- [ ] Open http://localhost:3000
- [ ] Test location detection
- [ ] Test report generation
- [ ] Test Google login
- [ ] Test save feature

---

## 📧 Support

If you encounter issues not covered in this guide:

1. Check the browser console (F12) for errors
2. Check server logs in terminal
3. Run diagnostic: `cd backend && node diagnostic.js`
4. Review the [Troubleshooting](#-troubleshooting) section
5. Check existing GitHub issues
6. Create a new issue with:
   - Error message
   - Steps to reproduce
   - System information (OS, Node version)
   - Screenshots if applicable

---

**Built with ❤️ for cyclists everywhere**

**Last Updated:** December 2024


## 🌟 Features

- **Real-time Safety Scoring**: Intelligent algorithm that evaluates weather conditions and air quality
- **Location Detection**: Automatic location detection or manual city input
- **User Authentication**: Google OAuth 2.0 integration for personalized experience
- **History Tracking**: Save and review past safety assessments
- **Statistics Dashboard**: View your cycling patterns and safety trends
- **Premium UI**: Modern, responsive design with glassmorphism effects and smooth animations
- **Mobile Responsive**: Optimized for all devices

## 📋 Prerequisites

Before you begin, ensure you have the following installed:
- **Node.js** (v14 or higher)
- **npm** (v6 or higher)
- **MongoDB** (local instance or MongoDB Atlas account)

## 🔑 Required API Keys

You'll need to obtain API keys from the following services:

1. **OpenWeatherMap** (Weather Data)
   - Sign up at: https://openweathermap.org/api
   - Free tier: 60 calls/minute, 1,000,000 calls/month

2. **Google OAuth 2.0** (Authentication)
   - Google Cloud Console: https://console.cloud.google.com/
   - Enable Google+ API
   - Create OAuth 2.0 credentials

3. **MongoDB Atlas** (Database)
   - Sign up at: https://www.mongodb.com/cloud/atlas
   - Create a free cluster
   - Get connection string

4. **Optional: IP Geolocation API**
   - The app uses free services by default
   - For higher limits: https://ipgeolocation.io/

## 🚀 Installation

### 1. Clone the Repository

```bash
cd "d:\My Projects\Flutter Projects\Safe_Bike_Ride_Planner"
```

### 2. Install Backend Dependencies

```bash
cd backend
npm install
```

### 3. Configure Environment Variables

Create a `.env` file in the `backend` directory:

```bash
cp .env.example .env
```

Edit `.env` and add your API keys:

```env
# Server Configuration
PORT=3000
NODE_ENV=development

# MongoDB Configuration
MONGODB_URI=mongodb+srv://YOUR_USERNAME:YOUR_PASSWORD@YOUR_CLUSTER.mongodb.net/safe-bike-planner?retryWrites=true&w=majority

# Session Secret (generate a random string)
SESSION_SECRET=your-super-secret-session-key-change-this

# Google OAuth 2.0 Credentials
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_CALLBACK_URL=http://localhost:3000/auth/google/callback

# OpenWeatherMap API Key
OPENWEATHER_API_KEY=your-openweathermap-api-key

# IP Geolocation API Key (optional)
GEOLOCATION_API_KEY=your-geolocation-api-key

# Client URL (for CORS)
CLIENT_URL=http://localhost:3000

# API Key for client authentication
API_KEY=client-api-key
```

### 4. Set Up Google OAuth 2.0

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Google+ API
4. Create OAuth 2.0 credentials:
   - Application type: Web application
   - Authorized redirect URIs: `http://localhost:3000/auth/google/callback`
5. Copy the Client ID and Client Secret to your `.env` file

### 5. Set Up MongoDB

Option A: MongoDB Atlas (Cloud)
1. Create account at https://www.mongodb.com/cloud/atlas
2. Create a new cluster (free tier available)
3. Add your IP to the IP Whitelist
4. Create a database user
5. Get connection string and add to `.env`

Option B: Local MongoDB
1. Install MongoDB locally
2. Start MongoDB service
3. Use connection string: `mongodb://localhost:27017/safe-bike-planner`

## 🏃 Running the Application

### Development Mode

```bash
cd backend
npm run dev
```

This will start the server with nodemon for auto-restart on file changes.

### Production Mode

```bash
cd backend
npm start
```

### Access the Application

Open your browser and navigate to:
```
http://localhost:3000
```

## 📁 Project Structure

```
Safe_Bike_Ride_Planner/
├── backend/
│   ├── config/
│   │   └── passport.js          # OAuth configuration
│   ├── middleware/
│   │   └── auth.js              # Authentication middleware
│   ├── models/
│   │   ├── User.js              # User schema
│   │   └── RideCheck.js         # Ride check schema
│   ├── routes/
│   │   ├── api.js               # API endpoints
│   │   └── auth.js              # Auth routes
│   ├── .env.example             # Environment template
│   ├── package.json             # Dependencies
│   └── server.js                # Main server file
├── public/
│   ├── css/
│   │   └── styles.css           # Complete design system
│   ├── js/
│   │   ├── app.js               # Main application logic
│   │   ├── api-service.js       # API integration
│   │   └── safety-calculator.js # Safety scoring algorithm
│   └── index.html               # Main HTML structure
└── README.md
```

## 🎨 Architecture Overview

### Three-Tier Architecture

```
┌─────────────────────────────────────┐
│      Client Tier (Browser)          │
│  HTML5 + CSS3 + Vanilla JavaScript  │
└──────────────┬──────────────────────┘
               │ REST API
┌──────────────▼──────────────────────┐
│    Application Tier (Node.js)       │
│  Express + Passport + Mongoose      │
└──────────────┬──────────────────────┘
               │ MongoDB Driver
┌──────────────▼──────────────────────┐
│      Data Tier (MongoDB Atlas)      │
│   Users + RideChecks + Sessions     │
└─────────────────────────────────────┘
```

## 🔐 Security Features

- **OAuth 2.0 Authentication**: Secure Google login
- **Session Management**: HTTP-only cookies
- **CORS Protection**: Configured origin whitelist
- **Rate Limiting**: Prevent API abuse
- **Input Validation**: Mongoose schema validation
- **API Key Authentication**: Client verification
- **HTTPS Ready**: SSL/TLS support for production

## 📊 Safety Score Algorithm

The safety score (0-100) is calculated using:

- **Weather Score (40%)**:
  - Temperature: Optimal 15-25°C
  - Wind Speed: Safe <8 m/s
  - Precipitation: None preferred
  - Humidity: Comfortable 40-70%

- **Air Quality Score (40%)**:
  - AQI 0-50: Excellent (100 points)
  - AQI 51-100: Good (80 points)
  - AQI 101-150: Moderate (60 points)
  - AQI 151+: Unhealthy (<40 points)

- **Condition Score (20%)**:
  - Clear/Sunny: 100 points
  - Cloudy: 85 points
  - Rain: 30-50 points
  - Storm: 10 points

**Safety Levels:**
- **Safe**: Score 70-100 (Green)
- **Caution**: Score 40-69 (Yellow)
- **Unsafe**: Score 0-39 (Red)

## 🌐 API Endpoints

### Authentication
- `GET /auth/google` - Initiate Google OAuth
- `GET /auth/google/callback` - OAuth callback
- `GET /auth/logout` - Logout user
- `GET /auth/status` - Check auth status

### API Routes
- `POST /api/ride-check` - Create safety assessment
- `GET /api/ride-checks` - Get user's assessments
- `GET /api/ride-checks/:id` - Get specific assessment
- `DELETE /api/ride-checks/:id` - Delete assessment
- `GET /api/user/profile` - Get user profile
- `GET /api/user/stats` - Get user statistics

## 🧪 Testing

### Manual Testing Checklist

1. **Landing Page**
   - [ ] Auto-detect location works
   - [ ] Manual city input works
   - [ ] Generate report button functional

2. **Safety Report**
   - [ ] Safety score displays correctly
   - [ ] Color coding matches score
   - [ ] Weather data shows
   - [ ] Air quality data shows
   - [ ] Recommendations appear

3. **Authentication**
   - [ ] Google login works
   - [ ] User profile displays
   - [ ] Logout works
   - [ ] Protected routes require auth

4. **History**
   - [ ] Assessments save correctly
   - [ ] History loads
   - [ ] Filters work
   - [ ] Statistics calculate properly

5. **Responsive Design**
   - [ ] Mobile view (320px width)
   - [ ] Tablet view (768px width)
   - [ ] Desktop view (1920px width)

## 🐛 Troubleshooting

### Common Issues

**Error: MongoDB connection failed**
- Check MongoDB URI in `.env`
- Verify IP whitelist in MongoDB Atlas
- Ensure database user has correct permissions

**Error: Google OAuth not working**
- Verify Client ID and Secret in `.env`
- Check authorized redirect URI in Google Console
- Ensure Google+ API is enabled

**Error: API calls failing**
- Check API keys in `.env`
- Verify rate limits haven't been exceeded
- Check network connectivity

**Error: Cannot find module**
```bash
cd backend
rm -rf node_modules package-lock.json
npm install
```

## 🚢 Deployment

### Prepare for Production

1. Update environment variables:
```env
NODE_ENV=production
CLIENT_URL=https://yourdomain.com
GOOGLE_CALLBACK_URL=https://yourdomain.com/auth/google/callback
```

2. Enable HTTPS in server configuration

3. Set up MongoDB Atlas production cluster

4. Update Google OAuth authorized domains

### Deployment Platforms

- **Heroku**: Easiest deployment
- **Vercel**: Great for full-stack apps
- **DigitalOcean**: More control
- **AWS**: Enterprise-grade

## 📝 License

MIT License - Feel free to use for personal or commercial projects

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Open a Pull Request

## 📧 Support

For issues or questions:
- Create an issue in the repository
- Check existing documentation
- Review troubleshooting section

## 🎯 Future Enhancements

- [ ] Route planning with elevation data
- [ ] Social features (share rides)
- [ ] Notification system for conditions
- [ ] Mobile app (React Native)
- [ ] Advanced analytics dashboard
- [ ] Integration with fitness trackers
- [ ] Multi-language support
- [ ] Dark/Light theme toggle

---

**Built with ❤️ for cyclists everywhere**
