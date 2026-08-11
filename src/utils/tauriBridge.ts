// Tauri Bridge — 封装 Rust 后端的密码学与存储命令
// 纯 Tauri 桌面应用，无 Web 回退逻辑
// Tauri v2 自动将 Rust 的 snake_case 参数转换为 camelCase 传递给 JS

import { invoke } from '@tauri-apps/api/core';

// ============================================================
// 核心密码学命令
// ============================================================

/** 密钥派生：支持 Argon2id (默认推荐) 和 PBKDF2-SHA256 */
export const deriveMasterKey = (password: string, saltB64: string, kdf?: "argon2id" | "pbkdf2"): Promise<string> => {
  return invoke<string>('derive_master_key', { password, saltB64, kdf });
};

/** AES-256-GCM 加密：使用派生密钥加密明文，返回 Base64(随机Nonce + 密文) */
export const encryptVault = (plaintext: string, keyB64: string): Promise<string> => {
  return invoke<string>('encrypt_vault', { plaintext, keyB64 });
};

/** AES-256-GCM 解密：使用派生密钥解密密文 */
export const decryptVault = (ciphertextB64: string, keyB64: string): Promise<string> => {
  return invoke<string>('decrypt_vault', { ciphertextB64, keyB64 });
};

// ============================================================
// 安全文件存储命令
// ============================================================

/** 将加密密文保存到系统应用数据目录 (Windows: %APPDATA%/SecureVault/vault.enc) */
export const saveSecureVaultFile = (ciphertextB64: string): Promise<void> => {
  return invoke<void>('save_vault_file', { ciphertextB64 });
};

/** 从系统应用数据目录读取加密密文，文件不存在时返回空字符串 */
export const loadSecureVaultFile = (): Promise<string> => {
  return invoke<string>('load_vault_file');
};

// ============================================================
// 辅助命令
// ============================================================

/** 计算字符串的 SHA-256 哈希（用于导出文件完整性校验） */
export const computeSha256 = (content: string): Promise<string> => {
  return invoke<string>('compute_sha256', { content });
};

// ============================================================
// KeePass KDBX 互操作命令
// ============================================================

/** 导出 KeePass KDBX 数据库（KDBX4 + Argon2id + AES-256-CBC），password 为 KDBX 独立密码 */
export const exportKdbx = (path: string, itemsJson: string, password: string): Promise<void> => {
  return invoke<void>('export_kdbx', { path, itemsJson, password });
};

/** 导入 KeePass KDBX 数据库，返回 JSON 字符串 { items: KdbxRawItem[], folders: string[] } */
export const importKdbx = (path: string, password: string): Promise<string> => {
  return invoke<string>('import_kdbx', { path, password });
};
