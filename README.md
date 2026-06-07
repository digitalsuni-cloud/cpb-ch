# CloudHealth Custom Price Book Management Studio

A professional, visual interface for building, managing, and securely deploying Custom Price Books to CloudHealth. 

---

## 📥 Standalone Management Studio (Recommended)

Running the studio as a standalone application is the **fastest and most secure way** to manage your price books. The desktop apps are optimized to securely communicate with the CloudHealth API directly from your machine—bypassing all browser CORS (Cross-Origin Resource Sharing) restrictions and removing the need for local proxy servers.

**[Download the Latest Release (Mac, Windows, Linux) 🚀](https://digitalsuni-cloud.github.io/cpb-ch/release.html)**

*   **macOS**: Universal DMG (supports both Intel and Apple Silicon/M-series)
*   **Windows**: Portable executable (no installation required)
*   **Linux**: AppImage and Debian packages available

---

## 🌐 Web Preview
You can preview the interface directly in your browser:  
[https://digitalsuni-cloud.github.io/cpb-ch/](https://digitalsuni-cloud.github.io/cpb-ch/)

> **Note:** The web version is for preview and building only. To **import** or **deploy** directly to CloudHealth, please use the Standalone App to avoid browser security restrictions.

---

## ✨ Core Features
- 🏗️ **Visual Rule Builder**: Drag, drop, and construct complex tiering logic without touching XML.
- 🛡️ **Advanced Conflict Detector**: Real-time validation scans for chronological dates, sequential rule shadowing, redundant product filters, timeline coverage gaps, and adjustment sanity.
- 📂 **Price Book Directory**: A live dashboard of all price books currently assigned to your tenant.
- 📜 **Action History**: A detailed audit log of every assignment, deletion, and update performed locally.
- ☁️ **Direct Sync**: Pull specifications directly from CloudHealth, modify them, and push patches in seconds.
- ⚡ **CORS-Free Engine**: Natively handles secure API handshakes without external dependencies.
- 📝 **Natural Language Summary**: Automatically translates complex XML logic into human-readable English for verification.

---

## 🛠️ For Developers (Local Build)

If you want to contribute or build from source:

1. **Clone the Repository**
   ```bash
   git clone https://github.com/digitalsuni-cloud/cpb-ch.git
   cd cpb-ch/cpb-react
   ```

2. **Install & Run**
   ```bash
   npm install
   npm run dev
   ```

3. **Build Standalone**
   ```bash
   # Build for current OS using Tauri
   npm run tauri build

   # Or run the standardized release builder
   ./build-release.sh
   ```

---

## 🚀 Release Checklist (Before Pushing/Publishing)

To maintain high-quality releases, follow this checklist sequentially before and during a release:

1. **Verify Local Builds**: Run `./build-release.sh` (for Mac) or local build scripts on target platforms to ensure compile-time checks and packages generate successfully.
2. **Update Release Notes**: Review and revise `RELEASE_NOTES.md` with:
   - Latest feature explanations, bug patches, and UX adjustments.
   - Updated file download list and architectural tables matching the exact version release tag (e.g., swapping `5.5.0` to the new version).
3. **Keep `README.md` Current**: Ensure all feature summaries, setup steps, and local build details match any new capabilities or CLI commands.
4. **Trigger Release Action**:
   - **CRITICAL**: Only run the **Create Release** workflow on GitHub when there is a brand-new release version to publish (i.e. when version numbers are being bumped). Do not trigger it for general feature merges or patches within the same release.
   - The action will automatically read the updated `RELEASE_NOTES.md`, substitute dynamic version placeholders, stamp `CHANGELOG.md` inside the release commit, and create the tagged draft release.
5. **Publish Platform Assets**:
   - **CRITICAL**: Go to GitHub Actions and manually trigger the **Tauri Build** workflow, supplying the release tag (e.g., `v5.5.0`), to compile and upload Windows and Linux release assets.
   - Upload macOS installer binaries to the latest release page (e.g., via `gh release upload`).

---

### 📦 Post-Push & Publishing Workflow (After Code Push)

Once your code modifications have been pushed to GitHub, complete the following pipeline steps to finalize the deployment:

1. **Submit a Pull Request**: 
   - Since `main` is protected from direct pushes, open a Pull Request from your feature branch (e.g., `feat/rule-conflict-detector`) to `main`.
2. **Review Automated Checks**: 
   - Verify that all automated pre-merge pipelines and test builds pass cleanly on the Pull Request.
3. **Merge Pull Request**: 
   - Merge the PR into the `main` branch once all checks are green.
4. **Trigger Release Action**:
   - **CRITICAL**: Run the **Create Release** workflow in GitHub Actions (selecting the `main` branch and providing the target version, e.g., `v5.5.0`) **only when a new release version is being introduced**.
   - If executed on `main`, the stamped `CHANGELOG.md` will be pushed to a dedicated `release/v5.5.0` branch. Open a quick PR to merge this changelog update back into `main`.
5. **Sync macOS Desktop Assets**:
   - Build macOS binaries locally using `./build-release.sh`.
   - Upload the compiled dmg installers directly to the release page using the GitHub CLI:
     ```bash
     gh release upload v5.5.0 release/Tauri/CloudHealth.Pricebook.Studio_5.5.0_amd64.dmg release/Tauri/CloudHealth.Pricebook.Studio_5.5.0_arm64.dmg --clobber
     ```
6. **Trigger Cloud Tauri Builds (Windows & Linux)**:
   - Go to GitHub Actions, manually trigger the **Tauri Build** workflow, and supply the release tag (`v5.5.0`). 
   - The workflow will automatically compile the portable Windows executable and Linux packages (`.deb`, `.rpm`, `.AppImage`) and attach them to the release assets.
7. **Verify Web Deployment**:
   - Deploy the latest build to GitHub Pages by running:
     ```bash
     npm run deploy
     ```
   - This automatically runs `npm run build` (via `predeploy`) then pushes only the `dist/` folder cleanly to the `gh-pages` branch.
   - Verify that the updated web app is live at [https://digitalsuni-cloud.github.io/cpb-ch/](https://digitalsuni-cloud.github.io/cpb-ch/).
8. **Conduct Release Audit**:
   - Double-check the **Latest Release** page to ensure all 9 assets (Mac DMG, Windows EXE, and Linux binaries/signatures) are attached and that all download links work correctly.
