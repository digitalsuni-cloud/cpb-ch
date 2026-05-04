@echo off
setlocal enabledelayedexpansion

echo 🚀 Starting standardized build process for Windows...

:: 1. Install and fix dependencies
echo 📦 Installing dependencies...
call npm install
call npm audit fix --force

:: 2. Build Tauri App
echo 🏗️ Building Tauri application...
call npm run tauri build -- --no-bundle

:: 3. Prepare release directory
echo 📂 Preparing release directory...
if not exist release mkdir release

:: 4. Extract version and handle artifacts
for /f "tokens=*" %%a in ('node -p "require('./package.json').version"') do set VERSION=%%a
echo 📌 Version detected: %VERSION%

:: Standardized Name for Windows Portable
set NEW_NAME=CloudHealth.Pricebook.Studio_%VERSION%_amd64.exe

if exist "src-tauri\target\release\CloudHealth.Pricebook.Studio.exe" (
    echo ✅ Copying CloudHealth.Pricebook.Studio.exe -^> release\%NEW_NAME%
    copy "src-tauri\target\release\CloudHealth.Pricebook.Studio.exe" "release\%NEW_NAME%" /Y
) else if exist "src-tauri\target\release\app.exe" (
    echo ✅ Copying app.exe -^> release\%NEW_NAME%
    copy "src-tauri\target\release\app.exe" "release\%NEW_NAME%" /Y
)

echo 🎉 Build complete! Check the 'release' folder.
dir release
pause
