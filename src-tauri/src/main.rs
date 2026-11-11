#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use aes_gcm::{
    aead::{Aead, KeyInit},
    Aes256Gcm, Nonce,
};
use argon2::{Argon2, Algorithm::Argon2id, Version, Params};
use base64::{engine::general_purpose::STANDARD as BASE64, Engine};
use pbkdf2::pbkdf2_hmac;
use sha2::Sha256;
use std::fs::{self, File};
use std::io::{Read, Write};
use std::path::{Path, PathBuf};
use tauri::{AppHandle, Manager};

// 1. 双算法密钥派生：支持 Argon2id (推荐) 和 PBKDF2-SHA256
//    kdf 参数: "argon2id" | "pbkdf2"（默认 "argon2id"）
#[tauri::command]
fn derive_master_key(password: String, salt_b64: String, kdf: Option<String>) -> Result<String, String> {
    let salt = BASE64.decode(salt_b64)
        .map_err(|e| format!("ERR_SALT_B64: {}", e))?;

    let mut key = [0u8; 32]; // 256-bit key

    match kdf.as_deref() {
        Some("pbkdf2") => {
            // PBKDF2-HMAC-SHA256: 100,000 次迭代
            pbkdf2_hmac::<Sha256>(
                password.as_bytes(),
                &salt,
                100_000,
                &mut key,
            );
        }
        _ => {
            // Argon2id (默认，推荐): 64MB 内存, 4 次迭代, 4 并行度
            let argon2 = Argon2::new(
                Argon2id,
                Version::V0x13,
                Params::new(65_536, 4, 4, Some(Params::DEFAULT_OUTPUT_LEN)).map_err(|e| format!("ERR_KDF: {}", e))?,
            );
            argon2.hash_password_into(password.as_bytes(), &salt, &mut key)
                .map_err(|e| format!("ERR_KDF: {}", e))?;
        }
    }

    Ok(BASE64.encode(key))
}

// 2. AES-256-GCM 硬件加速高安全级别加密
#[tauri::command]
fn encrypt_vault(plaintext: String, key_b64: String) -> Result<String, String> {
    let key_bytes = BASE64.decode(key_b64)
        .map_err(|e| format!("ERR_KEY_DECODE: {}", e))?;
        
    if key_bytes.len() != 32 {
        return Err("ERR_KEY_SIZE: must be 32 bytes (256-bit)".into());
    }
    
    let key = aes_gcm::Key::<Aes256Gcm>::from_slice(&key_bytes);
    let cipher = Aes256Gcm::new(key);
    
    // 生成随机 12-byte 随机数 (Nonce) 抵御重放与静态分析攻击
    use rand::RngCore;
    let mut nonce_bytes = [0u8; 12];
    rand::thread_rng().fill_bytes(&mut nonce_bytes);
    let nonce = Nonce::from_slice(&nonce_bytes);
    
    let ciphertext = cipher
        .encrypt(nonce, plaintext.as_bytes())
        .map_err(|e| format!("ERR_ENCRYPT: {}", e))?;
        
    // 将 12字节 Nonce 和 密文 拼接打包
    let mut packed = Vec::with_capacity(12 + ciphertext.len());
    packed.extend_from_slice(&nonce_bytes);
    packed.extend_from_slice(&ciphertext);
    
    Ok(BASE64.encode(packed))
}

// 3. AES-256-GCM 高安全级别解密
#[tauri::command]
fn decrypt_vault(ciphertext_b64: String, key_b64: String) -> Result<String, String> {
    let key_bytes = BASE64.decode(key_b64)
        .map_err(|e| format!("ERR_KEY_DECODE: {}", e))?;
        
    let packed_bytes = BASE64.decode(ciphertext_b64)
        .map_err(|e| format!("ERR_CIPHERTEXT_B64: {}", e))?;
        
    if key_bytes.len() != 32 {
        return Err("ERR_KEY_SIZE".into());
    }
    if packed_bytes.len() < 12 {
        return Err("ERR_CIPHERTEXT_SHORT".into());
    }
    
    let key = aes_gcm::Key::<Aes256Gcm>::from_slice(&key_bytes);
    let cipher = Aes256Gcm::new(key);
    
    // 拆分出 12 字节 nonce 和真正的密文
    let nonce_bytes = &packed_bytes[..12];
    let encrypted_data = &packed_bytes[12..];
    let nonce = Nonce::from_slice(nonce_bytes);
    
    let decrypted_bytes = cipher
        .decrypt(nonce, encrypted_data)
        .map_err(|e| format!("ERR_DECRYPT: {}", e))?;
        
    String::from_utf8(decrypted_bytes)
        .map_err(|e| format!("ERR_UTF8: {}", e))
}

// ---------- 数据目录配置 ----------
// 自定义数据目录持久化在 app_config_dir/config.json 的 dataDir 字段；
// 未配置时回退到系统 AppData（保持旧行为）。
// 该配置文件必须放在固定位置（不能放进数据目录本身），否则切换目录后无法找到配置。

