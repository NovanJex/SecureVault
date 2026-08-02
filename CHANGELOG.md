# Changelog

All notable changes to this project will be documented in this file.

---

## v1.1.0 (2026-08-02)

### 🧩 Browser Extension Hub

- Sidebar entry to generate Manifest V3 browser extension ZIP with one click
- Embedded encrypted vault backup with dual KDF support (Argon2id via inline WASM + PBKDF2 via Web Crypto)
- Extension features: domain matching, one-click autofill, 15-minute memory auto-lock
- Online simulator: real-time preview of extension popup matching logic
- Multi-browser installation guides (Chrome/Edge/Firefox/Safari/Kiwi)
- Incremental sync: copy encrypted payload from desktop → paste in extension without re-packaging

### 🔧 Fixes

- Windows portable zip structure: exe inside `SecureVault/` folder with versioned name
- Portable zip/exe naming: removed `v` prefix to match Tauri bundler convention
- Backup export `version` field now auto-follows `tauri.conf.json` app version
- `tsconfig.json` excludes `src-tauri/` build artifacts

### 🔨 Improvements

- Backup JSON now includes `kdf` field for KDF identification
- Extension popup light theme, consistent with desktop LockScreen
- Browser Extension Hub layout compacted to fit default window without scrolling
- Extension popup spacing refinement, search debounce fix, non-standard domain filtering

---

## v1.0.0 (2026-07-23)

## v1.0.0 (2026-07-23)

### 🎉 Initial Release

- **Vault Core** — Login / Card / Note / Identity credential management
- **Dual KDF** — Argon2id (64MB) & PBKDF2-SHA256 (100K iter)
- **AES-256-GCM** — Authenticated encryption with random nonce
- **Atomic File I/O** — Write-to-temp + rename for data safety
- **SHA-256 Checksum** — Backup integrity verification
- **Security Audit** — Weak password detection, reuse collision, compromised matching
- **Password Generator** — Random mode + BIP39 passphrase (2048 words)
- **Encrypted Backup** — Export/import with auto-decrypt
- **Auto-Lock** — Configurable idle timeout with memory wipe
- **Clipboard Protection** — Auto-clear after copy
- **Startup Splash** — Smooth animated transition to lock screen
- **Password Visibility Toggle** — Custom Eye button on all password fields
- **Custom Folder Dropdown** — Replaces native select with styled dropdown
- **Cross-Platform** — Windows, macOS, Linux via Tauri v2
- **CI/CD** — GitHub Actions auto-build on version tags
