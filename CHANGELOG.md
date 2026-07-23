# Changelog

All notable changes to this project will be documented in this file.

---

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
