@echo off
REM Safe Bike Ride Planner - Cleanup Script (Windows)
REM This script removes unnecessary Flutter-related files

echo ========================================
echo Safe Bike Ride Planner - Cleanup Script
echo ========================================
echo.
echo This will remove all Flutter-related files and directories.
echo The Node.js web application will NOT be affected.
echo.
pause

echo.
echo Starting cleanup...
echo.

REM Delete Flutter directories
if exist ".dart_tool" (
    echo Removing .dart_tool...
    rmdir /s /q ".dart_tool"
)

if exist "android" (
    echo Removing android...
    rmdir /s /q "android"
)

if exist "ios" (
    echo Removing ios...
    rmdir /s /q "ios"
)

if exist "linux" (
    echo Removing linux...
    rmdir /s /q "linux"
)

if exist "macos" (
    echo Removing macos...
    rmdir /s /q "macos"
)

if exist "windows" (
    echo Removing windows...
    rmdir /s /q "windows"
)

if exist "build" (
    echo Removing build...
    rmdir /s /q "build"
)

if exist "lib" (
    echo Removing lib...
    rmdir /s /q "lib"
)

if exist "test" (
    echo Removing test...
    rmdir /s /q "test"
)

if exist "web" (
    echo Removing web...
    rmdir /s /q "web"
)

if exist ".idea" (
    echo Removing .idea...
    rmdir /s /q ".idea"
)

REM Delete Flutter files
if exist ".flutter-plugins-dependencies" (
    echo Removing .flutter-plugins-dependencies...
    del /f /q ".flutter-plugins-dependencies"
)

if exist ".metadata" (
    echo Removing .metadata...
    del /f /q ".metadata"
)

if exist "analysis_options.yaml" (
    echo Removing analysis_options.yaml...
    del /f /q "analysis_options.yaml"
)

if exist "pubspec.lock" (
    echo Removing pubspec.lock...
    del /f /q "pubspec.lock"
)

if exist "pubspec.yaml" (
    echo Removing pubspec.yaml...
    del /f /q "pubspec.yaml"
)

if exist "safe_bike_ride_planner.iml" (
    echo Removing safe_bike_ride_planner.iml...
    del /f /q "safe_bike_ride_planner.iml"
)

echo.
echo ========================================
echo Cleanup completed successfully!
echo ========================================
echo.
echo Remaining files:
dir /b
echo.
echo You can now use the Node.js web application normally.
echo Run: cd backend ^&^& npm start
echo.
pause
