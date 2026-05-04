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

:: Use PowerShell to robustly find the .exe and copy it
echo 🔍 Searching for CloudHealth.Pricebook.Studio.exe...
powershell -Command "$exe = Get-ChildItem -Path src-tauri\target -Filter 'CloudHealth.Pricebook.Studio.exe' -Recurse | Select-Object -First 1; if ($exe) { $newName = 'CloudHealth.Pricebook.Studio_%VERSION%_amd64.exe'; echo \"✅ Found $exe. Moving to release\$newName\"; Copy-Item $exe.FullName 'release\$newName' -Force } else { echo '❌ Could not find the executable!'; exit 1 }"

echo 🎉 Build complete! Check the 'release' folder.
dir release
pause
