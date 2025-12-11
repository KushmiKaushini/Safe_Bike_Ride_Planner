# Safe Bike Ride Planner - Quick Start Guide

## 🚀 Quick Start (Easiest Method)

### Windows:
```bash
start.bat
```

### Mac/Linux:
```bash
chmod +x start.sh
./start.sh
```

This will automatically:
1. ✓ Check MongoDB connection
2. ✓ Verify environment configuration
3. ✓ Install dependencies if needed
4. ✓ Run system diagnostic
5. ✓ Start the server
6. ✓ Open app at http://localhost:3000

---

## 📋 Manual Sync Steps

If you prefer manual control:

### Step 1: Start MongoDB

**Option A - Local MongoDB:**
```bash
# Windows
net start MongoDB

# Mac
brew services start mongodb-community

# Linux
sudo systemctl start mongod
```

**Option B - MongoDB Atlas (Cloud):**
- Already running, just ensure `MONGODB_URI` in `.env` is set

### Step 2: Verify Environment

```bash
cd backend
node diagnostic.js
```

This checks:
- ✓ Environment variables
- ✓ Node modules
- ✓ File structure
- ✓ MongoDB connection

### Step 3: Install Dependencies

```bash
cd backend
npm install
```

### Step 4: Start Backend Server

```bash
cd backend
npm start
```

Expected output:
```
✅ MongoDB connected successfully
🚀 Server running on port 3000
🌍 Environment: development
📍 Access the app at: http://localhost:3000
```

### Step 5: Access Frontend

Open browser: **http://localhost:3000**

---

## 🔄 Sync Verification Checklist

### Backend ✓
- [ ] MongoDB running and connected
- [ ] `.env` file configured with API keys
- [ ] Dependencies installed (`node_modules` exists)
- [ ] Server starts without errors
- [ ] Port 3000 is available

### Frontend ✓
- [ ] Static files served from `/public`
- [ ] Can access http://localhost:3000
- [ ] JavaScript files loading (check browser console)
- [ ] CSS styles applied

### Database ✓
- [ ] MongoDB connection successful
- [ ] Database `safe-bike-planner` created
- [ ] Collections: `users`, `ridechecks`, `sessions`
- [ ] Can save and retrieve data

### API Integration ✓
- [ ] Weather API responding
- [ ] Air Quality API responding
- [ ] Location detection working
- [ ] Geocoding working

---

## 🐛 Common Sync Issues

### Issue 1: MongoDB Not Connected
**Error:** `MongoDB connection error`

**Solution:**
```bash
# Check if MongoDB is running
mongosh

# If not, start it:
# Windows: net start MongoDB
# Mac: brew services start mongodb-community
# Linux: sudo systemctl start mongod
```

### Issue 2: Port 3000 Already in Use
**Error:** `EADDRINUSE: address already in use :::3000`

**Solution:**
```bash
# Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# Mac/Linux
lsof -ti:3000 | xargs kill -9
```

### Issue 3: API Keys Not Working
**Error:** `Configuration Error: API key not configured`

**Solution:**
1. Check `backend/.env` file exists
2. Verify API keys are set (not placeholder values)
3. Restart server after editing `.env`

### Issue 4: Frontend Not Loading
**Error:** Blank page or 404

**Solution:**
1. Ensure server is running
2. Check `public/` folder exists with files
3. Clear browser cache (Ctrl+Shift+R)
4. Check browser console for errors

### Issue 5: Can't Save Reports
**Error:** `Failed to save report`

**Solution:**
1. Ensure you're logged in with Google
2. Check MongoDB connection
3. Verify `API_KEY` in `.env` matches frontend
4. Check browser console and server logs

---

## 🔍 Testing the Sync

### Test 1: Backend Health
```bash
curl http://localhost:3000/health
```

Expected response:
```json
{
  "status": "OK",
  "timestamp": "2024-...",
  "environment": "development"
}
```

### Test 2: Weather API
```bash
curl "http://localhost:3000/api/external/weather?lat=1.3521&lon=103.8198"
```

Should return weather data.

### Test 3: Database Connection
```bash
mongosh
use safe-bike-planner
show collections
```

Should show: `ridechecks`, `sessions`, `users`

### Test 4: Frontend Access
Open browser to: http://localhost:3000

Should see the landing page with:
- ✓ Header with logo
- ✓ Hero section
- ✓ Location detection button
- ✓ City input field

---

## 📊 System Architecture

```
┌─────────────────────────────────────┐
│   Browser (Frontend)                │
│   http://localhost:3000             │
│   - HTML/CSS/JavaScript             │
└──────────────┬──────────────────────┘
               │ HTTP Requests
┌──────────────▼──────────────────────┐
│   Express Server (Backend)          │
│   Port 3000                         │
│   - API Routes                      │
│   - Authentication                  │
│   - External API Proxy              │
└──────────────┬──────────────────────┘
               │
       ┌───────┴───────┐
       │               │
┌──────▼─────┐  ┌─────▼──────┐
│  MongoDB   │  │ External   │
│  Database  │  │ APIs       │
│  Local/    │  │ - Weather  │
│  Atlas     │  │ - AQI      │
└────────────┘  └────────────┘
```

---

## 🎯 Success Indicators

When everything is synced correctly:

1. **Server Console:**
   ```
   ✅ MongoDB connected successfully
   🚀 Server running on port 3000
   ```

2. **Browser:**
   - Page loads with modern UI
   - No errors in console (F12)
   - Can detect location
   - Can generate reports

3. **Database:**
   ```bash
   mongosh
   use safe-bike-planner
   db.ridechecks.find().count()
   # Should show number of saved reports
   ```

4. **API Calls:**
   - Weather data shows real temperatures
   - Air quality shows actual AQI values
   - Location detection works

---

## 🔄 Restart Everything

If things get out of sync:

```bash
# 1. Stop server (Ctrl+C)

# 2. Restart MongoDB
# Windows: net stop MongoDB && net start MongoDB
# Mac: brew services restart mongodb-community
# Linux: sudo systemctl restart mongod

# 3. Clear cache
cd backend
rm -rf node_modules
npm install

# 4. Restart server
npm start

# 5. Hard refresh browser
# Ctrl+Shift+R (Windows/Linux)
# Cmd+Shift+R (Mac)
```

---

## 📞 Need Help?

Run the diagnostic:
```bash
cd backend
node diagnostic.js
```

This will show exactly what's not synced and how to fix it.

---

**Everything synced? Great! Start building your cycling safety assessments! 🚴‍♂️**
