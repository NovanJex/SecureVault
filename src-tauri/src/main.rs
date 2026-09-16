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
use std::path::PathBuf;
use tauri::{AppHandle, Manager};

// 1. 双算法密钥派生：支持 Argon2id (推荐) 和 PBKDF2-SHA256
//    kdf 参数: "argon2id" | "pbkdf2"（默认 "argon2id"）
#[tauri::command]
fn derive_master_key(password: String, salt_b64: String, kdf: Option<String>) -> Result<String, String> {
    let salt = BASE64.decode(salt_b64)
        .map_err(|e| format!("Salt Base64 解码失败: {}", e))?;

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
                Params::new(65_536, 4, 4, Some(Params::DEFAULT_OUTPUT_LEN)).map_err(|e| e.to_string())?,
            );
            argon2.hash_password_into(password.as_bytes(), &salt, &mut key)
                .map_err(|e| format!("Argon2id 派生失败: {}", e))?;
        }
    }

    Ok(BASE64.encode(key))
}

// 2. AES-256-GCM 硬件加速高安全级别加密
#[tauri::command]
fn encrypt_vault(plaintext: String, key_b64: String) -> Result<String, String> {
    let key_bytes = BASE64.decode(key_b64)
        .map_err(|e| format!("Key decode failed: {}", e))?;
        
    if key_bytes.len() != 32 {
        return Err("Invalid key size, must be 32 bytes (256-bit)".into());
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
        .map_err(|e| format!("Encryption failed: {}", e))?;
        
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
        .map_err(|e| format!("Key decode failed: {}", e))?;
        
    let packed_bytes = BASE64.decode(ciphertext_b64)
        .map_err(|e| format!("Ciphertext decode failed: {}", e))?;
        
    if key_bytes.len() != 32 {
        return Err("Invalid key size".into());
    }
    if packed_bytes.len() < 12 {
        return Err("Ciphertext too short, missing nonce".into());
    }
    
    let key = aes_gcm::Key::<Aes256Gcm>::from_slice(&key_bytes);
    let cipher = Aes256Gcm::new(key);
    
    // 拆分出 12 字节 nonce 和真正的密文
    let nonce_bytes = &packed_bytes[..12];
    let encrypted_data = &packed_bytes[12..];
    let nonce = Nonce::from_slice(nonce_bytes);
    
    let decrypted_bytes = cipher
        .decrypt(nonce, encrypted_data)
        .map_err(|e| format!("Decryption failed (maybe wrong master password?): {}", e))?;
        
    String::from_utf8(decrypted_bytes)
        .map_err(|e| format!("Invalid UTF-8 string: {}", e))
}

// 获取本地系统安全的本地应用存档路径 (e.g. AppData/Roaming/SecureVault)
fn get_vault_path(app: &AppHandle) -> Result<PathBuf, String> {
    let mut path = app.path().app_data_dir()
        .map_err(|e| format!("Failed to resolve app data directory: {}", e))?;
    
    // 创建数据文件夹如果不存在
    if !path.exists() {
        fs::create_dir_all(&path)
            .map_err(|e| format!("Failed to create data directory: {}", e))?;
    }
    
    path.push("vault.enc");
    Ok(path)
}

// 4. 原子写入：先写临时文件，成功后再原子重命名，防止写入中断导致数据损坏
#[tauri::command]
fn save_vault_file(app: AppHandle, ciphertext_b64: String) -> Result<(), String> {
    let file_path = get_vault_path(&app)?;
    let tmp_path = file_path.with_extension("enc.tmp");

    // 写入临时文件
    let mut file = File::create(&tmp_path)
        .map_err(|e| format!("创建临时文件失败: {}", e))?;
    file.write_all(ciphertext_b64.as_bytes())
        .map_err(|e| format!("写入临时文件失败: {}", e))?;
    file.flush()
        .map_err(|e| format!("刷新缓冲区失败: {}", e))?;
    drop(file);

    // 原子替换
    fs::rename(&tmp_path, &file_path)
        .map_err(|e| format!("原子替换文件失败: {}", e))?;

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
        .map_err(|e| format!("Failed to open storage file: {}", e))?;
        
    let mut contents = String::new();
    file.read_to_string(&mut contents)
        .map_err(|e| format!("Failed to read storage file: {}", e))?;
        
    Ok(contents)
}

// 6. 将文本写入用户指定的文件路径（用于导出备份）
#[tauri::command]
fn write_export_file(path: String, content: String) -> Result<(), String> {
    std::fs::write(&path, &content)
        .map_err(|e| format!("写入导出文件失败: {}", e))
}

// 7. 从用户指定的文件路径读取文本（用于导入备份，自动检测 UTF-8/GBK/UTF-16 编码）
#[tauri::command]
fn read_export_file(path: String) -> Result<String, String> {
    let bytes = std::fs::read(&path)
        .map_err(|e| format!("读取导入文件失败: {}", e))?;

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
        .map_err(|e| format!("Base64 解码失败: {}", e))?;
    std::fs::write(&path, &bytes)
        .map_err(|e| format!("写入二进制文件失败: {}", e))
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
        return Err("TOTP 密钥为空".to_string());
    }
    let secret = Secret::Encoded(normalized);
    let bytes = secret.to_bytes()
        .map_err(|e| format!("TOTP 密钥无效（应为 Base32 编码）: {}", e))?;
    // totp-rs 的 TOTP::new 强制要求密钥 ≥128 bits，但 GitHub/GitLab 等服务使用
    // 80 bits（16 字符）密钥，Google Authenticator 等主流验证器均接受，
    // 故使用 new_unchecked 跳过长度限制（Base32 合法性校验仍在上方保留）
    let totp = TOTP::new_unchecked(Algorithm::SHA1, 6, 0, 30, bytes);
    let code = totp.generate_current().map_err(|e| e.to_string())?;
    let remaining = totp.ttl().unwrap_or(0);

    Ok(TotpResponse { code, remaining })
}

// 11. 导出 KeePass KDBX 数据库文件（KDBX4 + Argon2id + AES-256-CBC + GZip）
//     凭证数据由前端传入（已解密的 vault items JSON），KDBX 使用用户指定的独立密码
#[tauri::command]
fn export_kdbx(path: String, items_json: String, password: String) -> Result<(), String> {
    use keepass::config::{DatabaseConfig, DatabaseVersion, KdfConfig};
    use keepass::db::{Database, Entry, Group, Value};
    use keepass::DatabaseKey;
    use secstr::SecStr;

    let data: serde_json::Value = serde_json::from_str(&items_json)
        .map_err(|e| format!("凭证数据解析失败: {}", e))?;
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

    // 收集文件夹（保持出现顺序）
    let mut folders: Vec<String> = Vec::new();
    for item in &items {
        let f = get_str(item, "folder");
        let folder = if f.is_empty() { "KeePass 导出".to_string() } else { f };
        if !folders.contains(&folder) {
            folders.push(folder);
        }
    }

    for folder in folders {
        let mut group = Group::new(&folder);
        for item in &items {
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
            group.add_child(entry);
        }
        db.root.add_child(group);
    }

    let key = DatabaseKey::new().with_password(&password);
    let mut file = std::fs::File::create(&path)
        .map_err(|e| format!("创建 KDBX 文件失败: {}", e))?;
    db.save(&mut file, key)
        .map_err(|e| format!("KDBX 保存失败: {}", e))?;

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
        .map_err(|e| format!("打开 KDBX 文件失败: {}", e))?;
    let db = Database::open(&mut file, key)
        .map_err(|e| format!("KDBX 解密失败（请检查密码是否正确）: {}", e))?;

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

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_shell::init())
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
