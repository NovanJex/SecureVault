// vaultStorage.ts — 保险箱数据的加密存储与恢复
// 调用 Rust 后端进行 PBKDF2 派生 + AES-256-GCM 加解密

import { deriveMasterKey, encryptVault, decryptVault, saveSecureVaultFile, loadSecureVaultFile } from './tauriBridge';
import { t } from '../i18n';
import type { VaultItem, VaultFolder } from '../types';

// ============================================================
// 类型定义
// ============================================================

export interface VaultPayload {
  items: VaultItem[];
  folders: VaultFolder[];
  autoLockTimeout: number;
}

// ============================================================
// 工具函数
// ============================================================

/** 使用 crypto.getRandomValues 生成密码学安全的随机 salt（32 字节 → Base64） */
function generateSalt(): string {
  const salt = new Uint8Array(32);
  crypto.getRandomValues(salt);
  let binary = '';
  for (let i = 0; i < salt.length; i++) {
    binary += String.fromCharCode(salt[i]);
  }
  return btoa(binary);
}

/** 将 Uint8Array 编码为 Base64（用于 btoa 安全处理二进制数据） */
function base64Encode(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/** 生成密码学安全的随机整数 [0, max)，使用 rejection sampling 消除取模偏差 */
export function secureRandomIndex(max: number): number {
  // 计算不会产生偏差的上限：2^32 向下取整到 max 的倍数
  const limit = Math.floor(0x100000000 / max) * max;
  const array = new Uint32Array(1);
  do {
    crypto.getRandomValues(array);
  } while (array[0] >= limit);
  return array[0] % max;
}

// ============================================================
// 保险箱操作
// ============================================================

/**
 * 首次创建保险箱
 * 1. 生成随机 salt
 * 2. 从主密码派生加密密钥
 * 3. 加密初始数据
 * 4. 保存到文件
 *
 * @returns { salt, masterKey, ciphertext }
 */
export async function createVault(
  password: string,
  initialData: VaultPayload,
  kdf?: "argon2id" | "pbkdf2"
): Promise<{ salt: string; masterKey: string }> {
  const salt = generateSalt();
  const masterKey = await deriveMasterKey(password, salt, kdf);
  const plaintext = JSON.stringify(initialData);
  const ciphertext = await encryptVault(plaintext, masterKey);

  // 文件格式: {salt}:{ciphertext}
  const fileContent = salt + ':' + ciphertext;
  await saveSecureVaultFile(fileContent);

  return { salt, masterKey };
}

/**
 * 解锁保险箱
 * 1. 从 salt 和主密码派生密钥
 * 2. 尝试解密密文（失败 = 密码错误）
 * 3. 返回解密后的数据
 */
export async function unlockVault(
  password: string,
  salt: string,
  ciphertext: string,
  kdf?: "argon2id" | "pbkdf2"
): Promise<{ masterKey: string; data: VaultPayload }> {
  const masterKey = await deriveMasterKey(password, salt, kdf);
  const plaintext = await decryptVault(ciphertext, masterKey);
  const data: VaultPayload = JSON.parse(plaintext);
  return { masterKey, data };
}

/**
 * 保存保险箱（加密后写入文件）
 */
export async function saveVault(
  masterKey: string,
  salt: string,
  data: VaultPayload
): Promise<void> {
  const plaintext = JSON.stringify(data);
  const ciphertext = await encryptVault(plaintext, masterKey);
  const fileContent = salt + ':' + ciphertext;
  await saveSecureVaultFile(fileContent);
}

/**
 * 加载保险箱原始文件内容
 * @returns { salt, ciphertext } 或 null（首次使用 / 文件不存在）
 */
export async function loadVaultRaw(): Promise<{ salt: string; ciphertext: string } | null> {
  const raw = await loadSecureVaultFile();
  if (!raw) return null;

  const colonIdx = raw.indexOf(':');
  if (colonIdx === -1) {
    throw new Error(t('保险箱文件格式无效：缺少 salt 分隔符'));
  }

  const salt = raw.substring(0, colonIdx);
  const ciphertext = raw.substring(colonIdx + 1);

  if (!salt || !ciphertext) {
    throw new Error(t('保险箱文件格式无效：salt 或密文为空'));
  }

  return { salt, ciphertext };
}

/**
 * 清除保险箱文件（用于强制重置）
 */
export async function clearVault(): Promise<void> {
  await saveSecureVaultFile('');
}
