@echo off
REM Safe Bike Ride Planner - Complete Sync and Startup Script
REM This script ensures backend, frontend, and database are synced and running

echo ========================================
echo Safe Bike Ride Planner - System Sync
echo ========================================
echo.

REM Step 1: Check if MongoDB is running
echo [1/6] Checking MongoDB connection...
echo.

REM Try to connect to MongoDB
mongosh --eval "db.adminCommand('ping')" --quiet >nul 2>&1
if %errorlevel% equ 0 (
    echo [OK] MongoDB is running
) else (
    echo [WARNING] MongoDB is not running or not installed
    echo.
    echo Please start MongoDB:
    echo   - If using MongoDB Compass: Open it and start the connection
    echo   - If using command line: Run 'mongod' in a separate terminal
    echo   - Or use MongoDB Atlas cloud database
    echo.
    pause
)

echo.

REM Step 2: Check if .env file exists
echo [2/6] Checking environment configuration...
if exist "backend\.env" (
    echo [OK] Environment file exists
) else (
    echo [ERROR] backend\.env file not found!
    echo Creating from .env.example...
    copy "backend\.env.example" "backend\.env"
    echo.
    echo [ACTION REQUIRED] Please edit backend\.env with your API keys
    echo Then run this script again.
    pause
    exit /b 1
)

echo.

REM Step 3: Check Node modules
echo [3/6] Checking Node.js dependencies...
if exist "backend\node_modules" (
    echo [OK] Dependencies installed
) else (
    echo [INFO] Installing dependencies...
    cd backend
    call npm install
    cd ..
    echo [OK] Dependencies installed successfully
)

echo.

REM Step 4: Run diagnostic
echo [4/6] Running system diagnostic...
cd backend
node diagnostic.js
cd ..

echo.

REM Step 5: Start the server
echo [5/6] Starting the server...
echo.
echo ========================================
echo Server is starting...
echo ========================================
echo.
echo Access your app at: http://localhost:3000
echo.
echo Press Ctrl+C to stop the server
echo.

cd backend
npm start
