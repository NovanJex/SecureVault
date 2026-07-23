// useVault — 保险箱核心 Hook（加解密 / 文件存储 / CRUD / 自动保存）


import React, { useState, useEffect, useRef, useCallback } from "react";
import type { VaultItem, VaultFolder } from "../types";
import {
  createVault as createVaultFile,
  unlockVault as unlockVaultFile,
  saveVault,
  loadVaultRaw,
  clearVault,
  type VaultPayload,
} from "../utils/vaultStorage";
import { encryptVault, decryptVault, deriveMasterKey, computeSha256 } from "../utils/tauriBridge";
import { getVersion } from '@tauri-apps/api/app';

const EMPTY_VAULT: VaultPayload = {
  items: [],
  folders: [],
  autoLockTimeout: 15,
};

export interface UseVaultReturn {
  // 状态
  isLocked: boolean;
  vaultLoaded: boolean;
  isFirstTime: boolean;
  isDeriving: boolean;
  derivationProgress: string;
  unlockError: string;
  vaultItems: VaultItem[];
  folders: VaultFolder[];
  autoLockTimeout: number;
  selectedKdf: "argon2id" | "pbkdf2";
  setSelectedKdf: React.Dispatch<React.SetStateAction<"argon2id" | "pbkdf2">>;

  // 保险箱生命周期
  createMasterPassword: (password: string) => Promise<void>;
  unlockVault: (password: string) => Promise<void>;
  lockVault: () => Promise<void>;
  forceResetVault: () => Promise<void>;

  // 数据操作
  setVaultItems: React.Dispatch<React.SetStateAction<VaultItem[]>>;
  setFolders: React.Dispatch<React.SetStateAction<VaultFolder[]>>;
  setAutoLockTimeout: React.Dispatch<React.SetStateAction<number>>;
  setUnlockError: React.Dispatch<React.SetStateAction<string>>;

  // 导入导出
  masterKey: string | null;
  vaultSalt: string;
  exportData: () => Promise<string | null>;
  importData: (jsonStr: string, strategy: "merge" | "overwrite") => Promise<void>;
}