fn config_file_path(app: &AppHandle) -> Result<PathBuf, String> {
    let mut path = app.path().app_config_dir()
        .map_err(|e| format!("ERR_CONFIG_DIR: {}", e))?;
    if !path.exists() {
        fs::create_dir_all(&path)
            .map_err(|e| format!("ERR_CONFIG_DIR: {}", e))?;
    }
    path.push("config.json");
    Ok(path)
}

fn read_config(app: &AppHandle) -> serde_json::Value {
    match config_file_path(app) {
        Ok(p) if p.exists() => std::fs::read_to_string(&p)
            .ok()
            .and_then(|s| serde_json::from_str(&s).ok())
            .unwrap_or_else(|| serde_json::json!({})),
        _ => serde_json::json!({}),
    }
}

// 获取本地系统安全的本地应用存档路径 (e.g. AppData/Roaming/SecureVault)
fn get_vault_path(app: &AppHandle) -> Result<PathBuf, String> {
    let dir = app.path().app_data_dir()
        .map_err(|e| format!("ERR_DATA_DIR_RESOLVE: {}", e))?;
    if !dir.exists() {
        fs::create_dir_all(&dir)
            .map_err(|e| format!("ERR_DATA_DIR_CREATE: {}", e))?;
    }
    Ok(dir.join("vault.enc"))
}

// 4. 原子写入：先写临时文件，成功后再原子重命名，防止写入中断导致数据损坏
#[tauri::command]
fn save_vault_file(app: AppHandle, ciphertext_b64: String) -> Result<(), String> {
    let file_path = get_vault_path(&app)?;
    let tmp_path = file_path.with_extension("enc.tmp");

    // 写入临时文件
    let mut file = File::create(&tmp_path)
        .map_err(|e| format!("ERR_TMP_CREATE: {}", e))?;
    file.write_all(ciphertext_b64.as_bytes())
        .map_err(|e| format!("ERR_TMP_WRITE: {}", e))?;
    file.flush()
        .map_err(|e| format!("ERR_FLUSH: {}", e))?;
    drop(file);

    // 原子替换前：按需轮转本地备份（尽力而为，失败不影响主保存）
    backup_vault_if_due(&app, &file_path, false);

    // 原子替换
    fs::rename(&tmp_path, &file_path)
        .map_err(|e| format!("ERR_RENAME: {}", e))?;

    Ok(())
}

// 5. 从本地沙盒存储中读取加密密文
#[tauri::command]
fn load_vault_file(app: AppHandle) -> Result<String, String> {
    let file_path = get_vault_path(&app)?;
    if !file_path.exists() {
        return Ok("".to_string()); // 文件不存在返回空
    }
    
    let mut file = File::open(file_path)
        .map_err(|e| format!("ERR_STORAGE_OPEN: {}", e))?;
        
    let mut contents = String::new();
    file.read_to_string(&mut contents)
        .map_err(|e| format!("ERR_STORAGE_READ: {}", e))?;
        
    Ok(contents)
}

// 6. 将文本写入用户指定的文件路径（用于导出备份）
#[tauri::command]
fn write_export_file(path: String, content: String) -> Result<(), String> {
    std::fs::write(&path, &content)
        .map_err(|e| format!("ERR_EXPORT_WRITE: {}", e))
}

// 7. 从用户指定的文件路径读取文本（用于导入备份，自动检测 UTF-8/GBK/UTF-16 编码）
#[tauri::command]
fn read_export_file(path: String) -> Result<String, String> {
    let bytes = std::fs::read(&path)
        .map_err(|e| format!("ERR_IMPORT_READ: {}", e))?;

    // 1. 尝试 UTF-8
    if let Ok(s) = String::from_utf8(bytes.clone()) {
        return Ok(s);
    }

    // 2. 尝试 GBK（中文 Windows 系统编码）
    let (cow, _, had_errors) = encoding_rs::GBK.decode(&bytes);
    if !had_errors {
        return Ok(cow.into_owned());
    }

    // 3. 尝试 UTF-16 LE（Windows 默认 Unicode 编码）
    let (cow, _, had_errors) = encoding_rs::UTF_16LE.decode(&bytes);
    if !had_errors {
        return Ok(cow.into_owned());
    }

    // 4. 最终兜底：UTF-8 lossy
    Ok(String::from_utf8_lossy(&bytes).into_owned())
}

// 8. 计算字符串的 SHA-256 哈希（用于导出文件完整性校验）
#[tauri::command]
fn compute_sha256(content: String) -> String {
    use sha2::Digest;
    let mut hasher = sha2::Sha256::new();
    hasher.update(content.as_bytes());
    format!("{:x}", hasher.finalize())
}

// 9. 将 Base64 编码的二进制数据写入文件（用于导出浏览器扩展 ZIP）
#[tauri::command]
fn write_binary_file(path: String, data_b64: String) -> Result<(), String> {
    let bytes = BASE64.decode(data_b64)
        .map_err(|e| format!("ERR_B64_DECODE: {}", e))?;
    std::fs::write(&path, &bytes)
        .map_err(|e| format!("ERR_BIN_WRITE: {}", e))
}

/// TOTP 生成结果（Tauri 自动序列化为 JSON 对象传给前端）
#[derive(serde::Serialize)]
struct TotpResponse {
    code: String,
    remaining: u64,
}

