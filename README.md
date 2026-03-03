# CloudHealth Custom Price Book Management Studio

A professional, visual interface for building, managing, and securely deploying Custom Price Books to CloudHealth. 

---

## 📥 Standalone Management Studio (Recommended)

Running the studio as a standalone application is the **fastest and most secure way** to manage your price books. The desktop apps are optimized to securely communicate with the CloudHealth API directly from your machine—bypassing all browser CORS (Cross-Origin Resource Sharing) restrictions and removing the need for local proxy servers.

**[Download the Latest Release (Mac, Windows, Linux) 🚀](https://github.com/digitalsuni-cloud/cpb-ch/releases/latest)**

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
   # Build for current OS
   npm run electron:build
   ```
