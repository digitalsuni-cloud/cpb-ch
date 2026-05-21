This major release marks our official transition from Electron to **Tauri**, providing a much faster, lighter, and more secure desktop experience. It combines all the new features from v4.4 through v5.5, introducing the **Advanced Rule Conflict Detector**, **Template Library**, powerful **Rollback and Restore** capabilities, and new **Export Options**.

### 🛡️ Advanced Rule Conflict Detector (New!)
Introduces a comprehensive, real-time logic engine that scans your Pricebooks for errors and warnings before export:
- **Chronological Date Range Check**: Flags any rule group where the start date occurs after the end date.
- **Within-Group Sequential Shadowing**: Warns if a broader rule shadows and makes a more specific rule unreachable.
- **Redundant Product Filters**: Identifies identical product configurations to prevent XML bloat.
- **Billing Coverage Gaps**: Detects gaps of 1 or more days between group timelines where retail list pricing will apply.
- **Adjustment Sanity & 100% Discount Guardrail**: Numeric safety checks warning against negative discounts/rates, oversized fixed charges, and specifically flags `100%` discounts which zero out matching line items across both credits and charges.
- **Interactive Conflict Drawer**: Features visual severity badges and a **"↗ Scroll to Group"** shortcut that scrolls the builder directly to the affected group.

### 🔄 Rollback and Restore 
- **Action History Rollback**: Easily rollback and restore Pricebook state configurations directly from the Action History log.
- **Assignment Restoration**: Automatically restores customer assignments for unassigned events during a rollback.

### 📊 Advanced Export & Diff Tools
- **Pricebook Spec Diff Viewer**: Intuitive side-by-side breakdown of XML specification changes.
- **CSV & PDF Exports**: Export Pricebook Rules in CSV format or generate high-quality PDF summary reports.

### 📚 Expanded Template Library
Added several "out-of-the-box" templates for faster pricebook creation:
- **Remove Private & EDP Discounts**: Zeros out Private Rate and Enterprise Discount Program items.
- **CloudWatch List Pricing**: Adjusts data storage and log processing to standard on-demand rates.
- **CloudFront HTTP/S List Pricing**: Standardized request pricing for major global regions.
- **S3 Custom Tier Pricing**: Pre-negotiated rates across multiple storage tiers.

### ⚙️ Maintenance, Portability & UX
- **Enhanced Data Portability**: Import/Export for both Action History and the *Your Templates* library.
- **Smart Template Logic**: Integrated collision detection and metadata preservation for template merges.
- **General Improvements**: Resolved UI inconsistencies and patched performance bugs.

---
## File Details

| Architecture | Platform | File to Download |
| :--- | :--- | :--- |
| ![macOS](https://raw.githubusercontent.com/digitalsuni-cloud/cpb-ch/main/public/badges/macos.svg) | Apple Silicon | [CloudHealth.Pricebook.Studio_5.5.0_arm64.dmg](https://github.com/digitalsuni-cloud/cpb-ch/releases/download/v5.5.0/CloudHealth.Pricebook.Studio_5.5.0_arm64.dmg) |
| ![macOS](https://raw.githubusercontent.com/digitalsuni-cloud/cpb-ch/main/public/badges/macos.svg) | Intel | [CloudHealth.Pricebook.Studio_5.5.0_amd64.dmg](https://github.com/digitalsuni-cloud/cpb-ch/releases/download/v5.5.0/CloudHealth.Pricebook.Studio_5.5.0_amd64.dmg) |
| ![Windows](https://raw.githubusercontent.com/digitalsuni-cloud/cpb-ch/main/public/badges/windows.svg) | Universal / Portable | [CloudHealth.Pricebook.Studio_5.5.0_amd64.exe](https://github.com/digitalsuni-cloud/cpb-ch/releases/download/v5.5.0/CloudHealth.Pricebook.Studio_5.5.0_amd64.exe) |
| ![Linux Deb](https://raw.githubusercontent.com/digitalsuni-cloud/cpb-ch/main/public/badges/linux-deb.svg) | x64 (Deb) | [CloudHealth.Pricebook.Studio_5.5.0_amd64.deb](https://github.com/digitalsuni-cloud/cpb-ch/releases/download/v5.5.0/CloudHealth.Pricebook.Studio_5.5.0_amd64.deb) |
| ![Linux App](https://raw.githubusercontent.com/digitalsuni-cloud/cpb-ch/main/public/badges/linux-app.svg) | x64 (AppImage) | [CloudHealth.Pricebook.Studio_5.5.0_amd64.AppImage](https://github.com/digitalsuni-cloud/cpb-ch/releases/download/v5.5.0/CloudHealth.Pricebook.Studio_5.5.0_amd64.AppImage) |
| ![Linux RPM](https://raw.githubusercontent.com/digitalsuni-cloud/cpb-ch/main/public/badges/linux-rpm.svg) | x64 (RPM) | [CloudHealth.Pricebook.Studio_5.5.0_amd64.rpm](https://github.com/digitalsuni-cloud/cpb-ch/releases/download/v5.5.0/CloudHealth.Pricebook.Studio_5.5.0_amd64.rpm) |
| ![Linux Deb](https://raw.githubusercontent.com/digitalsuni-cloud/cpb-ch/main/public/badges/linux-deb.svg) | ARM64 (Deb) | [CloudHealth.Pricebook.Studio_5.5.0_arm64.deb](https://github.com/digitalsuni-cloud/cpb-ch/releases/download/v5.5.0/CloudHealth.Pricebook.Studio_5.5.0_arm64.deb) |
| ![Linux App](https://raw.githubusercontent.com/digitalsuni-cloud/cpb-ch/main/public/badges/linux-app.svg) | ARM64 (AppImage) | [CloudHealth.Pricebook.Studio_5.5.0_arm64.AppImage](https://github.com/digitalsuni-cloud/cpb-ch/releases/download/v5.5.0/CloudHealth.Pricebook.Studio_5.5.0_arm64.AppImage) |
| ![Linux RPM](https://raw.githubusercontent.com/digitalsuni-cloud/cpb-ch/main/public/badges/linux-rpm.svg) | ARM64 (RPM) | [CloudHealth.Pricebook.Studio_5.5.0_arm64.rpm](https://github.com/digitalsuni-cloud/cpb-ch/releases/download/v5.5.0/CloudHealth.Pricebook.Studio_5.5.0_arm64.rpm) |

> **Note for macOS Users:**
> Because this is an internal application, it is not code-signed via the Apple Developer program. To run it for the first time, you must remove the quarantine attribute. Open your Terminal and run:
> ```bash
> xattr -rd com.apple.quarantine "/Applications/CloudHealth Pricebook Studio.app"
> ```