/// URL 百分号编码（用于 otpauth label，处理中文与 URI 保留字符）
fn url_encode(s: &str) -> String {
    s.bytes()
        .map(|b| {
            if b.is_ascii_alphanumeric() || matches!(b, b'-' | b'_' | b'.' | b'~') {
                (b as char).to_string()
            } else {
                format!("%{:02X}", b)
            }
        })
        .collect()
}

/// Base32 密钥归一化：去空格/连字符/padding、转大写（兼容各站点展示格式）
fn normalize_totp_secret(secret: &str) -> String {
    secret
        .trim()
        .to_uppercase()
        .replace([' ', '-', '\t'], "")
        .trim_end_matches('=')
        .to_string()
}

// 10. 生成 TOTP 两步验证码（RFC 6238 标准，Base32 密钥，30 秒周期 6 位码）
#[tauri::command]
fn generate_totp(secret: String) -> Result<TotpResponse, String> {
    use totp_rs::{Algorithm, Secret, TOTP};

    let normalized = normalize_totp_secret(&secret);
    if normalized.is_empty() {
        return Err("ERR_TOTP_EMPTY".to_string());
    }
    let secret = Secret::Encoded(normalized);
    let bytes = secret.to_bytes()
        .map_err(|e| format!("ERR_TOTP_KEY: {}", e))?;
    // totp-rs 的 TOTP::new 强制要求密钥 ≥128 bits，但 GitHub/GitLab 等服务使用
    // 80 bits（16 字符）密钥，Google Authenticator 等主流验证器均接受，
    // 故使用 new_unchecked 跳过长度限制（Base32 合法性校验仍在上方保留）
    let totp = TOTP::new_unchecked(Algorithm::SHA1, 6, 0, 30, bytes);
    let code = totp.generate_current().map_err(|e| format!("ERR_TOTP_GEN: {}", e))?;
    let remaining = totp.ttl().unwrap_or(0);

    Ok(TotpResponse { code, remaining })
}

// 11. 导出 KeePass KDBX 数据库文件（KDBX4 + Argon2id + AES-256-CBC + GZip）
//     凭证数据由前端传入（已解密的 vault items JSON），KDBX 使用用户指定的独立密码
/// 解析 ISO / 常见时间字符串为 NaiveDateTime
/// 支持 "2026-10-11T12:34:56.789Z"、"2026-10-11T12:34:56"、"2026-10-11T12:34" 等
fn parse_iso_dt(s: &str) -> Option<chrono::NaiveDateTime> {
    if s.is_empty() {
        return None;
    }
    let core = if s.len() >= 19 { &s[..19] } else { s };
    chrono::NaiveDateTime::parse_from_str(core, "%Y-%m-%dT%H:%M:%S")
        .or_else(|_| chrono::NaiveDateTime::parse_from_str(core, "%Y-%m-%dT%H:%M"))
        .ok()
}

