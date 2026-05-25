# 🧠 KnowledgeCheck List — CloudHealth Pricebook Studio

This document contains the persistent guidelines, architectural standards, and development checklists that must be read and adhered to before making any changes to the `cpb-ch` codebase.

---

## 💻 1. Core Architecture & Environment

* **Dual-Engine Support**: The application supports both **Tauri** and **Electron** platforms.
  * Webview-specific dependencies must use conditionally guarded imports (e.g. check platform using custom desktop check utilities).
* **Vanilla CSS Layouts**: Avoid Tailwind CSS utilities; structure responsive components using Vanilla CSS/Inline styles inside Framer Motion elements.
* **Corporate Proxy & SSL bypass**:
  * Tauri network requests utilize a customized Rust backend configuration that permits bypasses for strict corporate laptop proxy environments (e.g., handling corporate self-signed SSL interception certs gracefully).

---

## 🔗 2. Web Links & Tauri Security Boundaries

* **No Native Anchors for External Links**: Do **NOT** use raw `<a href="http://...">` tags for external websites. Tauri's webview engine blocks raw external anchor clicks.
* **Route Through Desktop API**:
  * Import and route all external links through the unified `openExternal(url)` utility located in [`src/utils/desktopAPI.js`](file:///Users/sunilgowda/Documents/PetProjects/cpb-ch/src/utils/desktopAPI.js):
    ```javascript
    import { openExternal } from '../utils/desktopAPI';
    
    // Use button handlers instead of anchor tags:
    <button onClick={() => openExternal('https://github.com...')}>
      View Repository
    </button>
    ```
  * Markdown links inside dynamic render sections (e.g. help guides, updater dialogs) must be parsed programmatically to capture clicks and route them via `openExternal`.

---

## 🎨 3. UI, Modals & Stacked Action Bars

* **Dynamic Stacked Confirmation Modals**:
  * Confirm modals with three actions (Confirm, Tertiary, Cancel) must stack buttons vertically using `flex-direction: column-reverse` to prevent text wrapping in narrow dialog layouts.
  * Buttons must automatically stretch to full width (`100%`) for a premium top-down look:
    1. **Primary/Overwrite Button** (Top) — Linear blue-accented gradient.
    2. **Tertiary/Add Button** (Middle) — Subtle background/border secondary focus.
    3. **Cancel Button** (Bottom) — Low-contrast flat text link.
* **No Browser Defaults**: Use custom glassmorphic styling, tailored animations, and Outfit/Inter sans-serif typography instead of native select boxes, standard alert dialogs, or native tooltips.

---

## 🚀 4. Git & Commit Workflow

* **Strict Local Finalization**: **DO NOT** push git commits to remote repositories (GitHub) automatically after every single change. Keep all changes inside the local development environment until the entire set of features has been completely built, verified, and finalized. Pushes to remote repositories must only be executed at the very end when everything is fully complete and approved.

---

## 📦 5. Release & Publishing Checklist (Step-by-Step)

Before pushing release branches or tagging versions, you **must** run through this sequence:

### Step 5a: Pre-Push & Local Verification
- [ ] **Run Linting**: Verify code quality and styling conform to project guidelines:
  ```bash
  npm run lint
  ```
- [ ] **Run Frontend Build**: Verify the Vite bundle parses and builds without warnings or errors:
  ```bash
  npm run build
  ```
- [ ] **Update Release Notes**: Check that [`RELEASE_NOTES.md`](file:///Users/sunilgowda/Documents/PetProjects/cpb-ch/RELEASE_NOTES.md) contains:
  - Concise logs of new features, optimizations, and bug fixes.
  - Correct version numbers matching the release tag (e.g., swapping occurrences of `5.5.0` to the target version).
- [ ] **Update Readme**: Confirm any changes to configs, prerequisites, or installation guides are documented in [`README.md`](file:///Users/sunilgowda/Documents/PetProjects/cpb-ch/README.md).
- [ ] **Verify macOS Installer Packages**: Compile macOS binaries locally to confirm no compilation issues:
  ```bash
  ./build-release.sh
  ```

### Step 5b: Git Flow & Pull Requests
- [ ] **Push the Feature Branch**: Push all modified and generated files (including custom icons) to GitHub:
  ```bash
  git push origin <your-feature-branch>
  ```
- [ ] **Open Pull Request**: File a Pull Request on GitHub from `<your-feature-branch>` targeting `main`.
- [ ] **Monitor Pipeline CI**: Confirm all automated test builds, linting tasks, and safety scans pass cleanly on the PR.
- [ ] **Merge PR**: Once approved and pipeline builds are completely green, merge the branch into `main`.
- [ ] **Sync Local Workspace**: Check out `main` locally and pull the latest changes to ensure a completely clean status:
  ```bash
  git checkout main && git pull origin main
  ```

### Step 5c: GitHub Release Tagging
> [!IMPORTANT]
> **CRITICAL RULE**: Only run the **Create Release** workflow on GitHub Actions when there is a brand-new release version to publish (i.e. when version numbers are being bumped). Do not trigger it for general feature merges or regular patches.

- [ ] **Trigger Create Release Workflow**:
  1. Navigate to your repository's **Actions** tab on GitHub.
  2. Select the **Create Release** workflow.
  3. Click **Run workflow**, choose the `main` branch, and supply the version tag (e.g. `v5.5.0`).
- [ ] **Verify Automated Changelog Stamp**:
  - The workflow will automatically substitute placeholders in `RELEASE_NOTES.md`, stamp the dynamic changelog into `CHANGELOG.md` within a verified commit, and create a GitHub Release draft.
- [ ] **Merge Changelog Back to main**:
  - The workflow pushes this release-tagged commit to a dedicated `release/v5.5.0` branch. Open a quick PR to merge these changelog updates back into `main`.

### Step 5d: macOS Desktop Bundling & Direct Upload
- [ ] **Compile Release Packages**: Build target macOS DMG installers on your local machine:
  ```bash
  ./build-release.sh
  ```
- [ ] **Upload macOS DMG to GitHub Release**:
  - Use the GitHub CLI to upload the fresh ARM64 and Intel installers directly to the release page:
    ```bash
    gh release upload v5.5.0 release/Tauri/CloudHealth.Pricebook.Studio_5.5.0_amd64.dmg release/Tauri/CloudHealth.Pricebook.Studio_5.5.0_arm64.dmg --clobber
    ```

### Step 5e: Windows & Linux Cloud Bundling (Tauri Build Action)
- [ ] **Trigger Tauri Build Workflow**:
  1. Go to your repository's **Actions** tab on GitHub.
  2. Select the **Tauri Build** workflow.
  3. Click **Run workflow** and specify your release tag (e.g., `v5.5.0`).
- [ ] **Wait for Pipeline Completion**:
  - The workflow compiles the portable Windows executable (`.exe`) and Linux packages (`.deb`, `.rpm`, `.AppImage`), automatically attaching them to the release assets.

### Step 5f: Web Application Deployment
- [ ] **Deploy to GitHub Pages**:
  - Deploy the latest static web build securely by running:
    ```bash
    npm run deploy
    ```
    *(Note: This automatically triggers `npm run build` as a pre-deploy action, then pushes only the built `dist/` directory cleanly to the `gh-pages` branch).*
- [ ] **Verify Web App Live**:
  - Confirm the web application is updated and reachable at [https://digitalsuni-cloud.github.io/cpb-ch/](https://digitalsuni-cloud.github.io/cpb-ch/).

### Step 5g: Post-Release Final Audit
- [ ] **Verify Release Page Assets**: Confirm that all **9 essential release assets** are visible and attached to the release page:
  * 🍏 **macOS (2 assets)**: Arm64 DMG, Intel x64 DMG
  * 🪟 **Windows (1 asset)**: Standard portable `.exe` (amd64)
  * 🐧 **Linux (6 assets)**: `.deb`, `.rpm`, `.AppImage` (along with their respective signature `.sig` / `.tar.gz` files)
- [ ] **Verify Download Links**: Click several assets directly from the release interface to verify download links retrieve target files correctly.
