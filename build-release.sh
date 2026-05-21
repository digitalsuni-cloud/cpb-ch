#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# CloudHealth Pricebook Studio — Release Build Script
# Usage: ./build-release.sh
#
# What it does:
#   1. Reads the current version from package.json
#   2. Archives any existing .dmg / .app in release/ → release/archive/<version>/
#   3. Runs the Tauri production build
#   4. Copies the new .dmg and .app into release/
# ─────────────────────────────────────────────────────────────────────────────

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
RELEASE_DIR="$SCRIPT_DIR/release/Tauri"
ARCHIVE_DIR="$SCRIPT_DIR/release/archive"
BUNDLE_BASE_ARM="$SCRIPT_DIR/src-tauri/target/aarch64-apple-darwin/release/bundle"
BUNDLE_BASE_INTEL="$SCRIPT_DIR/src-tauri/target/x86_64-apple-darwin/release/bundle"

# ── 1. Read version from package.json ────────────────────────────────────────
VERSION=$(node -p "require('./package.json').version")
echo ""
echo "╔══════════════════════════════════════════════════════╗"
echo "║   CloudHealth Pricebook Studio · Release Build v$VERSION ║"
echo "╚══════════════════════════════════════════════════════╝"
echo ""

# ── 2. Archive any existing release packages ──────────────────────────────────
shopt -s nullglob
EXISTING_DMGS=("$RELEASE_DIR"/*.dmg)
EXISTING_APPS=("$RELEASE_DIR"/*.app)

HAS_EXISTING=false
for f in "${EXISTING_DMGS[@]}" "${EXISTING_APPS[@]}"; do
  [ -e "$f" ] && HAS_EXISTING=true && break
done

if [ "$HAS_EXISTING" = true ]; then
  # Detect the version from the existing DMG filename to name the archive folder
  EXISTING_VERSION=$(basename "${EXISTING_DMGS[0]:-}" 2>/dev/null | sed -E 's/.*_([0-9]+\.[0-9]+\.[0-9]+)_.*/\1/' || echo "")
  [ -z "$EXISTING_VERSION" ] && EXISTING_VERSION="previous"
  ARCHIVE_TARGET="$ARCHIVE_DIR/${EXISTING_VERSION:-previous}"
  mkdir -p "$ARCHIVE_TARGET"
  echo "→ Archiving existing v${EXISTING_VERSION:-previous} packages to release/archive/${EXISTING_VERSION:-previous}/"
  for f in "$RELEASE_DIR"/*.dmg "$RELEASE_DIR"/*.app; do
    if [ -e "$f" ]; then
      B=$(basename "$f")
      # Use timestamp if archiving the same version multiple times to avoid conflicts
      TS=$(date +%Y%m%d_%H%M%S)
      DEST_DIR="$ARCHIVE_TARGET/$TS"
      mkdir -p "$DEST_DIR"
      mv -f "$f" "$DEST_DIR/"
    fi
  done
  echo "  Done."
else
  echo "→ No existing packages in release/ to archive."
fi

echo ""

# ── 3. Run the Tauri build ────────────────────────────────────────────────────
OS_TYPE="$(uname -s)"
echo "→ Detected OS: $OS_TYPE"

# ── 3a. Check Dependencies ────────────────────────────────────────────────────
if [ ! -d "node_modules" ]; then
  echo "→ node_modules missing. Running npm install..."
  npm install
fi

if [ "$OS_TYPE" == "Linux" ]; then
  # Check for common tauri dependencies on Linux (using 4.1 for newer Ubuntu versions)
  if ! dpkg -s libwebkit2gtk-4.1-dev >/dev/null 2>&1; then
    echo "⚠  Linux dependencies (libwebkit2gtk-4.1-dev, etc.) appear to be missing."
    echo "→ Attempting to install system dependencies (requires sudo)..."
    sudo apt update && sudo apt install -y libwebkit2gtk-4.1-dev libappindicator3-dev librsvg2-dev patchelf build-essential curl wget file libssl-dev libgtk-3-dev libayatana-appindicator3-dev rpm
  fi
fi

if [ "$OS_TYPE" == "Darwin" ]; then
  echo "→ Adding Mac Rust targets if missing..."
  rustup target add aarch64-apple-darwin x86_64-apple-darwin || true

  echo "→ Building v$VERSION (macOS)…"
  cd "$SCRIPT_DIR"

  echo "→ Building for Apple Silicon (arm64)..."
  npm run tauri build -- --target aarch64-apple-darwin

  echo "→ Building for Intel (amd64)..."
  npm run tauri build -- --target x86_64-apple-darwin

  echo ""

  # ── 4. Copy new packages to release/Tauri/ ─────────────────────────────────────────
  mkdir -p "$RELEASE_DIR"

  # ARM64
  DMG_SRC_ARM="$BUNDLE_BASE_ARM/dmg/CloudHealth Pricebook Studio_${VERSION}_aarch64.dmg"
  if [ -f "$DMG_SRC_ARM" ]; then
    cp -f "$DMG_SRC_ARM" "$RELEASE_DIR/CloudHealth.Pricebook.Studio_${VERSION}_arm64.dmg"
    echo "→ Copied: release/Tauri/CloudHealth.Pricebook.Studio_${VERSION}_arm64.dmg"
  fi

  # AMD64
  shopt -s nullglob
  for intel_dmg in "$BUNDLE_BASE_INTEL/dmg/CloudHealth Pricebook Studio_${VERSION}_"*.dmg; do
    if [ -f "$intel_dmg" ]; then
      cp -f "$intel_dmg" "$RELEASE_DIR/CloudHealth.Pricebook.Studio_${VERSION}_amd64.dmg"
      echo "→ Copied: release/Tauri/CloudHealth.Pricebook.Studio_${VERSION}_amd64.dmg"
      break
    fi
  done
  shopt -u nullglob

elif [ "$OS_TYPE" == "Linux" ]; then
  echo "→ Building v$VERSION (Linux)…"
  cd "$SCRIPT_DIR"
  
  # Check for native architecture
  ARCH="$(uname -m)"
  echo "→ Building for Linux ($ARCH)..."
  npm run tauri build

  # Copy Linux artifacts
  mkdir -p "$RELEASE_DIR"
  
  # Locate .AppImage, .deb, or .rpm
  APPIMAGE_PATH="$SCRIPT_DIR/src-tauri/target/release/bundle/appimage"
  DEB_PATH="$SCRIPT_DIR/src-tauri/target/release/bundle/deb"
  RPM_PATH="$SCRIPT_DIR/src-tauri/target/release/bundle/rpm"
  
  shopt -s nullglob
  # Standardize Linux names: Dots instead of spaces, consistent arch suffixes
  for f in "$APPIMAGE_PATH"/*.AppImage "$DEB_PATH"/*.deb "$RPM_PATH"/*.rpm; do
    if [ -f "$f" ]; then
      EXT="${f##*.}"
      # Map aarch64 -> arm64, x86_64 -> amd64
      NEW_ARCH="$ARCH"
      [[ "$ARCH" == "aarch64" ]] && NEW_ARCH="arm64"
      [[ "$ARCH" == "x86_64" ]] && NEW_ARCH="amd64"
      
      NEW_NAME="CloudHealth.Pricebook.Studio_${VERSION}_${NEW_ARCH}.${EXT}"

      cp -f "$f" "$RELEASE_DIR/$NEW_NAME"
      echo "→ Copied: $RELEASE_DIR/$NEW_NAME"
    fi
  done
  shopt -u nullglob
else
  echo "⚠  Unsupported OS for release script: $OS_TYPE"
  exit 1
fi

echo ""
echo "✓ Release v$VERSION is ready in: release/"
echo ""
ls -lh "$RELEASE_DIR"/* 2>/dev/null || true
echo ""