#[tauri::command]
fn export_kdbx(path: String, items_json: String, password: String) -> Result<(), String> {
    use keepass::config::{DatabaseConfig, DatabaseVersion, KdfConfig};
    use keepass::db::{Database, Entry, Group, History, Value};
    use keepass::DatabaseKey;
    use secstr::SecStr;

    let data: serde_json::Value = serde_json::from_str(&items_json)
        .map_err(|e| format!("ERR_CRED_PARSE: {}", e))?;
    let items = data.get("items").and_then(|v| v.as_array()).cloned().unwrap_or_default();

    let mut config = DatabaseConfig::default();
    config.version = DatabaseVersion::KDB4(1);
    // Argon2id: 与 SecureVault 主加密栈同参数 (64 MiB / 4 轮 / 4 并行)
    // version 类型来自 rust-argon2（keepass 内部依赖，lib 名同为 argon2，不可直接依赖），
    // 通过匹配默认配置取得，避免同名 lib 冲突
    let default_version = match DatabaseConfig::default().kdf_config {
        KdfConfig::Argon2 { version, .. } | KdfConfig::Argon2id { version, .. } => version,
        KdfConfig::Aes { .. } => unreachable!("默认 KDF 为 Argon2"),
    };
    config.kdf_config = KdfConfig::Argon2id {
        iterations: 4,
        memory: 65_536, // KiB = 64 MiB
        parallelism: 4,
        version: default_version,
    };

    let mut db = Database::new(config);
    db.meta.database_name = Some("SecureVault 保险箱".to_string());

    let get_str = |item: &serde_json::Value, key: &str| -> String {
        item.get(key).and_then(|v| v.as_str()).unwrap_or("").to_string()
    };

    // 收集文件夹（保持出现顺序；回收站条目不导出，其文件夹也不收集）
    let mut folders: Vec<String> = Vec::new();
    for item in &items {
        if !get_str(item, "deletedAt").is_empty() { continue; }
        let f = get_str(item, "folder");
        let folder = if f.is_empty() { "KeePass 导出".to_string() } else { f };
        if !folders.contains(&folder) {
            folders.push(folder);
        }
    }

    for folder in folders {
        let mut group = Group::new(&folder);
        for item in &items {
            // 回收站条目不导出（保持 KeePass 数据库干净）
            if !get_str(item, "deletedAt").is_empty() { continue; }

            let f = get_str(item, "folder");
            let item_folder = if f.is_empty() { "KeePass 导出".to_string() } else { f };
            if item_folder != folder { continue; }

            let mut entry = Entry::new();
            entry.fields.insert("Title".into(), Value::Unprotected(get_str(item, "title")));
            entry.fields.insert("UserName".into(), Value::Unprotected(get_str(item, "username")));
            // 密码必须使用 Protected 内层加密存储
            entry.fields.insert("Password".into(), Value::Protected(SecStr::from(get_str(item, "password"))));
            entry.fields.insert("URL".into(), Value::Unprotected(get_str(item, "url")));
            entry.fields.insert("Notes".into(), Value::Unprotected(get_str(item, "notes")));

            let item_type = get_str(item, "type");
            if item_type == "card" {
                entry.fields.insert("卡号".into(), Value::Unprotected(get_str(item, "cardNumber")));
                entry.fields.insert("有效期".into(), Value::Unprotected(get_str(item, "cardExpiry")));
                entry.fields.insert("CVV".into(), Value::Unprotected(get_str(item, "cardCvv")));
            }
            if item.get("isFavorite").and_then(|v| v.as_bool()).unwrap_or(false) {
                entry.fields.insert("SecureVaultFavorite".into(), Value::Unprotected("1".into()));
            }
            // 自定义字段写回 KDBX custom fields（跳过标准字段，防止覆盖密码/标题等核心字段）
            const RESERVED: [&str; 10] = [
                "Title", "UserName", "Password", "URL", "Notes",
                "SecureVaultFavorite", "otp", "卡号", "有效期", "CVV",
            ];
            if let Some(custom) = item.get("customFields").and_then(|v| v.as_object()) {
                for (k, v) in custom {
                    if RESERVED.contains(&k.as_str()) {
                        continue;
                    }
                    if let Some(s) = v.as_str() {
                        entry.fields.insert(k.clone(), Value::Unprotected(s.to_string()));
                    }
                }
            }
            // TOTP 密钥 → KeePass 生态标准 otp 字段（otpauth:// 格式，label 需 URL 编码）
            let otp = normalize_totp_secret(&get_str(item, "otpSecret"));
            if !otp.is_empty() {
                let otp_url = format!(
                    "otpauth://totp/{}?secret={}&issuer=SecureVault",
                    url_encode(&get_str(item, "title")),
                    otp
                );
                entry.fields.insert("otp".into(), Value::Unprotected(otp_url));
            }
            // 到期日期 → KeePass 标准 ExpiryTime
            let expires = get_str(item, "expiresAt");
            if !expires.is_empty() {
                if let Ok(dt) = chrono::NaiveDateTime::parse_from_str(&format!("{}T00:00:00", expires), "%Y-%m-%dT%H:%M:%S") {
                    entry.times.expires = true;
                    entry.times.set_expiry(dt);
                }
            }
            // 密码历史 → KDBX history
            // keepass 的 add_entry 为头部插入，因此按「最旧→最新」依次 add，
            // 使 get_entries() 顺序与前端约定一致（最新在前）
            if let Some(hist) = item.get("passwordHistory").and_then(|v| v.as_array()) {
                if !hist.is_empty() {
                    let mut h = History::default();
                    for rec in hist.iter().rev() {
                        let pw = rec.get("password").and_then(|v| v.as_str()).unwrap_or("");
                        if pw.is_empty() { continue; }
                        let ts = rec.get("changedAt").and_then(|v| v.as_str()).unwrap_or("");
                        let mut old_entry = Entry::new();
                        old_entry.fields.insert("Title".into(), Value::Unprotected(get_str(item, "title")));
                        old_entry.fields.insert("UserName".into(), Value::Unprotected(get_str(item, "username")));
                        old_entry.fields.insert("Password".into(), Value::Protected(SecStr::from(pw)));
                        old_entry.fields.insert("URL".into(), Value::Unprotected(get_str(item, "url")));
                        old_entry.fields.insert("Notes".into(), Value::Unprotected(get_str(item, "notes")));
                        if let Some(dt) = parse_iso_dt(ts) {
                            old_entry.times.set_last_modification(dt);
                        }
                        h.add_entry(old_entry);
                    }
                    entry.history = Some(h);
                }
            }
            // 最近使用 → KeePass 标准 LastAccessTime
            if let Some(dt) = parse_iso_dt(&get_str(item, "lastUsedAt")) {
                entry.times.set_last_access(dt);
            }
            group.add_child(entry);
        }
        db.root.add_child(group);
    }

    let key = DatabaseKey::new().with_password(&password);
    let mut file = std::fs::File::create(&path)
        .map_err(|e| format!("ERR_KDBX_CREATE: {}", e))?;
    db.save(&mut file, key)
        .map_err(|e| format!("ERR_KDBX_SAVE: {}", e))?;

    Ok(())
}

