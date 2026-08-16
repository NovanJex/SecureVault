# Changelog

All notable changes to this project will be documented in this file.

---

## v1.4.1 (2026-08-14)

### 🔨 Improvements

- Sidebar「按模板过滤」spacing aligned with「常用视角」and「自定义文件夹」(uniform padding, direct icon display)

### 🔧 Fixes

- CI: macOS artifact path for `--target` build (triple subdirectory detection), missing GH_TOKEN, codesign path
- CI: remove duplicate raw release assets, keep renamed versions only (deb/rpm/app.tar.gz preserved)
- README: restore accidentally removed v1.3.1 row in version history

---

## v1.4.0 (2026-08-12)

### 🆕 KeePass KDBX 互操作

- **导出 KeePass (.kdbx)** — 一键将保险箱导出为 KeePass 标准数据库（KDBX4 + Argon2id + AES-256-CBC + GZip），可用 KeePass / KeePassXC 等任意 KeePass 生态客户端打开
- **导入 KeePass (.kdbx)** — 支持从 KeePass / KeePassXC 导出的 KDBX 文件迁移凭证，输入文件密码后自动解密并预览
- 文件夹自动映射为 KeePass 分组（保留层级）
- 密码使用内层流加密（Protected 字段）存储，与 KeePass 原生行为一致
- 卡券条目自动映射卡号/有效期/CVV 自定义字段
- 星标收藏映射为 `SecureVaultFavorite` 自定义字段
- 导入类型智能推断：卡号特征 / 卡字段 → 虚拟卡券，无凭据 → 安全备忘

### ✨ Improvements

- 窗口启动时自动居中（`center: true`），不再由系统级联放置

### 🔧 Fixes

- 修复 rust-argon2 与 argon2 同名 lib 冲突（E0464），通过派生默认配置版本规避

---

## v1.3.1 (2026-08-08)

### 🔧 Fixes

- Import button labels updated to cover all supported formats (CSV + JSON)
- README version badge and history corrected
- CHANGELOG version references fixed

---

## v1.3.0 (2026-08-08)

### 🆕 Browser Password Import — Phase 2

- New formats: 1Password CSV, LastPass CSV, Bitwarden CSV/JSON, Safari CSV
- Auto-detect source with 6-level detection chain + Safari/1Password case distinction
- LastPass grouping column auto-mapped to folders
- Bitwarden folder/collectionIds auto-mapped to folders
- Bitwarden JSON type mapping (login/note/card/identity)

### 🔧 Fixes

- LastPass CSV misidentified as Chrome (detection order fix)
- Safari CSV misidentified as 1Password (header case check)
- Import preview format label not showing for new formats

### 🔨 Improvements

- Sidebar spacing adjusted to eliminate scrollbar with 7+ folders
- File picker now accepts .json format
- Folder list max-height increased (192px → 208px)

---

## v1.2.0 (2026-08-07)

### 🆕 Browser Password Import

- Import passwords from Chrome/Edge/Firefox CSV export files
- Auto-detect browser format, domain-based duplicate detection
- Preview with infinite scroll, password reveal, skip/merge strategy
- Automatic encoding detection (UTF-8/GBK/UTF-16)

### 🆕 Change Master Password

- Settings panel entry to change master password
- Support switching KDF algorithm (Argon2id ↔ PBKDF2)
- Auto-lock after success to verify new password

### 🔧 Fixes

- Critical fix: `storedCiphertext` not synced after password change, preventing unlock
- Fix `unlock` stale closure missing `selectedKdf` dependency
- GitHub Actions: `checkout@v5` + `setup-node@v6` (Node.js 24)
- Fix Chinese CSV import encoding errors (GBK detection)

### 🔨 Improvements

- Settings page layout restructured
- Native selects replaced with custom dropdowns (matching LockScreen style)
- Sidebar fixed, content area scrolls independently
- Backup JSON now includes `kdf` field

---

## v1.1.1 (2026-08-04)

### 🔧 Fixes

- macOS: build pipeline now includes ad-hoc codesign, fixing "app is damaged" on Apple Silicon
- README: storage path corrected to `%LOCALAPPDATA%` on Windows

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
