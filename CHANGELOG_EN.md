# Changelog (English)

English release notes. Only versions with English notes are listed here (starting from v1.7.0).

---

## v1.7.0 (2026-10-31)

### 🆕 New · Custom Data Directory

- New "Data Directory" setting: place the vault in OneDrive / Nutstore / a NAS sync folder to sync your encrypted vault across devices
- Optionally migrate existing vault data when changing the directory; migration is refused if the target already contains vault.enc (prevents overwrite)
- One-click reset to the system default directory

### 🆕 New · In-App Updates (Windows / macOS)

- New "Software Update" section in Settings: check for updates, view release notes, download, install, and relaunch automatically
- Update packages are verified with minisign signatures to prevent tampering
- Linux continues to update via AppImageUpdate (the .zsync metadata ships with each release)

### ✨ Improved · Multilingual Browser Extension Template

- Generated browser extension packages (manifest / popup UI / install guide) now follow the app's interface language (Chinese or English)

### ✨ Improved · Bilingual Release Notes

- Every release note now includes both Chinese and English sections (English available from v1.7.0)

### ✨ Improved · Localized Backend Errors

- The Rust backend now returns structured error codes, and the UI displays error messages in the current language

---