// 11. 导入 KeePass KDBX 数据库文件
//     返回前端可解析的 JSON: { items: [...], folders: [...] }
#[tauri::command]
fn import_kdbx(path: String, password: String) -> Result<String, String> {
    use keepass::db::{Database, Group, Value};
    use keepass::DatabaseKey;
    use std::collections::BTreeSet;

    let key = DatabaseKey::new().with_password(&password);
    let mut file = std::fs::File::open(&path)
        .map_err(|e| format!("ERR_KDBX_OPEN: {}", e))?;
    let db = Database::open(&mut file, key)
        .map_err(|e| format!("ERR_KDBX_DECRYPT: {}", e))?;

    let mut items: Vec<serde_json::Value> = Vec::new();
    let mut folder_set: BTreeSet<String> = BTreeSet::new();

    fn get_field(fields: &std::collections::HashMap<String, Value>, key: &str) -> String {
        match fields.get(key) {
            Some(Value::Unprotected(s)) => s.clone(),
            Some(Value::Protected(b)) => String::from_utf8_lossy(b.unsecure()).into_owned(),
            Some(Value::Bytes(b)) => String::from_utf8_lossy(b).into_owned(),
            None => String::new(),
        }
    }

    fn walk(group: &Group, prefix: &str, items: &mut Vec<serde_json::Value>, folder_set: &mut BTreeSet<String>) {
        // 跳过根组 "Root"，其直接条目归入 "KeePass 导入"
        let is_root = prefix.is_empty() && group.name == "Root";
        let path = if is_root {
            String::new()
        } else if prefix.is_empty() {
            group.name.clone()
        } else {
            format!("{}/{}", prefix, group.name)
        };

        for entry in group.entries() {
            let fields = &entry.fields;
            // 收集自定义字段（排除标准字段），用于前端类型推断
            let custom: serde_json::Map<String, serde_json::Value> = fields.iter()
                .filter(|(k, _)| !["Title", "UserName", "Password", "URL", "Notes", "SecureVaultFavorite"].contains(&k.as_str()))
                .map(|(k, v)| {
                    let s = match v {
                        Value::Unprotected(s) => s.clone(),
                        Value::Protected(b) => String::from_utf8_lossy(b.unsecure()).into_owned(),
                        Value::Bytes(b) => String::from_utf8_lossy(b).into_owned(),
                    };
                    (k.clone(), serde_json::Value::String(s))
                })
                .collect();

            let folder = if path.is_empty() { "KeePass 导入".to_string() } else { path.clone() };
            folder_set.insert(folder.clone());

            // 到期日期（KeePass 标准 ExpiryTime）
            let expires_at = if entry.times.expires {
                entry.times.get_expiry()
                    .map(|dt| dt.format("%Y-%m-%d").to_string())
                    .unwrap_or_default()
            } else {
                String::new()
            };

            // 密码历史：读取 KDBX history（每条取 Password + 最后修改时间，最多 5 条）
            let mut pw_hist: Vec<serde_json::Value> = Vec::new();
            if let Some(h) = &entry.history {
                for he in h.get_entries() {
                    let pw = get_field(&he.fields, "Password");
                    if pw.is_empty() { continue; }
                    let ts = he.times.get_last_modification()
                        .map(|dt| dt.format("%Y-%m-%dT%H:%M:%SZ").to_string())
                        .unwrap_or_default();
                    pw_hist.push(serde_json::json!({ "password": pw, "changedAt": ts }));
                    if pw_hist.len() >= 5 { break; }
                }
            }
            // 最近使用：KeePass 标准 LastAccessTime
            let last_used = entry.times.get_last_access()
                .map(|dt| dt.format("%Y-%m-%dT%H:%M:%SZ").to_string())
                .unwrap_or_default();

            items.push(serde_json::json!({
                "title": get_field(fields, "Title"),
                "username": get_field(fields, "UserName"),
                "password": get_field(fields, "Password"),
                "url": get_field(fields, "URL"),
                "notes": get_field(fields, "Notes"),
                "folder": folder,
                "favorite": get_field(fields, "SecureVaultFavorite") == "1",
                "expiresAt": expires_at,
                "custom": serde_json::Value::Object(custom),
                "passwordHistory": pw_hist,
                "lastUsedAt": last_used,
            }));
        }

        for sub in group.groups() {
            walk(sub, &path, items, folder_set);
        }
    }

    walk(&db.root, "", &mut items, &mut folder_set);

    Ok(serde_json::json!({
        "items": items,
        "folders": folder_set.iter().cloned().collect::<Vec<_>>(),
    }).to_string())
}


// ============================================================
// 本地备份轮转（v1.8.0）
// 每次保存时若距上次备份 >= 10 分钟，把旧 vault 文件复制到 backups/，
// 保留最近 5 份；恢复某份备份前会强制备份当前文件。
// ============================================================

const BACKUP_INTERVAL_SECS: u64 = 10 * 60;
const BACKUP_KEEP: usize = 5;

fn backups_dir(app: &AppHandle) -> Result<PathBuf, String> {
    let dir = app.path().app_data_dir()
        .map_err(|e| format!("ERR_DATA_DIR_RESOLVE: {}", e))?;
    let b = dir.join("backups");
    if !b.exists() {
        fs::create_dir_all(&b).map_err(|e| format!("ERR_DATA_DIR_CREATE: {}", e))?;
    }
    Ok(b)
}

