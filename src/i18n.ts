// i18n.ts — 轻量国际化：跟随系统 locale（navigator.language），中文原文作为字典 key
// 判定规则：明确 zh 开头 → 中文；其余（含检测失败）→ 英文（符合 AppImageHub 收录要求）
// 未收录的字符串回退中文原文 —— 不会崩、不会显示 key
//
// 调试/强制覆盖：localStorage.setItem('sv-lang', 'en' | 'zh') 后刷新

const detectLang = (): "zh" | "en" => {
  try {
    const override = localStorage.getItem("sv-lang");
    if (override === "zh" || override === "en") return override;
  } catch {
    /* localStorage 不可用时静默忽略 */
  }
  const nav = (navigator.language || "").toLowerCase();
  return nav.startsWith("zh") ? "zh" : "en";
};

export const lang: "zh" | "en" = detectLang();
export const isZh = lang === "zh";

/** 中文原文 → 英文。key 必须与源码中的中文完全一致（含 emoji 与标点）。 */
const EN: Record<string, string> = {
  // ============ 通用 ============
  "取消": "Cancel",
  "保存": "Save",
  "保存 (写入密盒)": "Save",
  "关闭": "Close",
  "确认新建": "Create",
  "清除": "Clear",
  "清空": "Clear",
  "显示": "Show",
  "隐藏": "Hide",
  "显示密码": "Show password",
  "隐藏密码": "Hide password",

  // ============ SplashScreen / 启动 ============
  "SecureVault 安全保险箱": "SecureVault",
  "🔐 正在初始化本地沙盒安全区 (Secure Enclave)...": "🔐 Initializing local sandbox vault (Secure Enclave)...",
  "⚙️ 正在载入 PBKDF2 / Argon2id 密码推导引擎...": "⚙️ Loading PBKDF2 / Argon2id key derivation engine...",
  "🛡️ 正在进行对称密码体系与本地密文对齐度量...": "🛡️ Calibrating symmetric cipher suite with local ciphertext...",
  "⚡ 本端零知识安全沙箱启动就绪！": "⚡ Zero-knowledge sandbox ready!",

  // ============ LockScreen ============
  "创建本地高强度保险箱": "Create Your Local Vault",
  "欢迎使用 SecureVault！首次运行，我们需要在本地派生物理存储库对称密钥，该主密码仅存在您的本地，切勿遗忘。":
    "Welcome to SecureVault! On first run we derive a symmetric key for your local vault. This master password stays on your device only — never forget it.",
  "输入您的主解锁密码": "Enter your master password",
  "设置至少 8 位的主密码...": "Set a master password (min. 8 characters)...",
  "主密钥推导算法 (KDF)": "Key Derivation (KDF)",
  "Argon2id (推荐)": "Argon2id (recommended)",
  "PBKDF2-SHA256": "PBKDF2-SHA256",
  "Argon2id: 抗 GPU/ASIC 硬件暴力破解，64MB 内存硬化，业界最安全 KDF。":
    "Argon2id: resistant to GPU/ASIC brute force, 64MB memory-hardened — the strongest KDF available.",
  "PBKDF2-SHA256: NIST/FIPS 标准，100,000 轮哈希迭代拉伸。":
    "PBKDF2-SHA256: NIST/FIPS standard, 100,000 hash iterations.",
  "派生密钥并创建安全区": "Derive Key & Create Vault",
  "安全保险箱已锁定": "Vault Locked",
  "明文密钥已安全退出，请输入 Master Password 解锁": "Keys wiped from memory. Enter your master password to unlock",
  "主密码 (MASTER PASSWORD)": "Master Password",
  "输入对应的主解密密码...": "Enter your master password...",
  "验证主密码并解锁": "Unlock Vault",
  "❓ 忘了主密码怎么办？": "❓ Forgot your master password?",
  "第一步：仔细回想与核对": "Step 1: Think carefully",
  "主密码是解密对称密钥的唯一密码学钥匙。请核对是否曾在离线本子、纸张或硬件保险箱中进行了物理抄写备份。":
    "Your master password is the only key to your encrypted data. Check whether you wrote it down offline — a notebook, paper, or hardware safe.",
  "实在找不到？只能进行强制重置": "Still can't find it? Force reset is the only option",
  "如果主密码确实彻底遗失，由于密码学无法被暴力攻破，您只能通过\"强制重置保险箱\"重新开始使用。但这会导致之前保存在本地的所有数据不可逆地永久销毁。":
    "If the master password is truly lost, it cannot be brute-forced. Your only option is to force-reset the vault and start over — all locally stored data will be permanently and irreversibly destroyed.",
  "💥 强制初始化重置保险箱": "💥 Force Reset Vault",
  "🚨 终极警告：重置将永久且不可恢复地清除您本地的所有加密卡券、密码凭证及密保文件。确认要清除并刷新应用吗？":
    "🚨 Final warning: this permanently erases all local cards, credentials and secure notes. Are you sure?",
  "确认彻底清除": "Erase Everything",

  // ============ 主界面侧栏 / 列表 ============
  // —— App.tsx 运行时消息补充 ——
  "⏳ 由于长时间无操作，保险箱已自动安全锁定！": "⏳ Vault auto-locked after a period of inactivity!",
  "⚠️ 保险箱未解锁，无法导出": "⚠️ Vault is locked — cannot export",
  "⚠️ 凭证标题不能为空！": "⚠️ Credential title cannot be empty!",
  "⚠️ 剪贴板访问失败": "⚠️ Clipboard access failed",
  "⚠️ 已存在同名文件夹！": "⚠️ A folder with this name already exists!",
  "⚠️ 文件夹分类名称不能为空！": "⚠️ Folder name cannot be empty!",
  "⚠️ 文件夹分类名称已存在！": "⚠️ Folder name already exists!",
  "⚠️ 文件夹名称不能为空！": "⚠️ Folder name cannot be empty!",
  "⚠️ 载入了未加密的旧版明文格式备份文件": "⚠️ Loaded a legacy unencrypted backup file",
  "⚡ 已自动填入高强度新随机密码！": "⚡ Generated a strong random password!",
  "✅ 主密码修改成功！即将锁定...": "✅ Master password changed! Locking...",
  "✅ 主密码修改成功！请用新密码重新解锁": "✅ Master password changed! Unlock with the new one",
  "✅ 已导出 KeePass KDBX 数据库！": "✅ KeePass KDBX database exported!",
  "❌ 备份文件读取或解析失败": "❌ Failed to read or parse backup file",
  "❌ 密码错误或备份文件已损坏，无法解密": "❌ Wrong password or corrupted backup file",
  "❌ 导出加密文件失败，请重试": "❌ Export failed, please retry",
  "❌ 无效的备份数据，请确保格式正确": "❌ Invalid backup data",
  "❌ 旧密码错误，请重新输入": "❌ Current password is incorrect",
  "两次输入的密码不一致": "Passwords do not match",
  "两次输入的新密码不一致": "New passwords do not match",
  "KDBX 密码至少需要 4 位": "KDBX password must be at least 4 characters",
  "🎉 自动校验当前主密码成功，已无感解密并载入数据！": "🎉 Decrypted with the current master password and loaded!",
  "🎉 解密验证通过，成功恢复备份数据！": "🎉 Backup decrypted and restored!",
  "💥 保险箱已成功强制重置并清空所有旧数据！": "💥 Vault force-reset — all previous data erased!",
  "💾 成功添加新密码条目并完成 AES-256 扇区加密存储！": "💾 Credential added and encrypted (AES-256)!",
  "📤 导出为 KeePass 标准数据库格式，可使用 KeePass / KeePassXC 等任何 KeePass 生态客户端打开，方便随时迁移。": "📤 Export as a standard KeePass database — openable in KeePass / KeePassXC and other ecosystem clients.",
  "📥 支持从 KeePass / KeePassXC 导出的 KDBX 文件迁移凭证，需输入该文件的密码。": "📥 Migrate credentials from KeePass / KeePassXC KDBX files — the file password is required.",
  "📥 正在导入凭证数据...": "📥 Importing credential data...",
  "🔑 正在解密备份文件...": "🔑 Decrypting backup file...",
  "🔑 正在验证旧密码...": "🔑 Verifying current password...",
  "🔒 保险箱已使用 AES-256-GCM 加密并成功导出备份！": "🔒 Backup exported with AES-256-GCM encryption!",
  "🔒 保险箱已锁定。明文密钥及机密数据已安全从内存中擦除！": "🔒 Vault locked. Keys and secrets wiped from memory!",
  "🔓 保险箱已成功解锁！数据加载完毕。": "🔓 Vault unlocked! Data loaded.",
  "🔓 密码安全保险箱创建成功！": "🔓 Vault created successfully!",
  "🔓 正在派生解密密钥...": "🔓 Deriving decryption key...",
  "🧬 正在用新密码重新加密保险箱...": "🧬 Re-encrypting vault with the new password...",

  "👁️ 已忽略该条目的密码安全诊断告警": "👁️ Security warning ignored for this item",
  "🔒 已恢复该条目的密码安全诊断告警": "🔒 Security warning restored for this item",
  "🔒 已自动为该条目安全更新 20 位高强随机密码！": "🔒 Replaced with a new 20-char random password!",
  "💾 条目修改成功，已在内存防泄漏保护区写入安全磁道！": "💾 Credential updated and saved securely!",
  "请输入该 KDBX 文件的密码": "Enter the password for this KDBX file",
  "该 KDBX 文件中没有有效的密码记录": "No valid entries found in this KDBX file",
  "请输入该": "Enter the password for the",
  "文件的密码进行解密（与 SecureVault 主密码无关）。": " file (this is the KDBX file\'s own password, not your SecureVault master password).",
  "设置该 KDBX 文件的独立密码，": "Set a standalone password for this KDBX file — ",
  "请务必牢记": "remember it well",
  "——KeePass 生态客户端（KeePass / KeePassXC）打开此文件时需要它。": " — KeePass ecosystem clients (KeePass / KeePassXC) will ask for it when opening the file.",
  "📥 该文件包含当前保险箱内所有的": "📥 This file contains all ",
  "分类文件夹目录": "folders",
  "与": " and ",
  "凭证记录明细": "credential entries",
  "。密文物理对齐本地密钥后，导出为解密的标准 JSON 文件，请安全离线保存该备份。": ". The ciphertext is exported as a decrypted standard JSON file — keep this backup offline and safe.",
  "新建凭证": "New Credential",
  "新建文件夹": "New Folder",
  "常用视角": "Views",
  "所有本地条目": "All Items",
  "星标收藏": "Favorites",
  "智能密码生成器": "Password Generator",
  "安全智能审计": "Security Audit",
  "浏览器插件包": "Browser Extension",
  "按模版过滤": "Filter by Type",
  "常规账号": "Logins",
  "虚拟卡券": "Cards",
  "安全备忘": "Notes",
  "密保资料": "Identities",
  "自定义文件夹": "Custom Folders",
  "暂无文件夹": "No folders yet",
  "重命名": "Rename",
  "删除文件夹": "Delete folder",
  "安全状态：极佳": "Security: Excellent",
  "检测到安全隐患": "Security issues detected",
  "无弱密码或复用漏洞": "No weak or reused passwords",
  "智能审计": "Smart Audit",
  "打开设置中心": "Open Settings",
  "立即锁定保险箱": "Lock Vault Now",
  "搜索安全密盒标题、登录账号、网址、自定义分类...": "Search titles, usernames, URLs, folders...",
  "未发现匹配的安全凭证": "No matching credentials",
  "您可以调整搜索过滤词，或点击左上角的「新建凭证」开始录入加密项。":
    "Try adjusting your search, or click “New Credential” to add one.",
  "已忽略": "Ignored",
  "安全": "Safe",
  "中等": "Medium",
  "风险": "Risk",
  "已过期": "Expired",
  "回收站": "Trash",
  "导出报告": "Export Report",
  "安全报告": "Security Report",
  "✅ 安全报告已导出": "✅ Security report exported",
  "❌ 导出安全报告失败": "❌ Failed to export security report",
  "到期日期": "Expiry",
  "类型": "Type",
  "强度": "Strength",
  "复用次数": "Reuse Count",
  "泄露匹配": "Breach Match",
  "最近修改": "Last Modified",
  "是": "Yes",
  "否": "No",
  "恢复": "Restore",
  "彻底删除": "Delete Permanently",
  "回收站为空": "Trash is empty",
  "移入回收站确认": "Move to Trash?",
  "确定要将": "Move",
  "移入回收站吗？可在回收站中恢复或彻底删除。": " to Trash? You can restore it or delete it permanently later.",
  "移入回收站": "Move to Trash",
  "♻️ 条目已恢复到保险箱": "♻️ Item restored to vault",
  "恢复此密码": "Restore this password",
  "♻️ 已恢复历史密码": "♻️ Historical password restored",
  "安全凭密备忘明细": "Secure note",
  "复制账号": "Copy username",
  "复制密码": "Copy password",
  "复制此密码": "Copy this password",
  "重新生成": "Regenerate",
  "生成的密码": "Generated password",
  "历史密码": "Password history",

  // ============ 凭证表单 ============
  "新建安全凭证": "New Credential",
  "编辑安全凭证": "Edit Credential",
  "采用 AES-256-GCM 高强度本地对称物理扇区加密存储": "Encrypted locally with AES-256-GCM",
  "选择安全模版类型": "Choose a template",
  "凭证标题": "Title",
  "如: Github 工作库, 主力建行卡": "e.g. GitHub Work, Main Card",
  "归属文件夹分类": "Folder",
  "未分类": "Uncategorized",
  "账号/用户名": "Username",
  "邮箱, 账号名或手机号": "Email, username or phone",
  "账户密码": "Password",
  "请输入或使用下发生成器": "Enter or generate below",
  "随机生成": "Random",
  "网站 URL 地址": "Website URL",
  "资产登记所有人/姓名": "Cardholder Name",
  "如: ZHANG SAN 或 常用称呼": "e.g. ZHANG SAN",
  "卡号 / 储值券密匙": "Card / Voucher Number",
  "请输入储值卡、礼品卡或会员卡号": "Enter card, gift or membership number",
  "有效期/保质期 (如适用)": "Expiry (if applicable)",
  "备用辅助验证码 (非 CVV/CVC 密码)": "Auxiliary Code (not CVV/CVC)",
  "备用辅助说明或卡片附加特征码": "Auxiliary note or card feature code",
  "常用登记姓名/代号": "Name / Alias",
  "真实姓名或常用申诉网名": "Real name or alias",
  "申诉或关联邮箱": "Recovery Email",
  "注册/验证绑定手机号": "Recovery Phone",
  "物理收货 / 申诉绑定地址": "Shipping / Recovery Address",
  "省、市、区、常用收货或注册地": "City, district, address...",
  "安全备注及备忘记录 (支持明细)": "Secure Notes",
  "输入该条目的备用说明、密保问题、二次恢复口令等重要明细...": "Backup notes, security questions, recovery codes...",
  "两步验证密钥 (TOTP) 可选": "TOTP Secret (optional)",
  "粘贴 Base32 密钥或 otpauth:// 链接（如网站 2FA 设置页提供的密钥）": "Paste a Base32 secret or otpauth:// link (from the site's 2FA setup page)",
  "⚠️ 保险箱被攻破时验证码与密码将同时泄露——银行/邮箱等高价值账户建议使用独立验证器":
    "⚠️ If the vault is breached, codes and passwords leak together — use a separate authenticator for high-value accounts (bank, email).",
  "到期提醒 (可选)": "Expiry Reminder (optional)",
  "适用于卡券有效期、证书过期日等时间敏感条目": "For card validity, certificate expiry and other time-sensitive items",
  "自定义字段 (可选)": "Custom Fields (optional)",
  "添加字段": "Add Field",
  "存储标准字段之外的附加信息（如备用邮箱、PIN 码、服务器地址等）":
    "Store extra information beyond standard fields (backup email, PIN, server address, etc.)",
  "字段名": "Name",
  "字段值": "Value",
  "删除字段": "Remove field",

  // 卡片/身份模板安全提示（JSX 片段）
  "卡片资产安全贴士：": "Card safety tip:",
  "建议仅用于存储游戏卡、App Store 充值券、平台代金券、会员卡或非核心虚拟卡号。出于账户资产防御安全考量，":
    "Store only game cards, App Store vouchers, platform coupons, membership cards or non-critical virtual card numbers. For your security, ",
  "请勿记录": "do not store",
  "借记卡取款密码、信用卡 CVV 码或敏感物理网银凭证。本系统 100% 纯本地离线加密运行。":
    " debit PINs, credit card CVVs or sensitive banking credentials. This app runs 100% offline with local encryption.",
  "申诉绑定常用资料贴士：": "Recovery info tip:",
  "此模版旨在供您集中存放及便捷复制各站注册时填写的申诉验证密保、备用邮箱、联系手机或收货物理地址。":
    "This template keeps your account recovery info (security questions, backup email, phone, shipping address) in one place. ",
  "本系统并非政务系统，绝不会要求上传、收集或上传": "This is not a government service and will never ask you to upload ",
  "您的物理身份证、护照等极度敏感的核心隐私证件照，100% 纯本地沙盒加密。":
    " ID cards, passports or other highly sensitive documents. 100% local encrypted sandbox.",

  // ============ 设置页 ============
  "保险箱高级设置中心": "Vault Settings",
  "零知识本端物理备份、本端数据导入与恢复": "Local backup, import & restore — zero-knowledge",
  "数据备份、恢复与本地导入导出": "Backup, Restore & Import/Export",
  "此密盒由完全离线物理沙盒驱动，所有数据均存储在本地。为了防止使用应用的设备丢失或损坏造成数据丢失，请务必定期导出物理备份文件。":
    "All data is stored locally in an offline sandbox. To protect against device loss or damage, export a backup regularly.",
  "导出本端物理备份 (JSON格式)": "Export Backup (JSON)",
  "一键导出保险箱物理备份": "Export Vault Backup",
  "从物理备份恢复 / 合并导入": "Restore / Merge Import",
  "合并导入 (不覆盖现有凭证)": "Merge (keep existing)",
  "覆盖导入 (清空并完全替换)": "Overwrite (replace all)",
  "点击选择备份 JSON 文件": "Choose backup JSON file",
  "导出 KeePass (.kdbx)": "Export KeePass (.kdbx)",
  "导出 KeePass 数据库": "Export KeePass Database",
  "导入 KeePass (.kdbx)": "Import KeePass (.kdbx)",
  "选择 KDBX 文件导入": "Choose KDBX File",
  "导入外部密码": "Import External Passwords",
  "支持 Chrome/Edge/Firefox/1Password/LastPass/Bitwarden/Safari 的 CSV 或 JSON 文件。":
    "Supports CSV or JSON from Chrome/Edge/Firefox/1Password/LastPass/Bitwarden/Safari.",
  "选择密码文件": "Choose Password File",
  "自动锁定": "Auto-Lock",
  "超时后自动擦除内存中的密钥。": "Wipes in-memory keys after inactivity.",
  "从不锁定 (不推荐)": "Never (not recommended)",
  "修改主密码": "Change Master Password",
  "验证旧密码后即可更换新主密码，可选切换 KDF 算法。保险箱数据将用新密码重新加密保存。":
    "Verify your current password, then set a new one. You may also switch the KDF. The vault will be re-encrypted.",
  "旧主密码": "Current Password",
  "新主密码（≥8位）": "New Password (min. 8 chars)",
  "确认新密码": "Confirm New Password",
  "加密算法": "Encryption Algorithm",
  "Argon2id（推荐，抗GPU）": "Argon2id (recommended)",
  "PBKDF2-SHA256（10万次）": "PBKDF2-SHA256 (100k)",
  "正在处理...": "Processing...",
  "确认修改": "Confirm Change",

  // ============ 底部状态栏 ============
  "100% 纯本地离线安全沙箱": "100% Offline Local Sandbox",
  "所有凭证经高强度算法本端加密存储，支持完全断网独立运行。": "All credentials are encrypted locally and run fully offline.",
  "物理派生：": "KDF: ",
  "加密算法：": "Cipher: ",
  "AES-256-GCM 硬件级": "AES-256-GCM",
  "未派生": "Not derived",

  // ============ KDBX 模态框 ============
  "导入 KeePass 数据库": "Import KeePass Database",
  "KDBX 文件密码": "KDBX File Password",
  "输入 KDBX 文件密码": "Enter KDBX file password",
  "解密中...": "Decrypting...",
  "解密并预览": "Decrypt & Preview",
  "KDBX 密码": "KDBX Password",
  "至少 4 位": "At least 4 characters",
  "确认密码": "Confirm Password",
  "再次输入 KDBX 密码": "Re-enter KDBX password",
  "导出中...": "Exporting...",
  "选择位置并导出": "Choose location & export",

  // ============ FolderModal ============
  "新建本地分类文件夹": "New Folder",
  "创建后，您的密码项可直接归入此类文件夹做密文聚合分类。": "Organize your credentials into folders for grouped encryption.",
  "分类名称": "Folder Name",
  "如: 服务器密钥, 临时网购账户": "e.g. Server Keys, Shopping Accounts",

  // ============ ImportPasswordModal ============
  "备份文件解密": "Decrypt Backup",
  "此备份文件已加密。请输入创建该备份时使用的主密码进行解密。": "This backup is encrypted. Enter the master password used when it was created.",
  "解密密码": "Password",
  "请输入备份文件的解密密码": "Enter the backup password",
  "解密并导入": "Decrypt & Import",

  // ============ DeleteConfirmModal ============
  "高强度安全擦除确认": "Secure Erase Confirmation",
  "确定要从本端安全沙箱中彻底": "Permanently",
  "物理擦除并覆写粉碎": "erase and shred",
  "密码凭证": "the credential",
  "吗？此安全擦除操作不可逆，数据粉碎后无法恢复。": "from this local sandbox? This action is irreversible.",
  "确定要删除本地分类文件夹": "Delete folder",
  "吗？删除后，其中的凭证条目将自动归为未分类。": "? Its credentials will move to Uncategorized.",
  "确认安全擦除": "Erase Permanently",

  // ============ BrowserImportPreview（导入预览）============
  "未知来源": "Unknown source",
  "无法识别导入文件": "Unrecognized import file",
  "CSV 格式不被识别。目前支持 Chrome、Edge、Firefox 导出的密码文件。":
    "CSV format not recognized. Supported: Chrome, Edge, Firefox password exports.",
  "文件中没有有效的密码记录。": "No valid password records found in this file.",
  "导入浏览器密码": "Import Browser Passwords",
  "将导入": "To Import",
  "可导入": "Importable",
  "总记录": "Total",
  "域名重复": "Duplicates",
  "已有记录": "Existing",
  "标题": "Title",
  "账号": "Username",
  "密码": "Password",
  "状态": "Status",
  "跳过": "Skip",
  "重复": "Duplicate",
  "导入策略:": "Strategy:",
  "合并（保留已有）": "Merge (keep existing)",
  "跳过重复项": "Skip duplicates",

  // ============ CredentialDetail（详情）============
  "安全凭证控制台": "Credential Console",
  "本地沙盒安全区解密视图": "Decrypted view from the local sandbox",
  "编辑条目": "Edit",
  "安全擦除": "Erase",
  "用户名 / 登录邮箱": "Username / Email",
  "密码安全密文": "Password",
  "快捷访问网址 URL": "Website URL",
  "在系统浏览器中打开": "Open in browser",
  "资产所有人/备查代号": "Cardholder",
  "卡号 / 充值券密钥": "Card / Voucher Number",
  "有效期/保质期": "Expiry",
  "辅助说明码": "Auxiliary Code",
  "常用登记所有人/姓名": "Registered Name",
  "关联绑定/申诉邮箱": "Recovery Email",
  "注册密保手机号": "Recovery Phone",
  "常用于配送 / 绑定物理地址": "Shipping / Bound Address",
  "安全备忘明细及备用字段": "Secure Notes & Extra Fields",
  "自定义字段": "Custom Fields",
  "已忽略的安全风险": "Security warning ignored",
  "检测到凭证安全隐患": "Security risk detected",
  "🔇 已手动将该条目的风险设为忽略，全库评分已恢复。": "🔇 Risk manually ignored for this item. Vault score restored.",
  "当前密码字符复杂度较低，极易遭受穷举破译。": "The password is too simple and easily brute-forced.",
  "当前密码极易猜测且在公开泄漏凭证中极度高危。": "This password is guessable and appears in public breach lists.",
  "恢复风险监控": "Restore monitoring",
  "忽略此项警告": "Ignore this warning",
  "本地密码强度诊断度量": "Password Strength Assessment",
  "高热力学熵值保护，抵御超级计算机暴力破解。": "High entropy — resistant to brute-force attacks.",
  "基本符合安全合规，但建议加入特殊符号强化。": "Acceptable, but consider adding special characters.",
  "警告：密码强度极低，且检测到重复关联，极易遭受撞库。": "Warning: very weak and reused — highly vulnerable to credential stuffing.",
  "高安全级": "Strong",
  "中等合规": "Medium",
  "高危建议重设": "Weak — Reset",
  "军工级零知识端到端加密防护": "Military-grade zero-knowledge encryption",
  "此保险箱受 AES-256-GCM 算法保护。密钥不落盘、不离港、绝不传输。": "Protected by AES-256-GCM. Keys never touch disk and are never transmitted.",
  "取消星标": "Remove from favorites",
  "加入星标": "Add to favorites",
  "两步验证码": "2FA Code",
  "两步验证码 (TOTP)": "2FA Code (TOTP)",
  "复制": "Copy",
  "验证码": "Code",
  "持卡人": "Cardholder",
  "卡号": "Card number",
  "邮箱": "Email",
  "手机": "Phone",
  "地址": "Address",
  "用户名": "Username",

  // ============ SecurityAudit（审计）============
  "保险箱本地多维安全审计智库": "Multi-Dimension Security Audit",
  "依据零知识协议进行本地哈希指纹对齐与热力学熵值解算": "Local hash fingerprinting and entropy analysis, zero-knowledge",
  "准备执行全库深度密码防泄漏审计": "Ready for Full Vault Security Audit",
  "通过分析密码特征库、熵值解算、以及哈希前缀的本地 K-Anonymity 安全数据库进行多级审计。":
    "Multi-level audit via password pattern analysis, entropy calculation and local k-anonymity breach database.",
  "1. 弱密码检测": "1. Weak Password Detection",
  "计算 Shannon 物理熵，精准拦截低熵值破译凭证。": "Shannon entropy scoring catches low-entropy credentials.",
  "2. 密码复用碰撞": "2. Password Reuse Collision",
  "检索本地数据库对齐指纹，筛查一密多用等撞库风险条目。": "Finds passwords reused across multiple services.",
  "3. 已泄漏特征碰撞": "3. Breach Signature Match",
  "多重对齐公共泄露数据库，精准定位高危泄露账户凭证。": "Matches against public breach databases to find exposed credentials.",
  "开启一键全库深度安全审计": "Start Full Vault Audit",
  "正在执行本地安全审计...": "Running local security audit...",
  "基于密码强度、复用检测和熵值分析进行诊断": "Analyzing strength, reuse and entropy",
  "密码库评分": "Vault Score",
  "密文健康度：极为安全": "Vault health: Excellent",
  "密文健康度：存在隐患": "Vault health: At risk",
  "密文健康度：极其危险": "Vault health: Dangerous",
  "全库诊断摘要统计": "Vault Summary",
  "本地总资产条目": "Total Items",
  "弱密码条目": "Weak Passwords",
  "复用漏洞条目": "Reused Passwords",
  "到期/过期条目": "Expired Items",
  "※ 本报告根据本地沙盒密码交叉解算，无任何数据上传。": "※ Computed locally in the sandbox — no data is uploaded.",
  "✨ 表现优秀！本地数据库中所有密码条目皆符合高强度标准。": "✨ Excellent! All passwords meet high-strength standards.",
  "✨ 表现极佳！本地库中无密码重合交叉，有效防范撞库风险。": "✨ Great! No reused passwords found — credential stuffing risk is low.",
  "✨ 表现合规！未碰撞到已公开泄漏的密码学特征备份。": "✨ Compliant! No matches in publicly leaked credential databases.",
  "高危": "High Risk",
  "未知": "Unknown",
  "⚠️ 重合条目: ": "⚠️ Also used by: ",
  "高危已泄漏": "Breached",
  "一键安全修补": "Auto-Fix",
  "派生独立密钥": "Generate New",
  "紧急一键安全重构": "Regenerate Now",
  "⚠️ 通用密码在 HIBP 本地备份集碰撞中已曝光": "⚠️ Found in the local HIBP breach dataset",
  "恢复安全监控": "Restore monitoring",
  "高危弱密码": "Weak",
  "交叉重复复用": "Reused",
  "个": "",

  // ============ PasswordGenerator ============
  "高性能随机密码与安全短语发生器": "Password & Passphrase Generator",
  "采用客户端高熵安全随机数生成，提供高可读性短语模式与全规则密码模式":
    "Client-side high-entropy generation — readable passphrase mode and full-rule password mode",
  "安全随机字符密码": "Random Password",
  "易记安全短语 (Passphrase)": "Memorable Passphrase",
  "生成参数配置": "Configuration",
  "极其安全": "Very Strong",
  "安全合规": "Strong",
  "强度偏低": "Weak",
  "包含小写字母 (a-z)": "Lowercase (a-z)",
  "包含大写字母 (A-Z)": "Uppercase (A-Z)",
  "包含数字成员 (0-9)": "Digits (0-9)",
  "包含特殊符号 (!@#)": "Symbols (!@#)",
  "排除易混淆字 (l, 1, O, 0)": "Exclude ambiguous (l, 1, O, 0)",
  "极其易记安全": "Very Strong",
  "合规高抗撞": "Strong",
  "较弱": "Weak",
  "自定义短语分隔符": "Word Separator",
  "如: - . _": "e.g. - . _",
  "每个单词首字母大写": "Capitalize Each Word",
  "在尾部追加随机数字": "Append Random Number",
  "生成结果 & 安全评估": "Result & Assessment",
  "请选择参数派生": "Configure options to generate",
  "热力学物理熵: ": "Entropy: ",
  "估计破译耗时: ": "Crack time: ",
  "3500 万年 (极高)": "35 million years (Extreme)",
  "120 年 (中等)": "120 years (Medium)",
  "28 小时 (易爆破)": "28 hours (Weak)",
  "强烈推荐使用 16 位以上密码，或者 5 个单词以上的易记安全短语 (Passphrase)，以抵御社会工程拖库爆破。":
    "Recommended: 16+ character passwords, or 5+ word passphrases, to resist cracking.",
  "生成密码历史流缓存": "Generation History",
  "暂无生成记录，点击复制密码后会自动存入缓存": "No history yet — copied passwords are saved here automatically",

  // ============ DatePicker ============
  "选择到期日期": "Select expiry date",
  "清除日期": "Clear date",
  "上一步": "Previous",
  "下一步": "Next",
  "选择月份": "Select month",
  "选择年份": "Select year",
  "今天": "Today",

  // ============ BrowserExtensionHub（扩展中心）============
  "📦 已成功生成并打包下载 Manifest V3 扩展 ZIP 包！": "📦 Manifest V3 extension ZIP packaged and downloaded!",
  "❌ 生成扩展压缩包失败，请重试！": "❌ Failed to package extension, please retry",
  "⚠️ 保险箱未解锁，无法获取加密同步数据": "⚠️ Vault is locked — cannot get sync payload",
  "📋 已复制扩展同步数据密文，可在扩展中粘贴一键同步！": "📋 Sync payload copied — paste it in the extension to sync",
  "⚠️ 请输入模拟密码！": "⚠️ Please enter a password",
  "🔑 模拟复制密码成功！": "🔑 Simulated password copied!",
  "浏览器扩展": "Browser Extension",
  "Manifest V3 零知识无痕自动填充架构": "Manifest V3 Zero-Knowledge Autofill",
  "SecureVault 跨浏览器扩展程序": "SecureVault Browser Extension",
  "打包生成的扩展内嵌桌面端加密备份数据，无需打开 Web 主应用。安装后输入主密码，通过轻量级扩展即可离线解锁、一键填充凭证。支持 Argon2id / PBKDF2 双 KDF 本地零知识解密，解锁一次即可在整个浏览器会话中免输入（关闭浏览器自动清除），数据绝不联网、绝不上传。":
    "The packaged extension embeds your encrypted vault data — no need to open the desktop app. Enter your master password once to unlock and autofill credentials offline. Supports Argon2id / PBKDF2 zero-knowledge decryption. Unlock once per browser session (cleared automatically on close). Your data never leaves your device.",
  "正在打包生成扩展...": "Packaging extension...",
  "打包下载浏览器扩展 (.zip)": "Download Extension (.zip)",
  "密文已复制": "Copied",
  "复制扩展同步密文": "Copy Sync Payload",
  "扩展交互在线模拟器": "Extension Live Simulator",
  "实时体验扩展 Popup 的域名精准匹配与无痕自动填充效果": "Preview domain matching and autofill of the extension popup",
  "测试网址, 如 github.com, google.com": "Test a site, e.g. github.com",
  "当前网页": "Current site",
  "锁定": "Lock",
  "解密 SecureVault 保险箱": "Unlock SecureVault Vault",
  "本地派生解密凭证数据": "Decrypt credentials locally",
  "输入主解密密码...": "Enter master password...",
  "解锁扩展保险箱": "Unlock Extension",
  "📍 当前域名匹配": "📍 Domain Match",
  "未设定账号": "No username",
  "一键填充": "Autofill",
  "未在该域名检测到已匹配的常规凭证": "No matching credentials for this domain",
  "🔍 检索所有账号...": "🔍 Search all accounts...",
  "填充": "Fill",
  "Manifest V3 架构四大核心优势": "Why Manifest V3",
  "零知识本地派生": "Zero-Knowledge, Local",
  "主密码仅在扩展内存参与 PBKDF2 解密 + AES-GCM，数据不上报任何服务器。":
    "Your master password never leaves extension memory. Decryption uses PBKDF2 + AES-GCM — nothing is reported to any server.",
  "智能域名精准匹配": "Smart Domain Matching",
  "自动获取当前标签页主域名，优先呈现该站点的关联凭证。": "Reads the active tab's domain and surfaces matching credentials first.",
  "防窃听无痕填充": "Eavesdrop-Proof Autofill",
  "通过 Content Script 沙箱隔离注入，有效隔离恶意页面 DOM 侦听。": "Sandboxed content-script injection isolates malicious page listeners.",
  "会话级免输入解锁": "Session-Level Unlock",
  "解锁一次，浏览器会话内填充无需再输主密码；关闭浏览器自动清除内存密钥。":
    "Unlock once — no re-entry during the browser session. Keys are wiped when the browser closes.",
  "全平台浏览器安装加载指南": "Browser Installation Guide",
  "选择您正在使用的浏览器，查看 1 分钟解压加载安装步骤": "Pick your browser — a 1-minute setup guide",
  "Firefox 火狐": "Firefox",
  "安卓手机 (Kiwi/Orion)": "Android (Kiwi/Orion)",
  "解压 ZIP 压缩包": "Unzip the package",
  "将下载的 SecureVault_Browser_Extension.zip 解压到本地任意文件夹。": "Extract SecureVault_Browser_Extension.zip to any folder.",
  "打开扩展管理页": "Open extension manager",
  "在地址栏输入 chrome://extensions/ (Edge 为 edge://extensions/ ) 并回车。": "Type chrome://extensions/ (edge://extensions/ on Edge) and press Enter.",
  "开启开发者模式": "Enable Developer mode",
  "在扩展管理页面右上角，开启「开发者模式」开关。": "Toggle “Developer mode” in the top-right corner.",
  "加载已解压扩展": "Load the extension",
  "点击「加载已解压的扩展程序」，选择解压出来的目录即可！": "Click “Load unpacked” and select the extracted folder.",
  "打开 about:debugging": "Open about:debugging",
  "在 Firefox 地址栏输入 about:debugging 并按回车。": "Type about:debugging in the address bar and press Enter.",
  "进入「此 Firefox」": "Open “This Firefox”",
  "点击左侧边栏的「此 Firefox」选项。": "Click “This Firefox” in the left sidebar.",
  "载入临时附加组件": "Load Temporary Add-on",
  "点击「载入临时附加组件…」，选择解压目录中的 manifest.json 文件即可！":
    "Click “Load Temporary Add-on…” and select manifest.json from the extracted folder.",
  "Safari 开发者转换模式": "Safari Developer Conversion",
  "Safari 使用 Apple Xcode 提供的 ": "Safari uses Apple's Xcode tool ",
  " 工具将 WebExtensions 转换为 Xcode 工程。轻量级 macOS 浏览器如 Orion 可直接以开发者模式一键加载解压目录。":
    " to convert WebExtensions into an Xcode project. Lightweight macOS browsers like Orion can load the extracted folder directly in developer mode.",
  "Kiwi Browser / Orion (Android 移动端扩展)": "Kiwi Browser / Orion (Android Extensions)",
  "在 Android 手机上安装 ": "Install ",
  "，在 Kiwi 中访问 ": " on your Android phone, open ",
  "，勾选开发者模式，点击「+ from .zip / .crx / .user.js」即可加载并体验一键无痕填充！":
    " in Kiwi, enable Developer mode, then tap “+ from .zip / .crx / .user.js” to load and enjoy one-tap autofill!",

  // ============ browserImport.ts（导入数据）============
  "未知网站": "Unknown site",
  "浏览器导入": "Browser Import",
  "1Password 导入": "1Password Import",
  "Safari 导入": "Safari Import",
  "LastPass 导入": "LastPass Import",
  "Bitwarden 导入": "Bitwarden Import",
  "KeePass 导入": "KeePass Import",
  "未命名条目": "Untitled Item",
  " (重复)": " (duplicate)",

  // ============ vaultStorage / useVault 错误消息 ============
  "保险箱文件格式无效：缺少 salt 分隔符": "Invalid vault file: missing salt separator",
  "保险箱文件格式无效：salt 或密文为空": "Invalid vault file: empty salt or ciphertext",
  "主密码长度至少需要 8 位以确保高强度加密！": "Master password must be at least 8 characters for strong encryption!",
  "🔑 正在初始化零知识本地加密协议...": "🔑 Initializing zero-knowledge encryption...",
  "⚙️ 正在生成用户专属高熵 Salt 物理字节...": "⚙️ Generating high-entropy salt...",
  "🧠 正在分配 64MB 锁页物理内存, 准备进行 Argon2id 迭代推导...": "🧠 Allocating 64MB hardened memory for Argon2id derivation...",
  "⚙️ 正在执行 PBKDF2-HMAC-SHA256 推导 (100,000次物理循环迭代)...": "⚙️ Running PBKDF2-HMAC-SHA256 derivation (100,000 iterations)...",
  "🛡️ 正在采用 AES-256-GCM 进行对称对齐...": "🛡️ Applying AES-256-GCM symmetric encryption...",
  "🔒 正在通过 Windows VirtualLock / macOS mlock 锁定密钥内存页...": "🔒 Locking key memory pages (VirtualLock / mlock)...",
  "✨ 本地保险箱初始化成功！已派生安全会话物理密钥。": "✨ Vault initialized! Session key derived.",
  "❌ 创建保险箱失败，请重试": "❌ Failed to create vault, please retry",
  "❌ 主密码不能为空！": "❌ Master password cannot be empty!",
  "🔓 正在读取本地加密 SQLite 扇区...": "🔓 Reading local encrypted data...",
  "🧠 正在载入 Argon2id (m=64MB, t=4, p=4) 高阻断抗暴力破解模块...": "🧠 Loading Argon2id (m=64MB, t=4, p=4)...",
  "⚙️ 正在拉伸 Master Key (PBKDF2-SHA256, 100,000次迭代)...": "⚙️ Stretching master key (PBKDF2-SHA256, 100,000 iterations)...",
  "🔑 已派生 256-bit AES 对称加解密密钥...": "🔑 256-bit AES key derived...",
  "⚡ 内存零知识解密成功，正在导入安全区...": "⚡ Decrypted! Loading into secure area...",
  "❌ 主密码错误或保险箱数据损坏，无法解锁！": "❌ Wrong master password or corrupted vault data!",
  "保险箱未初始化，无法修改主密码": "Vault not initialized — cannot change master password",
  "新主密码长度至少需要 8 位": "New master password must be at least 8 characters",
  "保险箱文件保存失败": "Failed to save vault file",
  "SecureVault 加密备份 — 受主密码保护，含 SHA-256 完整性校验。": "SecureVault encrypted backup — protected by master password, SHA-256 verified.",
  "保险箱未解锁，无法解密导入文件": "Vault is locked — cannot decrypt the import file",
  "备份文件完整性校验失败：数据可能已损坏或被篡改": "Backup integrity check failed: data may be corrupted or tampered with",
};

