// browserImport.ts — 浏览器密码 CSV 导入解析器
// 支持 Chrome / Edge / Firefox 导出格式的自动识别与字段映射

import { VaultItem } from "../types";
import { secureRandomIndex } from "./vaultStorage";

// ============================================================
// 类型定义
// ============================================================

export type BrowserType = "chrome" | "firefox" | "unknown";

export interface ImportResult {
  items: VaultItem[];
  total: number;
  skipped: number;       // 空行/无效行跳过数量
  browserType: BrowserType;
}

export interface ImportPreview extends ImportResult {
  existingUrls: Set<string>;  // 已有记录的 URL，用于重复检测
  duplicates: number;
}

// ============================================================
// CSV 解析
// ============================================================

/** 简易 CSV 解析器，处理引号包裹的字段和 UTF-8 BOM */
function parseCsv(text: string): string[][] {
  // 去除 UTF-8 BOM
  const content = text.replace(/^﻿/, "");
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentField = "";
  let inQuotes = false;

  for (let i = 0; i < content.length; i++) {
    const ch = content[i];
    const next = content[i + 1];

    if (inQuotes) {
      if (ch === '"' && next === '"') {
        currentField += '"';
        i++; // skip next quote
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        currentField += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ",") {
        currentRow.push(currentField.trim());
        currentField = "";
      } else if (ch === "\n" || (ch === "\r" && next === "\n")) {
        currentRow.push(currentField.trim());
        if (currentRow.some(f => f)) {
          rows.push(currentRow);
        }
        currentRow = [];
        currentField = "";
        if (ch === "\r") i++; // skip \n in \r\n
      } else if (ch === "\r") {
        currentRow.push(currentField.trim());
        if (currentRow.some(f => f)) {
          rows.push(currentRow);
        }
        currentRow = [];
        currentField = "";
      } else {
        currentField += ch;
      }
    }
  }

  // 最后一个字段
  currentRow.push(currentField.trim());
  if (currentRow.some(f => f)) {
    rows.push(currentRow);
  }

  return rows;
}

// ============================================================
// 浏览器类型检测
// ============================================================

function detectBrowserType(headers: string[]): BrowserType {
  const lower = headers.map(h => h.toLowerCase());

  // Chrome/Edge: name, url, username, password
  if (
    lower.includes("url") &&
    lower.includes("username") &&
    lower.includes("password") &&
    lower.includes("name")
  ) {
    return "chrome";
  }

  // Firefox: url, username, password, httpRealm, formActionOrigin, guid, ...
  if (
    lower.includes("url") &&
    lower.includes("username") &&
    lower.includes("password") &&
    lower.includes("httprealm")
  ) {
    return "firefox";
  }

  return "unknown";
}

// ============================================================
// 字段映射
// ============================================================

/** 从 URL 提取域名作为标题 */
function domainFromUrl(url: string): string {
  try {
    const u = new URL(url.startsWith("http") ? url : "https://" + url);
    return u.hostname.replace("www.", "");
  } catch {
    return url || "未知网站";
  }
}

function randId(): string {
  return `import-${Date.now()}-${secureRandomIndex(100000)}`;
}

function mapChromeRow(row: string[], headers: string[]): VaultItem | null {
  const get = (name: string) => {
    const idx = headers.findIndex(h => h.toLowerCase() === name.toLowerCase());
    return idx >= 0 ? row[idx] : "";
  };

  const url = get("url");
  const username = get("username");
  const password = get("password");
  const title = get("name") || domainFromUrl(url);

  const csvNote = get("note");

  if (!url && !username && !password) return null;

  const baseNote = `由 Chrome/Edge 密码导入 — ${new Date().toLocaleDateString()}`;
  const notes = csvNote ? `${baseNote}\n备注: ${csvNote}` : baseNote;

  return {
    id: randId(),
    type: "login",
    title: title || domainFromUrl(url),
    folder: "浏览器导入",
    url,
    username,
    password,
    notes,
    strength: password ? "medium" : "weak",
    updatedAt: new Date().toISOString().replace("T", " ").substring(0, 16),
    isFavorite: false,
    ignoreSecurityWarning: false,
  };
}

function mapFirefoxRow(row: string[], headers: string[]): VaultItem | null {
  const get = (name: string) => {
    const idx = headers.findIndex(h => h.toLowerCase() === name.toLowerCase());
    return idx >= 0 ? row[idx] : "";
  };

  const url = get("url");
  const username = get("username");
  const password = get("password");

  if (!url && !username && !password) return null;

  return {
    id: randId(),
    type: "login",
    title: domainFromUrl(url),
    folder: "浏览器导入",
    url,
    username,
    password,
    notes: `由 Firefox 密码导入 — ${new Date().toLocaleDateString()}`,
    strength: password ? "medium" : "weak",
    updatedAt: new Date().toISOString().replace("T", " ").substring(0, 16),
    isFavorite: false,
    ignoreSecurityWarning: false,
  };
}

// ============================================================
// 主入口
// ============================================================

/** 解析浏览器导出的 CSV，返回 VaultItem 数组 */
export function importBrowserCsv(csvText: string): ImportResult {
  const rows = parseCsv(csvText);

  if (rows.length < 2) {
    return { items: [], total: 0, skipped: 0, browserType: "unknown" };
  }

  const headers = rows[0];
  const browserType = detectBrowserType(headers);

  if (browserType === "unknown") {
    return { items: [], total: 0, skipped: 0, browserType: "unknown" };
  }

  const mapper = browserType === "firefox" ? mapFirefoxRow : mapChromeRow;

  const items: VaultItem[] = [];
  let skipped = 0;

  for (let i = 1; i < rows.length; i++) {
    const item = mapper(rows[i], headers);
    if (item) {
      items.push(item);
    } else {
      skipped++;
    }
  }

  return { items, total: rows.length - 1, skipped, browserType };
}

/** 从 URL 提取域名，用于重复检测 */
function getDomain(url: string): string {
  try {
    return new URL(url.startsWith("http") ? url : "https://" + url).hostname.replace("www.", "");
  } catch {
    return url;
  }
}

/** 与已有 vault 数据对比，标记重复项（同域名 + 同用户名 = 重复） */
export function checkDuplicates(
  imported: VaultItem[],
  existing: VaultItem[]
): { items: VaultItem[]; duplicates: number } {
  const existingKeys = new Set(
    existing.map(i => `${getDomain(i.url || "")}|${(i.username || "").toLowerCase()}`)
  );

  let duplicates = 0;
  const items = imported.map(item => {
    const key = `${getDomain(item.url || "")}|${(item.username || "").toLowerCase()}`;
    if (existingKeys.has(key) && key !== "|") {
      duplicates++;
      return { ...item, title: item.title + " (重复)" };
    }
    return item;
  });

  return { items, duplicates };
}