/// 轮转备份：force=false 时受 10 分钟间隔限制；force=true 立即备份。
fn backup_vault_if_due(app: &AppHandle, vault_path: &Path, force: bool) {
    if !vault_path.exists() {
        return;
    }
    let Ok(bdir) = backups_dir(app) else { return };

    if !force {
        let newest = fs::read_dir(&bdir).ok().and_then(|rd| {
            rd.filter_map(|e| e.ok())
                .filter_map(|e| e.metadata().ok().and_then(|m| m.modified().ok()))
                .max()
        });
        if let Some(t) = newest {
            if let Ok(elapsed) = std::time::SystemTime::now().duration_since(t) {
                if elapsed.as_secs() < BACKUP_INTERVAL_SECS {
                    return;
                }
            }
        }
    }

    let ts = chrono::Local::now().format("%Y%m%d-%H%M%S-%3f").to_string();
    let dest = bdir.join(format!("vault-{}.enc", ts));
    if fs::copy(vault_path, &dest).is_err() {
        return;
    }
    prune_backups(&bdir);
}

fn prune_backups(bdir: &Path) {
    if let Ok(rd) = fs::read_dir(bdir) {
        let mut entries: Vec<PathBuf> = rd
            .filter_map(|e| e.ok())
            .map(|e| e.path())
            .filter(|p| {
                p.file_name()
                    .and_then(|n| n.to_str())
                    .map(|n| n.starts_with("vault-") && n.ends_with(".enc"))
                    .unwrap_or(false)
            })
            .collect();
        entries.sort();
        while entries.len() > BACKUP_KEEP {
            let oldest = entries.remove(0);
            let _ = fs::remove_file(oldest);
        }
    }
}

#[derive(serde::Serialize)]
struct VaultBackupInfo {
    name: String,
    size: u64,
    /// 修改时间（Unix 秒，字符串便于前端直接使用）
    modified: Option<String>,
}

#[tauri::command]
fn list_vault_backups(app: AppHandle) -> Result<Vec<VaultBackupInfo>, String> {
    let bdir = backups_dir(&app)?;
    let mut out = Vec::new();
    if let Ok(rd) = fs::read_dir(&bdir) {
        for e in rd.flatten() {
            let name = e.file_name().to_string_lossy().into_owned();
            if !name.starts_with("vault-") || !name.ends_with(".enc") {
                continue;
            }
            let meta = e.metadata().ok();
            out.push(VaultBackupInfo {
                name,
                size: meta.as_ref().map(|m| m.len()).unwrap_or(0),
                modified: meta
                    .and_then(|m| m.modified().ok())
                    .and_then(|t| t.duration_since(std::time::UNIX_EPOCH).ok())
                    .map(|d| d.as_secs().to_string()),
            });
        }
    }
    out.sort_by(|a, b| b.name.cmp(&a.name)); // 最新在前
    Ok(out)
}

#[tauri::command]
fn restore_vault_backup(app: AppHandle, name: String) -> Result<(), String> {
    // 防路径穿越：仅允许 vault-*.enc 且不含路径分隔符
    if !name.starts_with("vault-")
        || !name.ends_with(".enc")
        || name.contains('/')
        || name.contains('\\')
        || name.contains("..")
    {
        return Err("ERR_BACKUP_NAME: 备份文件名无效".to_string());
    }
    let bdir = backups_dir(&app)?;
    let src = bdir.join(&name);
    if !src.exists() {
        return Err("ERR_BACKUP_NOT_FOUND: 备份文件不存在".to_string());
    }
    let vault_path = get_vault_path(&app)?;
    // 恢复前强制备份当前文件，避免误操作丢失最新数据
    backup_vault_if_due(&app, &vault_path, true);
    fs::copy(&src, &vault_path).map_err(|e| format!("ERR_MIGRATE: {}", e))?;
    Ok(())
}

// ============================================================
// WebDAV 应用内同步（v1.8.0，方案 B：密文上传，服务端零知识）
// 凭据以「主密钥加密后的密文」存入 config.json，不落明文。
// ============================================================

#[derive(serde::Serialize)]
struct WebDavStat {
    exists: bool,
    size: u64,
    last_modified: Option<String>,
    etag: Option<String>,
}

#[derive(serde::Serialize)]
struct WebDavDownload {
    content: String,
    stat: WebDavStat,
}

/// 仅允许 https://（本地开发测试允许 http://localhost / 127.0.0.1）
fn validate_webdav_url(url: &str) -> Result<(), String> {
    let u = url.trim();
    if u.is_empty() {
        return Err("ERR_WEBDAV_URL: 请填写服务器文件地址".to_string());
    }
    if u.starts_with("https://")
        || u.starts_with("http://localhost")
        || u.starts_with("http://127.0.0.1")
    {
        return Ok(());
    }
    Err("ERR_WEBDAV_URL: 仅支持 https:// 服务器地址（本地测试除外）".to_string())
}

fn webdav_client() -> Result<reqwest::Client, String> {
    reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(45))
        .build()
        .map_err(|e| format!("ERR_WEBDAV_CLIENT: {}", e))
}

fn etag_of(headers: &reqwest::header::HeaderMap) -> Option<String> {
    headers
        .get(reqwest::header::ETAG)
        .and_then(|v| v.to_str().ok())
        .map(|s| s.trim_matches('"').to_string())
}

