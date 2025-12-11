#!/bin/bash
# Safe Bike Ride Planner - Cleanup Script (Mac/Linux)
# This script removes unnecessary Flutter-related files

echo "========================================"
echo "Safe Bike Ride Planner - Cleanup Script"
echo "========================================"
echo ""
echo "This will remove all Flutter-related files and directories."
echo "The Node.js web application will NOT be affected."
echo ""
read -p "Press Enter to continue or Ctrl+C to cancel..."

echo ""
echo "Starting cleanup..."
echo ""

# Delete Flutter directories
if [ -d ".dart_tool" ]; then
    echo "Removing .dart_tool..."
    rm -rf .dart_tool
fi

if [ -d "android" ]; then
    echo "Removing android..."
    rm -rf android
fi

if [ -d "ios" ]; then
    echo "Removing ios..."
    rm -rf ios
fi

if [ -d "linux" ]; then
    echo "Removing linux..."
    rm -rf linux
fi

if [ -d "macos" ]; then
    echo "Removing macos..."
    rm -rf macos
fi

if [ -d "windows" ]; then
    echo "Removing windows..."
    rm -rf windows
fi

if [ -d "build" ]; then
    echo "Removing build..."
    rm -rf build
fi

if [ -d "lib" ]; then
    echo "Removing lib..."
    rm -rf lib
fi

if [ -d "test" ]; then
    echo "Removing test..."
    rm -rf test
fi

if [ -d "web" ]; then
    echo "Removing web..."
    rm -rf web
fi

if [ -d ".idea" ]; then
    echo "Removing .idea..."
    rm -rf .idea
fi

# Delete Flutter files
if [ -f ".flutter-plugins-dependencies" ]; then
    echo "Removing .flutter-plugins-dependencies..."
    rm -f .flutter-plugins-dependencies
fi

if [ -f ".metadata" ]; then
    echo "Removing .metadata..."
    rm -f .metadata
fi

if [ -f "analysis_options.yaml" ]; then
    echo "Removing analysis_options.yaml..."
    rm -f analysis_options.yaml
fi

if [ -f "pubspec.lock" ]; then
    echo "Removing pubspec.lock..."
    rm -f pubspec.lock
fi

if [ -f "pubspec.yaml" ]; then
    echo "Removing pubspec.yaml..."
    rm -f pubspec.yaml
fi

if [ -f "safe_bike_ride_planner.iml" ]; then
    echo "Removing safe_bike_ride_planner.iml..."
    rm -f safe_bike_ride_planner.iml
fi

echo ""
echo "========================================"
echo "Cleanup completed successfully!"
echo "========================================"
echo ""
echo "Remaining files:"
ls -la
echo ""
echo "You can now use the Node.js web application normally."
echo "Run: cd backend && npm start"
echo ""
