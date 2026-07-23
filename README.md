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
  <b>零知识 · 纯本地 · 跨平台桌面密码管理器</b>
</p>

<p align="center">
  基于 <b>Tauri v2 + React 19 + Rust</b> 构建。所有加密操作在 Rust 后端完成，数据 100% 本地存储，绝不联网，绝不上云。
</p>

<p align="center">
  📖 <a href="README_EN.md">English Documentation</a>
</p>

---

## 📥 下载

| 平台 | 文件 | 大小 |
| --- | --- | --- |
| Windows | `SecureVault_1.0.0_x64-setup.exe` | ~8 MB |
| macOS | `SecureVault_1.0.0_universal.dmg` | ~10 MB |
| Linux | `SecureVault_1.0.0_amd64.AppImage` | ~10 MB |

> 🟢 **绿色免安装**：从 Release 压缩包中提取 `secure-vault-desktop.exe` 即可直接运行，无需安装。

---

## 🔒 安全架构

| 层级 | 算法 | 说明 |
| --- | --- | --- |
| 密钥派生 | **Argon2id** (64MB) / **PBKDF2-SHA256** (10万次) | 双算法可选，抗 GPU/ASIC 暴力破解 |
| 数据加密 | **AES-256-GCM** | 随机 Nonce，认证加密，防篡改 |
| 文件写入 | 原子写入（临时文件 + 重命名） | 防止意外断电导致数据损坏 |
| 完整性校验 | **SHA-256** | 导入备份时自动验证 |
| 存储位置 | 系统应用数据目录 | Windows `%APPDATA%` / macOS `Application Support` |

---

## ✨ 功能

### 🔐 保险箱管理

- **四种凭证类型** — 登录账号 / 虚拟卡券 / 安全备忘 / 密保资料
- **文件夹分类** — 自定义创建/重命名/删除文件夹
- **星标收藏** — 快速定位重要条目
- **自动锁定** — 可配置空闲超时，锁定时从内存中擦除密钥和解密数据

### 🧬 加密与备份

- **双 KDF** — Argon2id（默认推荐）或 PBKDF2-SHA256
- **加密导出** — AES-256-GCM 加密 + SHA-256 校验和
- **智能导入** — 合并或覆盖策略，自动完整性验证

### 🔍 安全审计

- **弱密码检测** — 基于 Shannon 熵值估算
- **复用碰撞** — 跨服务密码复用检测
- **泄露匹配** — 与已知泄露密码特征对比
- **一键修补** — 自动生成高强度替换密码

### 🎲 密码生成器

- **随机模式** — 可配置长度、字符集、排除易混淆字符
- **助记词模式** — BIP39 2048 词库标准，自定义分隔符、首字母大写
- **熵值仪表** — 实时熵值估算与破译时间预测
- **历史缓存** — 最近生成的密码，一键复制

---

## ⌨️ 快捷操作

| 操作 | 方式 |
| --- | --- |
| 新建凭证 | 点击侧栏「新建凭证」按钮 |
| 查看密码明文 | 点击密码输入框旁的 👁 按钮 |
| 复制到剪贴板 | 悬停任意字段 — 复制按钮出现 |
| 锁定保险箱 | 点击侧栏底部「立即锁定保险箱」 |

---

## 🛠️ 技术栈

| 技术 | 用途 |
| --- | --- |
| `Tauri v2` | 桌面框架 — 轻量、原生性能 |
| `React 19` | UI 渲染层 |
| `TypeScript` | 类型安全的前端逻辑 |
| `Rust` | 加密后端 (PBKDF2, Argon2, AES-256-GCM) |
| `Tailwind CSS v4` | 原子化样式 |
| `motion` | 动画与过渡效果 |
| `lucide-react` | 图标库 |
| `Vite 6` | 前端构建工具 |

---

## 📁 项目结构

```text
src/
├── components/          # 8 个 UI 组件
│   ├── LockScreen.tsx            # 保险箱锁定 / 主密码创建
│   ├── CredentialDetail.tsx      # 凭证详情视图
│   ├── PasswordGenerator.tsx     # 密码与助记词生成器
│   ├── SecurityAudit.tsx         # 安全审计仪表板
│   ├── SplashScreen.tsx          # 启动 Splash 动画
│   └── FolderModal / DeleteConfirmModal / ImportPasswordModal
├── hooks/               # 3 个自定义 React Hook
│   ├── useVault.ts               # 加密、CRUD、自动保存
│   ├── usePasswordGenerator.ts   # 密码生成逻辑
│   └── useSecurityAudit.ts       # 审计计算逻辑
├── utils/               # 3 个工具模块
│   ├── tauriBridge.ts            # Tauri IPC 封装
│   ├── vaultStorage.ts           # 加密存储操作
│   └── wordlist.ts               # BIP39 2048 英文词库
├── App.tsx              # 主应用组件
├── main.tsx             # 入口
└── index.css            # 全局样式与动画
src-tauri/
├── src/main.rs          # Rust 加密后端（7 个 Tauri 命令）
├── Cargo.toml           # Rust 依赖
├── capabilities/        # Tauri 插件权限
└── icons/               # 应用图标（PNG, ICO, ICNS）
```

---

## 🚀 本地构建

### 环境要求

- **Node.js** 18+
- **Rust**（通过 [rustup](https://rustup.rs) 安装）
- **Windows**：需要 [Visual Studio C++ 生成工具](https://visualstudio.microsoft.com/downloads/#build-tools-for-visual-studio-2022)

### 开发调试

```bash
# 安装依赖
npm install

# 启动 Tauri 桌面调试模式（热更新）
npm run tauri dev

# TypeScript 类型检查
npm run typecheck
```

### 生产打包

```bash
npm run tauri build
```

产物位置：`src-tauri/target/release/bundle/nsis/`（Windows NSIS 安装器）。

---

## 📝 版本历史

| 版本 | 日期 | 说明 |
| --- | --- | --- |
| `v1.0.0` | 2026-07-23 | 首次发布 — 完整保险箱、双 KDF、审计、密码生成器 |

> 详见 [CHANGELOG.md](CHANGELOG.md)

---

## 🤝 参与贡献

欢迎提交 Issue 和 Pull Request。重大变更请先开 Issue 讨论。

> 详见 [CONTRIBUTING.md](CONTRIBUTING.md)

## 📄 开源许可

[MIT License](LICENSE) © 2024 SecureVault — 自由使用、修改、分发。

---

## ⭐ Star History

<p align="center">
  <a href="https://star-history.com/#NovanJex/SecureVault-Desktop&Date">
    <img src="https://api.star-history.com/svg?repos=NovanJex/SecureVault-Desktop&type=Date" alt="Star History Chart" />
  </a>
</p>