/** 翻译（非中文环境查英文表；未命中回退中文原文） */
export function t(zh: string): string {
  return isZh ? zh : (EN[zh] ?? zh);
}

/** 带插值的文案（拆开写，保持英语自然语序） */
export const tf = {
  /** 复制成功 toast */
  copied: (label: string) => isZh ? `✅ ${label}已成功复制到剪贴板！` : `✅ ${label} copied to clipboard!`,
  /** 自动锁定超时文案 */
  timeout: (minutes: number) =>
    minutes === 0 ? t("从不锁定")
      : minutes < 60 ? (isZh ? `${minutes} 分钟` : `${minutes} min`)
      : (isZh ? `${minutes / 60} 小时` : `${minutes / 60} h`),
  autoLockSet: (label: string) => isZh ? `🔒 自动锁定超时已设置为: ${label}` : `🔒 Auto-lock timeout set to: ${label}`,
  /** 文件夹操作 */
  folderCreated: (name: string) => isZh ? `📁 文件夹「${name}」创建成功！` : `📁 Folder “${name}” created!`,
  folderRenamed: (name: string) => isZh ? `📁 文件夹重命名为「${name}」成功！` : `📁 Folder renamed to “${name}”!`,
  folderDeleted: (name: string) => isZh ? `📁 文件夹「${name}」已安全删除。` : `📁 Folder “${name}” deleted.`,
  itemDeleted: (name: string) => isZh ? `🗑️ 密码条目「${name}」已从本地存储完全覆写粉碎并擦除！` : `🗑️ Credential “${name}” securely erased!`,
  itemTrashed: (name: string) => isZh ? `📥 密码条目「${name}」已移入回收站` : `📥 Credential “${name}” moved to Trash`,
  /** 导入导出 */
  fileReadFailed: (e: string) => isZh ? `❌ 文件读取失败: ${e}` : `❌ Failed to read file: ${e}`,
  csvParseError: (e: string) => isZh ? `❌ CSV 解析错误: ${e}` : `❌ CSV parse error: ${e}`,
  importFailed: (e: string) => isZh ? `❌ 导入失败: ${e}` : `❌ Import failed: ${e}`,
  exportFailed: (e: string) => isZh ? `❌ 导出失败: ${e}` : `❌ Export failed: ${e}`,
  browserImported: (n: number) => isZh ? `✅ 已导入 ${n} 条浏览器密码记录` : `✅ Imported ${n} browser password records`,
  /** 到期天数 */
  daysLeftShort: (d: number) => isZh ? `剩 ${d} 天` : `${d}d left`,
  daysLeftLong: (d: number) => isZh ? `剩 ${d} 天到期` : `${d} days left`,
  expiresOn: (date: string) => isZh ? `${date} 到期` : `Expires ${date}`,
  expiredOn: (date: string) => isZh ? `${date} 已过期` : `Expired ${date}`,
  /** 凭证详情页脚 */
  uuidFolder: (id: string, folder: string) => isZh ? `UUID: ${id} · 归属分类: ${folder}` : `UUID: ${id} · Folder: ${folder}`,
  lastModified: (ts: string) => isZh ? `最近修改：${ts}` : `Last modified: ${ts}`,
  lwwClock: (id: string) => isZh ? `逻辑时钟（LWW-Element-Set）：V1_${id}` : `LWW-Element-Set: V1_${id}`,
  /** 审计 */
  weakReuseCount: (n: number) => isZh ? `弱密码/复用计: ${n} 项` : `Weak/reused: ${n}`,
  auditCount: (n: number) => isZh ? `${n} 个` : `${n}`,
  weakAlertTitle: (n: number) => isZh ? `弱密码安全警报 (${n})` : `Weak Password Alerts (${n})`,
  reuseAlertTitle: (n: number) => isZh ? `一密多用/凭证交叉复用警报 (${n})` : `Password Reuse Alerts (${n})`,
  compromisedAlertTitle: (n: number) => isZh ? `已知公共数据库泄露痕迹匹配 (${n})` : `Breach Signature Matches (${n})`,
  ignoredTitle: (n: number) => isZh ? `已手动忽略的安全警报 (${n})` : `Manually Ignored Alerts (${n})`,
  reuseTimes: (n: number) => isZh ? `复用 ${n} 次` : `Reused ${n}×`,
  reuseDetail: (n: number) => isZh ? `此凭证密码与其它 ${n} 个不同服务条目完全重合。` : `This password is identical to ${n} other entries.`,
  weakDetail: (u: string, len: number) => isZh ? `用户名: ${u} | 当前长度: ${len} 位 | 推荐更换` : `Username: ${u} | Length: ${len} | Replace recommended`,
  reuseWarn: (n: number) => isZh ? `当前密码在本地库中存在 ${n} 次复用，易受一站撞库波及。` : `This password is reused ${n} times — vulnerable to credential stuffing.`,
  reuseTagPrefix: () => isZh ? "重合条目: " : "Also used by: ",
  diagState: (s: string) => isZh ? `诊断原状态: ${s} · 密文：••••••••` : `Diagnosis: ${s} · Ciphertext: ••••••••`,
  /** 密码生成器 */
  genLength: (n: number) => isZh ? `密码字符长度: ${n} 位` : `Length: ${n} chars`,
  passphraseWords: (n: number) => isZh ? `单词短语词量: ${n} 个单词` : `Words: ${n}`,
  /** 导入预览 */
  scrollMore: (n: number) => isZh ? `向下滚动加载更多（剩余 ${n} 条）` : `Scroll to load more (${n} remaining)`,
  confirmImport: (n: number) => isZh ? `确认导入 ${n} 条` : `Import ${n} Items`,
  dupNotice: (n: number) => isZh ? `检测到 ${n} 条可能与已有记录重复，导入前请确认策略。` : `${n} records may duplicate existing ones — choose a strategy.`,
  detectedFormat: (label: string) => isZh ? `检测到 ${label} 格式` : `${label} format detected`,
  /** KeePass 备注 */
  kdbxNote: (notes: string) => isZh ? `由 KeePass 导入\n${notes}` : `Imported from KeePass\n${notes}`,
  kdbxNoteEmpty: () => isZh ? "由 KeePass 导入" : "Imported from KeePass",
  /** 通用导入前缀：由 X 导入（可选备注） */
  importFrom: (label: string, note?: string) =>
    note ? (isZh ? `由 ${label} 导入\n${note}` : `Imported from ${label}\n${note}`)
         : (isZh ? `由 ${label} 导入` : `Imported from ${label}`),
  lastPassNote: (extra: string) =>
    isZh ? `由 LastPass 导入\n备注: ${extra}` : `Imported from LastPass\nNotes: ${extra}`,
  /** 扩展模拟器 toast */
  simFillSuccess: (title: string) => isZh ? `✨ 已成功将 ${title} 的账号密码填入页面！` : `✨ Filled ${title} into the page!`,
  simFillToast: (title: string) => isZh ? `✅ 模拟填充成功：${title}` : `✅ Simulated autofill: ${title}`,
  simFill: (title: string) => isZh ? `✨ 已成功填入 ${title}！` : `✨ Filled ${title}!`,
  /** 日历标题 */
  calTitle: (y: number, m: number) => isZh ? `${y}年${m}月` : `${MONTHS_FULL[m - 1]} ${y}`,
  calYearTitle: (y: number) => isZh ? `${y}年` : `${y}`,
};

/** 日历头部（周表头） */
export const WEEKDAYS: string[] = isZh
  ? ["日", "一", "二", "三", "四", "五", "六"]
  : ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

/** 月份选择器（短格式） */
export const MONTHS: string[] = isZh
  ? ["1月", "2月", "3月", "4月", "5月", "6月", "7月", "8月", "9月", "10月", "11月", "12月"]
  : ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** 月份全称（日期标题用） */
const MONTHS_FULL: string[] = ["January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"];

/** 语言感知的日期展示：2026-08-27 → 2026年8月27日 / Aug 27, 2026 */
export function formatDateLocalized(dateStr: string): string {
  if (!dateStr) return "";
  const [y, m, d] = dateStr.split("-");
  if (!y || !m || !d) return dateStr;
  return isZh
    ? `${Number(y)}年${Number(m)}月${Number(d)}日`
    : `${MONTHS[Number(m) - 1]} ${Number(d)}, ${y}`;
}
