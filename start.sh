#!/bin/bash
# Safe Bike Ride Planner - Complete Sync and Startup Script
# This script ensures backend, frontend, and database are synced and running

echo "========================================"
echo "Safe Bike Ride Planner - System Sync"
echo "========================================"
echo ""

# Step 1: Check if MongoDB is running
echo "[1/6] Checking MongoDB connection..."
echo ""

if mongosh --eval "db.adminCommand('ping')" --quiet > /dev/null 2>&1; then
    echo "[OK] MongoDB is running"
else
    echo "[WARNING] MongoDB is not running or not installed"
    echo ""
    echo "Please start MongoDB:"
    echo "  - macOS: brew services start mongodb-community"
    echo "  - Linux: sudo systemctl start mongod"
    echo "  - Or use MongoDB Atlas cloud database"
    echo ""
    read -p "Press Enter to continue anyway..."
fi

echo ""

# Step 2: Check if .env file exists
echo "[2/6] Checking environment configuration..."
if [ -f "backend/.env" ]; then
    echo "[OK] Environment file exists"
else
    echo "[ERROR] backend/.env file not found!"
    echo "Creating from .env.example..."
    cp "backend/.env.example" "backend/.env"
    echo ""
    echo "[ACTION REQUIRED] Please edit backend/.env with your API keys"
    echo "Then run this script again."
    read -p "Press Enter to exit..."
    exit 1
fi

echo ""

# Step 3: Check Node modules
echo "[3/6] Checking Node.js dependencies..."
if [ -d "backend/node_modules" ]; then
    echo "[OK] Dependencies installed"
else
    echo "[INFO] Installing dependencies..."
    cd backend
    npm install
    cd ..
    echo "[OK] Dependencies installed successfully"
fi

echo ""

# Step 4: Run diagnostic
echo "[4/6] Running system diagnostic..."
cd backend
node diagnostic.js
cd ..

echo ""

# Step 5: Start the server
echo "[5/6] Starting the server..."
echo ""
echo "========================================"
echo "Server is starting..."
echo "========================================"
echo ""
echo "Access your app at: http://localhost:3000"
echo ""
echo "Press Ctrl+C to stop the server"
echo ""

cd backend
npm start
