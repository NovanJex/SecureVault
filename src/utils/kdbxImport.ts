// kdbxImport.ts — KeePass KDBX 导入解析器
// Rust 端 import_kdbx 已解密并解析 KDBX 文件，这里负责类型推断与 VaultItem 转换

import { VaultItem, ItemType } from "../types";
import { ImportResult } from "./browserImport";
import { secureRandomIndex } from "./vaultStorage";

// ============================================================
// Rust 端返回的原始条目结构
// ============================================================

export interface KdbxRawItem {
  title: string;
  username: string;
  password: string;
  url: string;
  notes: string;
  folder: string;
  favorite: boolean;
  /** 自定义字段（排除 Title/UserName/Password/URL/Notes/SecureVaultFavorite） */
  custom: Record<string, string>;
}

export interface KdbxImportPayload {
  items: KdbxRawItem[];
  folders: string[];
}

// ============================================================
// 类型推断
// ============================================================

/** 卡号特征：13-19 位纯数字（可含空格） */
const CARD_NUMBER_RE = /^[\d ]{13,19}$/;

function inferType(raw: KdbxRawItem): ItemType {
  const custom = raw.custom;
  const hasCardField = !!(custom["CVV"] || custom["有效期"] || custom["卡号"] || custom["Expires"] || custom["CC Expiry"]);
  const username = raw.username || "";

  // 1. 有卡字段或卡号特征 → 虚拟卡券
  if (hasCardField || (CARD_NUMBER_RE.test(username.replace(/\s/g, "")) && raw.password)) {
    return "card";
  }
  // 2. 无任何凭据 → 安全备忘
  if (!username && !raw.password && !raw.url) {
    return "note";
  }
  // 3. 其余 → 登录账号（含仅有 URL 的空凭据条目）
  return "login";
}

// ============================================================
// 主转换入口
// ============================================================

function randId(): string {
  return `kdbx-${Date.now()}-${secureRandomIndex(100000)}`;
}

/** 将 Rust 解析结果转换为可预览导入的 ImportResult */
export function convertKdbxPayload(payload: KdbxImportPayload): ImportResult {
  const items: VaultItem[] = [];
  const folderSet = new Set<string>();

  for (const raw of payload.items) {
    // 完全空条目跳过
    if (!raw.title && !raw.username && !raw.password && !raw.url && !raw.notes) continue;

    const type = inferType(raw);
    const folder = raw.folder || "KeePass 导入";
    folderSet.add(folder);

    const cardCustom = type === "card"
      ? {
          cardName: raw.title,
          cardNumber: raw.username,
          cardExpiry: raw.custom["有效期"] || raw.custom["Expires"] || raw.custom["CC Expiry"] || "",
          cardCvv: raw.custom["CVV"] || "",
        }
      : {};

    items.push({
      id: randId(),
      type,
      title: raw.title || "未命名条目",
      folder,
      username: raw.username,
      password: raw.password,
      url: raw.url,
      notes: raw.notes
        ? `由 KeePass 导入\n${raw.notes}`
        : "由 KeePass 导入",
      strength: raw.password ? "medium" : "weak",
      updatedAt: new Date().toISOString().replace("T", " ").substring(0, 16),
      isFavorite: raw.favorite,
      ignoreSecurityWarning: false,
      ...cardCustom,
    });
  }

  return {
    items,
    total: payload.items.length,
    skipped: payload.items.length - items.length,
    browserType: "kdbx",
    folderNames: [...folderSet],
  };
}
