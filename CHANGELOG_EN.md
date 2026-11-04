# Changelog (English)

English release notes. Only versions with English notes are listed here (starting from v1.7.0).

---

## v1.7.1 (2026-11-04)

### 🆕 New

**In-app Update Dialog**
- A dedicated update dialog appears when a new version is found, rendering Markdown release notes with a download progress bar and automatic install & relaunch
- Includes a shortcut to the GitHub release page

**"Up to Date" Dialog**
- Checking for updates with no new version now shows a dedicated result dialog instead of inline card text

### ✨ Improved

**Update Notifications**
- The app silently checks for updates right after launch (24h throttle, failures are silent)
- A red NEW badge on the sidebar settings entry, cleared only after actually upgrading
- The "Check for Updates" button turns into "New version vX" and opens the update dialog

**Leaner Release Assets**
- Each release now ships 10 assets (redundant signature files and duplicate artifacts removed)

**README Screenshots**
- Added four preview screenshots: main UI, in-app update, settings, security audit

---

## v1.7.0 (2026-10-31)

### 🆕 New

**Custom Data Directory**
- New "Data Directory" setting: place the vault in OneDrive / Nutstore / a NAS sync folder to sync your encrypted vault across devices
- Optionally migrate existing vault data when changing the directory; migration is refused if the target already contains vault.enc (prevents overwrite)
- One-click reset to the system default directory

**In-App Updates (Windows / macOS)**
- New "Software Update" section in Settings: check for updates, view release notes, download, install, and relaunch automatically
- Update packages are verified with minisign signatures to prevent tampering
- Linux continues to update via AppImageUpdate (the .zsync metadata ships with each release)

### ✨ Improved

**Multilingual Browser Extension Template**
- Generated browser extension packages (manifest / popup UI / install guide) now follow the app's interface language (Chinese or English)

**Bilingual Release Notes**
- Every release note now includes both Chinese and English sections (English available from v1.7.0)

**Localized Backend Errors**
- The Rust backend now returns structured error codes, and the UI displays error messages in the current language

---