fn last_modified_of(headers: &reqwest::header::HeaderMap) -> Option<String> {
    headers
        .get(reqwest::header::LAST_MODIFIED)
        .and_then(|v| v.to_str().ok())
        .map(|s| s.to_string())
}

fn map_webdav_status(code: u16, action: &str) -> String {
    if code == 401 || code == 403 {
        "ERR_WEBDAV_AUTH: 认证失败，请检查用户名与应用专用密码".to_string()
    } else {
        format!("ERR_WEBDAV_STATUS: {}失败，服务器返回 HTTP {}", action, code)
    }
}

#[tauri::command]
async fn webdav_test(url: String, username: String, password: String) -> Result<String, String> {
    validate_webdav_url(&url)?;
    let client = webdav_client()?;
    let resp = client
        .head(url.trim())
        .basic_auth(&username, Some(&password))
        .send()
        .await
        .map_err(|e| format!("ERR_WEBDAV_NET: {}", e))?;
    let code = resp.status().as_u16();
    match code {
        200..=299 => Ok(format!("HTTP {} · 文件已存在", code)),
        404 => Ok("HTTP 404 · 连接成功，服务器上尚无 vault.enc（首次同步将上传）".to_string()),
        401 | 403 => Err(map_webdav_status(code, "连接测试")),
        _ => Err(map_webdav_status(code, "连接测试")),
    }
}

#[tauri::command]
async fn webdav_stat(url: String, username: String, password: String) -> Result<WebDavStat, String> {
    validate_webdav_url(&url)?;
    let client = webdav_client()?;
    let resp = client
        .head(url.trim())
        .basic_auth(&username, Some(&password))
        .send()
        .await
        .map_err(|e| format!("ERR_WEBDAV_NET: {}", e))?;
    let code = resp.status().as_u16();
    if code == 404 {
        return Ok(WebDavStat { exists: false, size: 0, last_modified: None, etag: None });
    }
    if !(200..=299).contains(&code) {
        return Err(map_webdav_status(code, "读取服务器状态"));
    }
    Ok(WebDavStat {
        exists: true,
        size: resp.content_length().unwrap_or(0),
        last_modified: last_modified_of(resp.headers()),
        etag: etag_of(resp.headers()),
    })
}

#[tauri::command]
async fn webdav_upload(
    app: AppHandle,
    url: String,
    username: String,
    password: String,
) -> Result<WebDavStat, String> {
    validate_webdav_url(&url)?;
    let vault_path = get_vault_path(&app)?;
    if !vault_path.exists() {
        return Err("ERR_WEBDAV_EMPTY: 本地保险箱文件不存在，无法上传".to_string());
    }
    let content = std::fs::read_to_string(&vault_path)
        .map_err(|e| format!("ERR_STORAGE_READ: {}", e))?;

    let client = webdav_client()?;
    let resp = client
        .put(url.trim())
        .basic_auth(&username, Some(&password))
        .header(reqwest::header::CONTENT_TYPE, "text/plain; charset=utf-8")
        .body(content)
        .send()
        .await
        .map_err(|e| format!("ERR_WEBDAV_NET: {}", e))?;
    let code = resp.status().as_u16();
    if !(200..=299).contains(&code) {
        return Err(map_webdav_status(code, "上传"));
    }
    // 部分服务器 PUT 响应不含 ETag → 再 HEAD 一次取元数据
    let stat_resp = client
        .head(url.trim())
        .basic_auth(&username, Some(&password))
        .send()
        .await
        .map_err(|e| format!("ERR_WEBDAV_NET: {}", e))?;
    Ok(WebDavStat {
        exists: true,
        size: stat_resp.content_length().unwrap_or(0),
        last_modified: last_modified_of(stat_resp.headers()),
        etag: etag_of(stat_resp.headers()),
    })
}

#[tauri::command]
async fn webdav_download(
    url: String,
    username: String,
    password: String,
) -> Result<WebDavDownload, String> {
    validate_webdav_url(&url)?;
    let client = webdav_client()?;
    let resp = client
        .get(url.trim())
        .basic_auth(&username, Some(&password))
        .send()
        .await
        .map_err(|e| format!("ERR_WEBDAV_NET: {}", e))?;
    let code = resp.status().as_u16();
    if code == 404 {
        return Err("ERR_WEBDAV_NOT_FOUND: 服务器上不存在 vault.enc".to_string());
    }
    if !(200..=299).contains(&code) {
        return Err(map_webdav_status(code, "下载"));
    }
    let stat = WebDavStat {
        exists: true,
        size: resp.content_length().unwrap_or(0),
        last_modified: last_modified_of(resp.headers()),
        etag: etag_of(resp.headers()),
    };
    let content = resp.text().await.map_err(|e| format!("ERR_WEBDAV_READ: {}", e))?;
    Ok(WebDavDownload { content, stat })
}

// ---------- WebDAV 配置（config.json） ----------

#[tauri::command]
fn get_webdav_config(app: AppHandle) -> Result<Option<serde_json::Value>, String> {
    Ok(read_config(&app).get("webdav").cloned())
}

