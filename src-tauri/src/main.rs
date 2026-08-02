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

// 7. 从用户指定的文件路径读取文本（用于导入备份）
#[tauri::command]
fn read_export_file(path: String) -> Result<String, String> {
    std::fs::read_to_string(&path)
        .map_err(|e| format!("读取导入文件失败: {}", e))
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
            write_binary_file
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
