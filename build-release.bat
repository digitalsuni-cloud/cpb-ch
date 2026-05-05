@echo off
setlocal enabledelayedexpansion
:: Set code page to UTF-8 to support emojis in the terminal
chcp 65001 > nul

echo 🚀 Starting standardized build process for Windows...

:: 1. Install and fix dependencies
echo 📦 Installing dependencies...
call npm install

:: 2. Build Tauri App
echo 🏗️ Building Tauri application...
:: Force a fresh build to ensure productName is picked up
call npm run tauri build -- --no-bundle

:: 3. Prepare release directory
echo 📂 Preparing release directory...
if not exist release\Tauri mkdir release\Tauri

:: 4. Extract version and handle artifacts
for /f "tokens=*" %%a in ('node -p "require('./package.json').version"') do set VERSION=%%a
echo 📌 Version detected: %VERSION%

:: Use PowerShell with properly escaped variables
echo 🔍 Searching for executables in src-tauri\target...
powershell -Command "$exe = Get-ChildItem -Path src-tauri\target -Filter '*.exe' -Recurse | Where-Object { $_.Name -notlike 'tauri*' -and $_.Name -notlike 'cargo*' } | Select-Object -First 1; if ($exe) { $newName = 'CloudHealth.Pricebook.Studio_%VERSION%_amd64.exe'; Write-Host \"✅ Found binary: $($exe.Name). Moving to release\Tauri\$newName\"; Move-Item $exe.FullName \"release\Tauri\$newName\" -Force } else { Write-Host '❌ Could not find any application executable!'; exit 1 }"

:: Cleanup any non-standard files in the release folder
powershell -Command "Get-ChildItem -Path release\Tauri -File | Where-Object { $_.Name -notlike 'CloudHealth.Pricebook.Studio_*' } | Remove-Item -Force"

echo 🎉 Build complete! Check the 'release\Tauri' folder.
dir release\Tauri
pause