#[tauri::command]
fn save_webdav_config(
    app: AppHandle,
    url: String,
    username: String,
    password_enc: String,
) -> Result<(), String> {
    validate_webdav_url(&url)?;
    let cfg_path = config_file_path(&app)?;
    let mut cfg = read_config(&app);
    cfg["webdav"] = serde_json::json!({
        "url": url.trim(),
        "username": username,
        "passwordEnc": password_enc,
    });
    let serialized = serde_json::to_string_pretty(&cfg)
        .map_err(|e| format!("ERR_CONFIG_SERIALIZE: {}", e))?;
    fs::write(&cfg_path, serialized).map_err(|e| format!("ERR_CONFIG_WRITE: {}", e))?;
    Ok(())
}

#[tauri::command]
fn clear_webdav_config(app: AppHandle) -> Result<(), String> {
    let cfg_path = config_file_path(&app)?;
    let mut cfg = read_config(&app);
    if let Some(obj) = cfg.as_object_mut() {
        obj.remove("webdav");
    }
    let serialized = serde_json::to_string_pretty(&cfg)
        .map_err(|e| format!("ERR_CONFIG_SERIALIZE: {}", e))?;
    fs::write(&cfg_path, serialized).map_err(|e| format!("ERR_CONFIG_WRITE: {}", e))?;
    Ok(())
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_process::init())
        .setup(|app| {
            let window = app.get_webview_window("main").unwrap();
            window.show().unwrap();
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            derive_master_key,
            encrypt_vault,
            decrypt_vault,
            save_vault_file,
            load_vault_file,
            list_vault_backups,
            restore_vault_backup,
            webdav_test,
            webdav_stat,
            webdav_upload,
            webdav_download,
            get_webdav_config,
            save_webdav_config,
            clear_webdav_config,
            write_export_file,
            read_export_file,
            compute_sha256,
            write_binary_file,
            generate_totp,
            export_kdbx,
            import_kdbx
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_normalize_totp_secret() {
        // 小写 → 大写
        assert_eq!(normalize_totp_secret("gezdgnbvgy3tqojq"), "GEZDGNBVGY3TQOJQ");
        // 空格分组 → 去除
        assert_eq!(normalize_totp_secret("GEZD GNBV GY3T"), "GEZDGNBVGY3T");
        // 连字符分组 → 去除
        assert_eq!(normalize_totp_secret("GEZD-GNBV-GY3T"), "GEZDGNBVGY3T");
        // padding → 去除
        assert_eq!(normalize_totp_secret("GEZDGNBVGY3T===="), "GEZDGNBVGY3T");
        // 混合 + 首尾空白
        assert_eq!(normalize_totp_secret("  gezd gnbv  "), "GEZDGNBV");
    }

    #[test]
    fn test_generate_totp_variants_same_code() {
        // RFC 6238 测试密钥的三种展示形式，归一化后应生成相同的验证码
        let variants = [
            "GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ",
            "gezdgnbvgy3tqojqgezdgnbvgy3tqojq",
            "GEZD GNBV GY3T QOJQ GEZD GNBV GY3T QOJQ",
        ];
        let codes: Vec<String> = variants
            .iter()
            .map(|s| generate_totp(s.to_string()).expect("有效密钥应生成成功").code)
            .collect();
        assert_eq!(codes[0], codes[1], "小写密钥应与大写生成相同验证码");
        assert_eq!(codes[1], codes[2], "空格分组密钥应与标准格式生成相同验证码");
    }

    #[test]
    fn test_generate_totp_invalid_input() {
        assert!(generate_totp("".to_string()).is_err(), "空密钥应报错");
        assert!(generate_totp("!!!not-base32!!!".to_string()).is_err(), "非法字符应报错");
    }

    #[test]
    fn test_generate_totp_80bit_secret() {
        // GitHub/GitLab 等站点使用 16 字符（80 bits）密钥——必须支持
        // 此前 TOTP::new 的长度校验会误报"80 bits is not enough"
        let result = generate_totp("MFRGGZDFMZTWQ2LK".to_string());
        assert!(result.is_ok(), "80-bit 密钥（16 字符）应能正常生成验证码: {:?}", result.err());
        let r = result.unwrap();
        assert_eq!(r.code.len(), 6, "验证码应为 6 位");
        assert!(r.code.chars().all(|c| c.is_ascii_digit()), "验证码应全为数字");
    }

    #[test]
    fn test_generate_totp_80bit_known_vector() {
        // 固定向量：密钥 MFRGGZDFMZTWQ2LK（80 bits），t=1700000000
        // 期望值由 Python 独立实现（HMAC-SHA1 + RFC 6238 动态截断）计算得出
        let key = "MFRGGZDFMZTWQ2LK";
        let bytes = totp_rs::Secret::Encoded(key.to_string()).to_bytes().unwrap();
        let totp = totp_rs::TOTP::new_unchecked(totp_rs::Algorithm::SHA1, 6, 0, 30, bytes);
        assert_eq!(totp.generate(1_700_000_000), "882247");
    }

    #[test]
    fn test_url_encode() {
        assert_eq!(url_encode("GitHub"), "GitHub");
        assert_eq!(url_encode("a b"), "a%20b");
        assert_eq!(url_encode("工资卡?备用"), "%E5%B7%A5%E8%B5%84%E5%8D%A1%3F%E5%A4%87%E7%94%A8");
    }
}
