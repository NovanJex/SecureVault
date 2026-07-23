<p align="center">
  <img src="src-tauri/icons/icon.png" alt="SecureVault" width="128" height="128" />
</p>

<h1 align="center">SecureVault 🔐</h1>

<p align="center">
  <img src="https://img.shields.io/badge/version-1.0.0-blue.svg" alt="version" />
  <img src="https://img.shields.io/badge/Tauri-v2-FFC131?logo=tauri" alt="Tauri" />
  <img src="https://img.shields.io/badge/React-19-61DAFB?logo=react" alt="React" />
  <img src="https://img.shields.io/badge/Rust-🦀-orange?logo=rust" alt="Rust" />
  <img src="https://img.shields.io/badge/license-MIT-green" alt="license" />
  <img src="https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Linux-lightgrey" alt="platform" />
</p>

<p align="center">
  <b>Zero-knowledge · Fully offline · Cross-platform desktop password manager</b>
</p>

<p align="center">
  Built with <b>Tauri v2 + React 19 + Rust</b>. All cryptographic operations run in the Rust backend — your data stays 100% local, no network, no cloud, ever.
</p>

<p align="center">
  📖 <a href="README_ZH.md">中文文档</a>
</p>

---

## 📥 Download

| Platform | File | Size |
| --- | --- | --- |
| Windows | `SecureVault_1.0.0_x64-setup.exe` | ~8 MB |
| macOS | `SecureVault_1.0.0_universal.dmg` | ~10 MB |
| Linux | `SecureVault_1.0.0_amd64.AppImage` | ~10 MB |

> 🟢 **Portable**: Extract `secure-vault-desktop.exe` from the release archive and run directly — no installation required.

---

## 🔒 Security Architecture

| Layer | Algorithm | Description |
| --- | --- | --- |
| Key Derivation | **Argon2id** (64MB) / **PBKDF2-SHA256** (100K iter) | Dual KDF, user-selectable, GPU/ASIC resistant |
| Data Encryption | **AES-256-GCM** | Random 12-byte nonce, authenticated encryption, tamper-proof |
| File I/O | Atomic write (temp + rename) | Prevents corruption on unexpected shutdown |
| Integrity | **SHA-256** checksum | Verified on every backup import |
| Storage | OS app data directory | `%APPDATA%` (Windows) / `Application Support` (macOS) |

---

## ✨ Features

### 🔐 Vault Management

- **4 credential types** — Login / Card / Secure Note / Identity
- **Folder organization** — custom folders with rename/delete
- **Star favorites** — quick access to important items
- **Auto-lock** — configurable idle timeout, sensitive data wiped from memory on lock

### 🧬 Encryption & Backup

- **Dual KDF** — Argon2id (default, recommended) or PBKDF2-SHA256
- **Encrypted export** — AES-256-GCM backup with SHA-256 checksum
- **Smart import** — merge or overwrite strategies, automatic integrity verification

### 🔍 Security Audit

- **Weak password detection** — Shannon entropy estimation
- **Reuse collision** — cross-service password reuse detection
- **Compromised check** — matches against known leaked password patterns
- **One-click fix** — auto-generate strong replacement passwords

### 🎲 Password Generator

- **Random mode** — configurable length, character sets, exclude ambiguous chars
- **Passphrase mode** — BIP39 2048-word standard, customizable separator, capitalization
- **Entropy meter** — real-time entropy estimation with crack time projection
- **History cache** — last generated passwords with one-click copy

---

## ⌨️ Shortcuts

| Action | How |
| --- | --- |
| Create credential | Click "新建凭证" in sidebar |
| Toggle password visibility | Click the 👁 button on any password field |
| Copy to clipboard | Hover any field — copy button appears |
| Lock vault | Click "立即锁定保险箱" in sidebar footer |

---

## 🛠️ Tech Stack

| Technology | Usage |
| --- | --- |
| `Tauri v2` | Desktop framework — lightweight, native performance |
| `React 19` | UI rendering layer |
| `TypeScript` | Type-safe frontend logic |
| `Rust` | Cryptographic backend (PBKDF2, Argon2, AES-256-GCM) |
| `Tailwind CSS v4` | Utility-first styling |
| `motion` | Animations and transitions |
| `lucide-react` | Icon library |
| `Vite 6` | Frontend bundler |

---

## 📁 Project Structure

```text
src/
├── components/          # 8 UI components
│   ├── LockScreen.tsx            # vault lock / master password creation
│   ├── CredentialDetail.tsx      # credential detail view
│   ├── PasswordGenerator.tsx     # password & passphrase generator
│   ├── SecurityAudit.tsx         # security audit dashboard
│   ├── SplashScreen.tsx          # startup splash animation
│   └── FolderModal / DeleteConfirmModal / ImportPasswordModal
├── hooks/               # 3 custom React hooks
│   ├── useVault.ts               # encryption, CRUD, auto-save
│   ├── usePasswordGenerator.ts   # generation logic
│   └── useSecurityAudit.ts       # audit calculation
├── utils/               # 3 utility modules
│   ├── tauriBridge.ts            # Tauri IPC wrapper
│   ├── vaultStorage.ts           # encrypted storage operations
│   └── wordlist.ts               # BIP39 2048 English word list
├── App.tsx              # main application component
├── main.tsx             # entry point
└── index.css            # global styles & animations
src-tauri/
├── src/main.rs          # Rust crypto backend (7 Tauri commands)
├── Cargo.toml           # Rust dependencies
├── capabilities/        # Tauri plugin permissions
└── icons/               # application icons (PNG, ICO, ICNS)
```

---

## 🚀 Build from Source

### Prerequisites

- **Node.js** 18+
- **Rust** (via [rustup](https://rustup.rs))
- **Windows**: [Visual Studio C++ Build Tools](https://visualstudio.microsoft.com/downloads/#build-tools-for-visual-studio-2022)

### Development

```bash
# Install dependencies
npm install

# Launch Tauri desktop dev mode (hot reload)
npm run tauri dev

# TypeScript type check
npm run typecheck
```

### Production Build

```bash
npm run tauri build
```

Output: `src-tauri/target/release/bundle/nsis/` (Windows NSIS installer).

---

## ☁️ CI/CD (GitHub Actions)

Push a version tag to trigger automatic cross-platform builds:

```bash
git tag v1.0.0
git push origin v1.0.0
```

> ⚠️ **Before first use**: Repository Settings → Actions → General → Workflow permissions → **Read and write permissions**.

---

## 📝 Version History

| Version | Date | Notes |
| --- | --- | --- |
| `v1.0.0` | 2024-07 | Initial release — full vault, dual KDF, audit, generator |

---

## 🤝 Contributing

Issues and pull requests are welcome. For major changes, please open an issue first to discuss.

## 📄 License

[MIT License](LICENSE) © 2024 SecureVault — free to use, modify, and distribute.

---

<p align="center">
  <sub>🔐 100% Client-Side Pure Local Cryptography Sandbox</sub>
</p>