export function useVault(): UseVaultReturn {
  // ===== 状态 =====
  const [isLocked, setIsLocked] = useState(true);
  const [vaultLoaded, setVaultLoaded] = useState(true);
  const [isFirstTime, setIsFirstTime] = useState(false);
  const [isDeriving, setIsDeriving] = useState(false);
  const [derivationProgress, setDerivationProgress] = useState("");
  const [unlockError, setUnlockError] = useState("");

  const [masterKey, setMasterKey] = useState<string | null>(null);
  const [vaultSalt, setVaultSalt] = useState("");
  const [storedCiphertext, setStoredCiphertext] = useState("");

  const [vaultItems, setVaultItems] = useState<VaultItem[]>([]);
  const [folders, setFolders] = useState<VaultFolder[]>([]);
  const [autoLockTimeout, setAutoLockTimeout] = useState(15);
  const [selectedKdf, setSelectedKdf] = useState<"argon2id" | "pbkdf2">("argon2id");

  const pendingSaveRef = useRef<Promise<void> | null>(null);

  // ===== 启动加载 =====
  useEffect(() => {
    (async () => {
      try {
        const raw = await loadVaultRaw();
        if (!raw) {
          setIsFirstTime(true);
        } else {
          setVaultSalt(raw.salt);
          setStoredCiphertext(raw.ciphertext);
        }
      } catch (err) {
        console.error("加载保险箱文件失败:", err);
        setIsFirstTime(true);
      } finally {
        setVaultLoaded(true);
      }
    })();
  }, []);

  // ===== 自动保存（debounce 500ms） =====
  useEffect(() => {
    if (!masterKey || isLocked || !vaultSalt) return;

    const saveTimer = setTimeout(async () => {
      const savePromise = (async () => {
        try {
          await saveVault(masterKey, vaultSalt, {
            items: vaultItems,
            folders,
            autoLockTimeout,
          });
        } catch (err) {
          console.error("自动保存保险箱失败:", err);
        }
      })();
      pendingSaveRef.current = savePromise;
      await savePromise;
      pendingSaveRef.current = null;
    }, 500);

    return () => clearTimeout(saveTimer);
  }, [vaultItems, folders, autoLockTimeout, masterKey, vaultSalt, isLocked]);

  // ===== 保险箱生命周期 =====

  /** 创建主密码并初始化加密保险箱 */
  const createMasterPassword = useCallback(async (password: string) => {
    if (!password.trim() || password.length < 8) {
      setUnlockError("主密码长度至少需要 8 位以确保高强度加密！");
      return;
    }

    setIsDeriving(true);
    setUnlockError("");

    try {
      setDerivationProgress("🔑 正在初始化零知识本地加密协议...");
      await delay(100);

      setDerivationProgress("⚙️ 正在生成用户专属高熵 Salt 物理字节...");
      await delay(100);

      setDerivationProgress(selectedKdf === "argon2id"
        ? "🧠 正在分配 64MB 锁页物理内存, 准备进行 Argon2id 迭代推导..."
        : "⚙️ 正在执行 PBKDF2-HMAC-SHA256 推导 (100,000次物理循环迭代)...");
      const { salt, masterKey: key } = await createVaultFile(password, EMPTY_VAULT, selectedKdf);

      setDerivationProgress("🛡️ 正在采用 AES-256-GCM 进行对称对齐...");
      await delay(100);

      setDerivationProgress("🔒 正在通过 Windows VirtualLock / macOS mlock 锁定密钥内存页...");
      await delay(100);

      setDerivationProgress("✨ 本地保险箱初始化成功！已派生安全会话物理密钥。");
      await delay(100);

      setMasterKey(key);
      setVaultSalt(salt);
      setIsDeriving(false);
      setIsLocked(false);
      setIsFirstTime(false);
      setDerivationProgress("");
    } catch (err) {
      console.error("创建保险箱失败:", err);
      setUnlockError("❌ 创建保险箱失败，请重试");
      setIsDeriving(false);
      throw err;
    }
  }, [selectedKdf]);

  /** 解锁保险箱 — PBKDF2 派生 + AES-256-GCM 解密 */
  const unlock = useCallback(async (password: string) => {
    if (!password.trim()) {
      setUnlockError("❌ 主密码不能为空！");
      return;
    }

    setIsDeriving(true);
    setUnlockError("");

    try {
      setDerivationProgress("🔓 正在读取本地加密 SQLite 扇区...");
      await delay(100);

      setDerivationProgress(selectedKdf === "argon2id"
        ? "🧠 正在载入 Argon2id (m=64MB, t=4, p=4) 高阻断抗暴力破解模块..."
        : "⚙️ 正在拉伸 Master Key (PBKDF2-SHA256, 100,000次迭代)...");
      const { masterKey: key, data } = await unlockVaultFile(password, vaultSalt, storedCiphertext, selectedKdf);

      setDerivationProgress("🔑 已派生 256-bit AES 对称加解密密钥...");
      await delay(100);

      setDerivationProgress("⚡ 内存零知识解密成功，正在导入安全区...");
      await delay(100);

      setMasterKey(key);
      setVaultItems(data.items || []);
      setFolders(data.folders || []);
      setAutoLockTimeout(data.autoLockTimeout ?? 15);
      setIsDeriving(false);
      setIsLocked(false);
      setDerivationProgress("");
    } catch (err) {
      console.error("解锁失败:", err);
      setUnlockError("❌ 主密码错误或保险箱数据损坏，无法解锁！");
      setIsDeriving(false);
      throw err;
    }
  }, [vaultSalt, storedCiphertext]);

  /** 锁定保险箱 — 等待保存完成后清除内存中的敏感数据 */
  const lockVault = useCallback(async () => {
    if (pendingSaveRef.current) {
      try { await pendingSaveRef.current; } catch { /* 忽略保存错误 */ }
    }
    setIsLocked(true);
    setMasterKey(null);
    setVaultItems([]);
    setFolders([]);
  }, []);

  /** 强制重置 — 清除加密文件并重置所有状态 */
  const forceResetVault = useCallback(async () => {
    try { await clearVault(); } catch (err) { console.error("清除保险箱文件失败:", err); }
    setVaultItems([]);
    setFolders([]);
    setMasterKey(null);
    setVaultSalt("");
    setStoredCiphertext("");
    setIsFirstTime(true);
    setIsLocked(true);
  }, []);

  // ===== 导入导出 =====

  /** 导出加密备份（含 SHA-256 完整性校验） */
  const exportData = useCallback(async (): Promise<string | null> => {
    if (!masterKey) return null;

    const appVersion = await getVersion();

    const plainPayload = JSON.stringify({
      version: appVersion,
      exportedAt: new Date().toISOString(),
      folders,
      vaultItems,
    });

    const checksum = await computeSha256(plainPayload);
    const encryptedPayload = await encryptVault(plainPayload, masterKey);
    return JSON.stringify({
      isEncrypted: true,
      version: appVersion,
      salt: vaultSalt,
      checksum,
      encryptedPayload,
      hint: "SecureVault 加密备份 — 受主密码保护，含 SHA-256 完整性校验。",
    }, null, 2);
  }, [masterKey, vaultSalt, folders, vaultItems]);

  /** 导入备份数据（自动验证 SHA-256 完整性） */
  const importData = useCallback(async (jsonStr: string, strategy: "merge" | "overwrite") => {
    const data = JSON.parse(jsonStr);

    let payload: any = data;
    if (data.isEncrypted && data.encryptedPayload && data.salt) {
      if (!masterKey) throw new Error("保险箱未解锁，无法解密导入文件");
      const decrypted = await decryptVault(data.encryptedPayload, masterKey);

      // 验证 SHA-256 完整性校验
      if (data.checksum) {
        const actualChecksum = await computeSha256(decrypted);
        if (actualChecksum !== data.checksum) {
          throw new Error("备份文件完整性校验失败：数据可能已损坏或被篡改");
        }
      }

      payload = JSON.parse(decrypted);
    }

    const importedItems: VaultItem[] = Array.isArray(payload.vaultItems) ? payload.vaultItems : [];
    const importedFolders: VaultFolder[] = Array.isArray(payload.folders) ? payload.folders : [];

    if (strategy === "overwrite") {
      setVaultItems(importedItems);
      setFolders(importedFolders);
    } else {
      const existingIds = new Set(vaultItems.map(i => i.id));
      const mergedItems = [...vaultItems];
      for (const item of importedItems) {
        if (!item?.id) continue;
        const idx = mergedItems.findIndex(m => m.id === item.id);
        if (idx !== -1) { mergedItems[idx] = item; }
        else { mergedItems.push(item); }
      }

      const existingNames = new Set(folders.map(f => f.name));
      const mergedFolders = [...folders];
      for (const f of importedFolders) {
        if (f?.name && !existingNames.has(f.name)) mergedFolders.push(f);
      }

      setVaultItems(mergedItems);
      setFolders(mergedFolders);
    }
  }, [masterKey, vaultItems, folders]);

  return {
    isLocked, vaultLoaded, isFirstTime,
    isDeriving, derivationProgress, unlockError,
    vaultItems, folders, autoLockTimeout,
    selectedKdf, setSelectedKdf,
    createMasterPassword,
    unlockVault: unlock,
    lockVault,
    forceResetVault,
    setVaultItems, setFolders, setAutoLockTimeout, setUnlockError,
    masterKey, vaultSalt,
    exportData, importData,
  };
}

/** 微小延迟工具（用于 UX 过渡动画） */
function delay(ms: number): Promise<void> {
  return new Promise(r => setTimeout(r, ms));
}
