#!/bin/bash

# Standardized Build and Release Script for Linux/macOS
echo "🚀 Starting standardized build process..."

# 1. Install and fix dependencies
echo "📦 Installing dependencies..."
npm install
npm audit fix --force

# 2. Build Tauri App
echo "🏗️ Building Tauri application..."
npm run tauri build

# 3. Prepare release directory
echo "📂 Preparing release directory..."
mkdir -p release

# 4. Extract version and handle artifacts
VERSION=$(node -p "require('./package.json').version")
echo "📌 Version detected: $VERSION"

# Find all bundles (deb, rpm, AppImage, dmg)
# We search in target/release/bundle AND target/TARGET/release/bundle for cross-builds
TARGET_DIRS=$(find src-tauri/target -type d -name "bundle" | grep "/release/")

for dir in $TARGET_DIRS; do
  find "$dir" -type f \( -name "*.deb" -o -name "*.rpm" -o -name "*.AppImage" -o -name "*.dmg" \) | while read f; do
    EXT="${f##*.}"
    BASE=$(basename "$f")
    
    # Determine Architecture
    ARCH="unknown"
    if [[ "$f" == *"x86_64"* ]] || [[ "$f" == *"amd64"* ]] || [[ "$f" == *"x64"* ]]; then
      ARCH="amd64"
    elif [[ "$f" == *"aarch64"* ]] || [[ "$f" == *"arm64"* ]]; then
      ARCH="arm64"
    fi
    
    # Standardized Name: CloudHealth.Pricebook.Studio_VERSION_ARCH.EXT
    NEW_NAME="CloudHealth.Pricebook.Studio_${VERSION}_${ARCH}.${EXT}"
    
    echo "✅ Moving $BASE -> release/$NEW_NAME"
    cp "$f" "release/$NEW_NAME"
  done
done

echo "🎉 Build complete! Check the 'release/' folder."
ls -lh release/
