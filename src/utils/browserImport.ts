// browserImport.ts — 浏览器密码导入解析器
// 支持 Chrome / Edge / Firefox / 1Password / LastPass / Bitwarden / Safari 格式

import { VaultItem, ItemType } from "../types";
import { secureRandomIndex } from "./vaultStorage";

// ============================================================
// 类型定义
// ============================================================

export type BrowserType =
  | "chrome" | "firefox"
  | "1password" | "lastpass"
  | "bitwarden-csv" | "bitwarden-json"
  | "safari" | "unknown";

export interface ImportResult {
  items: VaultItem[];
  total: number;
  skipped: number;
  browserType: BrowserType;
  folderNames: string[];  // 本次导入涉及的所有文件夹名
}

// ============================================================
// CSV 解析
// ============================================================

/** 简易 CSV 解析器，处理引号包裹的字段和 UTF-8 BOM */
function parseCsv(text: string): string[][] {
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
        i++;
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
        if (currentRow.some(f => f)) rows.push(currentRow);
        currentRow = []; currentField = "";
        if (ch === "\r") i++;
      } else if (ch === "\r") {
        currentRow.push(currentField.trim());
        if (currentRow.some(f => f)) rows.push(currentRow);
        currentRow = []; currentField = "";
      } else {
        currentField += ch;
      }
    }
  }

  currentRow.push(currentField.trim());
  if (currentRow.some(f => f)) rows.push(currentRow);

  return rows;
}

// ============================================================
// 工具函数
// ============================================================

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

function getDomain(url: string): string {
  try {
    return new URL(url.startsWith("http") ? url : "https://" + url).hostname.replace("www.", "");
  } catch { return url; }
}

/** 行内 field getter */
function makeGetter(row: string[], headers: string[]) {
  return (name: string): string => {
    const idx = headers.findIndex(h => h.toLowerCase() === name.toLowerCase());
    return idx >= 0 ? row[idx] : "";
  };
}

// ============================================================
// 来源类型标签
// ============================================================

const sourceLabel: Record<BrowserType, string> = {
  chrome: "Chrome/Edge",
  firefox: "Firefox",
  "1password": "1Password",
  lastpass: "LastPass",
  "bitwarden-csv": "Bitwarden",
  "bitwarden-json": "Bitwarden",
  safari: "Safari",
  unknown: "未知来源",
};

// ============================================================
// 类型检测（按特异性从高到低）
// ============================================================

function detectBrowserType(headers: string[]): BrowserType {
  const lower = headers.map(h => h.toLowerCase());

  // 1. Bitwarden CSV: login_uri + login_username + login_password
  if (lower.includes("login_uri") && lower.includes("login_username") && lower.includes("login_password")) {
    return "bitwarden-csv";
  }
  // 2. Firefox: httprealm
  if (lower.includes("url") && lower.includes("username") && lower.includes("password") && lower.includes("httprealm")) {
    return "firefox";
  }
  // 3. LastPass: extra + grouping（必须在 Chrome 之前，LastPass 也有 name 列）
  if (lower.includes("url") && lower.includes("username") && lower.includes("password") && lower.includes("extra") && lower.includes("grouping")) {
    return "lastpass";
  }
  // 4. Chrome/Edge: name + url + username + password（无 extra/grouping）
  if (lower.includes("url") && lower.includes("username") && lower.includes("password") && lower.includes("name")) {
    return "chrome";
  }
  // 5. 1Password / Safari: title + url + username + password（无 name）
  if (lower.includes("url") && lower.includes("username") && lower.includes("password") && lower.includes("title") && !lower.includes("name")) {
    // Safari 导出的 CSV 表头通常是首字母大写（Title/URL/Username/Password）
    const hasSafariCase = headers.some(h => h === "Title" || h === "URL" || h === "Username" || h === "Password");
    return hasSafariCase ? "safari" : "1password";
  }
  // 6. 通用兜底
  if (lower.includes("url") && lower.includes("username") && lower.includes("password")) {
    const hasSafariCase = headers.some(h => h === "Title" || h === "URL" || h === "Username" || h === "Password");
    return hasSafariCase ? "safari" : "1password";
  }

  return "unknown";
}

// ============================================================
// 字段映射
// ============================================================

function mapChromeRow(row: string[], headers: string[]): VaultItem | null {
  const get = makeGetter(row, headers);
  const url = get("url"), username = get("username"), password = get("password");
  const title = get("name") || domainFromUrl(url);
  if (!url && !username && !password) return null;
  const csvNote = get("note");
  return {
    id: randId(), type: "login", title: title || domainFromUrl(url),
    folder: "浏览器导入", url, username, password,
    notes: csvNote ? `由 Chrome/Edge 导入\n${csvNote}` : `由 Chrome/Edge 导入`,
    strength: password ? "medium" : "weak",
    updatedAt: new Date().toISOString().replace("T", " ").substring(0, 16),
    isFavorite: false, ignoreSecurityWarning: false,
  };
}

function mapFirefoxRow(row: string[], headers: string[]): VaultItem | null {
  const get = makeGetter(row, headers);
  const url = get("url"), username = get("username"), password = get("password");
  if (!url && !username && !password) return null;
  return {
    id: randId(), type: "login", title: domainFromUrl(url),
    folder: "浏览器导入", url, username, password,
    notes: `由 Firefox 导入`,
    strength: password ? "medium" : "weak",
    updatedAt: new Date().toISOString().replace("T", " ").substring(0, 16),
    isFavorite: false, ignoreSecurityWarning: false,
  };
}

function map1PasswordRow(row: string[], headers: string[]): VaultItem | null {
  const get = makeGetter(row, headers);
  const url = get("url"), username = get("username"), password = get("password");
  const title = get("title") || domainFromUrl(url);
  if (!url && !username && !password) return null;
  const csvNote = get("notes");
  return {
    id: randId(), type: "login", title,
    folder: "1Password 导入", url, username, password,
    notes: csvNote ? `由 1Password 导入\n${csvNote}` : `由 1Password 导入`,
    strength: password ? "medium" : "weak",
    updatedAt: new Date().toISOString().replace("T", " ").substring(0, 16),
    isFavorite: false, ignoreSecurityWarning: false,
  };
}

function mapSafariRow(row: string[], headers: string[]): VaultItem | null {
  const get = makeGetter(row, headers);
  const url = get("url"), username = get("username"), password = get("password");
  const title = get("title") || domainFromUrl(url);
  if (!url && !username && !password) return null;
  const csvNote = get("notes");
  return {
    id: randId(), type: "login", title,
    folder: "Safari 导入", url, username, password,
    notes: csvNote ? `由 Safari 导入\n${csvNote}` : `由 Safari 导入`,
    strength: password ? "medium" : "weak",
    updatedAt: new Date().toISOString().replace("T", " ").substring(0, 16),
    isFavorite: false, ignoreSecurityWarning: false,
  };
}

function mapLastPassRow(row: string[], headers: string[]): VaultItem | null {
  const get = makeGetter(row, headers);
  const url = get("url"), username = get("username"), password = get("password");
  const title = get("name") || get("title") || domainFromUrl(url);
  if (!url && !username && !password) return null;
  const extra = get("extra");
  const grouping = get("grouping");
  const folder = grouping || "LastPass 导入";
  return {
    id: randId(), type: "login", title,
    folder, url, username, password,
    notes: extra ? `由 LastPass 导入\n备注: ${extra}` : `由 LastPass 导入`,
    strength: password ? "medium" : "weak",
    updatedAt: new Date().toISOString().replace("T", " ").substring(0, 16),
    isFavorite: get("fav") === "1" || get("fav") === "true",
    ignoreSecurityWarning: false,
  };
}

function mapBitwardenCsvRow(row: string[], headers: string[]): VaultItem | null {
  const get = makeGetter(row, headers);
  const url = get("login_uri"), username = get("login_username"), password = get("login_password");
  const title = get("name") || domainFromUrl(url);
  if (!url && !username && !password) return null;

  const bwType = get("type");
  const typeMap: Record<string, ItemType> = { note: "note", card: "card", identity: "identity" };
  const itemType: ItemType = typeMap[bwType] || "login";

  const folder = get("folder") || "Bitwarden 导入";
  const isFavorite = get("favorite") === "1" || get("favorite") === "true";
  const bwNotes = get("notes");

  return {
    id: randId(), type: itemType, title,
    folder, url, username, password,
    notes: bwNotes ? `由 Bitwarden 导入\n${bwNotes}` : `由 Bitwarden 导入`,
    strength: password ? "medium" : "weak",
    updatedAt: new Date().toISOString().replace("T", " ").substring(0, 16),
    isFavorite, ignoreSecurityWarning: false,
    ...(itemType === "card" ? { cardName: get("name"), cardNumber: get("login_username") } : {}),
    ...(itemType === "identity" ? { identityName: get("name"), identityEmail: get("login_username") } : {}),
  };
}

// ============================================================
// Bitwarden JSON 解析
// ============================================================

function importBitwardenJson(jsonText: string): ImportResult {
  let data: any;
  try { data = JSON.parse(jsonText); } catch { return { items: [], total: 0, skipped: 0, browserType: "unknown", folderNames: [] }; }

  const rawItems: any[] = data?.items || data?.data?.items || [];
  if (!Array.isArray(rawItems) || rawItems.length === 0) {
    return { items: [], total: 0, skipped: 0, browserType: "bitwarden-json", folderNames: [] };
  }

  const typeMap: Record<number, ItemType> = { 1: "login", 2: "note", 3: "card", 4: "identity" };
  const items: VaultItem[] = [];
  const folderSet = new Set<string>();

  for (const item of rawItems) {
    const login = item.login || {};
    const url = login.uris?.[0]?.uri || item.login_uri || "";
    const username = login.username || item.login_username || "";
    const password = login.password || item.login_password || "";
    const title = item.name || domainFromUrl(url);
    if (!url && !username && !password) continue;

    const itemType = typeMap[item.type] || "login";
    const folder = item.folder || item.folderName || item.collectionIds?.[0] || "Bitwarden 导入";
    folderSet.add(folder);

    items.push({
      id: randId(), type: itemType, title,
      folder, url, username, password,
      notes: item.notes ? `由 Bitwarden 导入\n${item.notes}` : `由 Bitwarden 导入`,
      strength: password ? "medium" : "weak",
      updatedAt: new Date().toISOString().replace("T", " ").substring(0, 16),
      isFavorite: !!item.favorite,
      ignoreSecurityWarning: false,
      ...(itemType === "card" ? { cardName: item.name, cardNumber: login.username } : {}),
      ...(itemType === "identity" ? { identityName: item.name, identityEmail: login.username } : {}),
    });
  }

  return { items, total: rawItems.length, skipped: rawItems.length - items.length, browserType: "bitwarden-json", folderNames: [...folderSet] };
}

// ============================================================
// 主入口
// ============================================================

/** 导入任意格式的浏览器密码文件（自动判断 JSON / CSV） */
export function importBrowserFile(content: string): ImportResult {
  const trimmed = content.trim();
  // Bitwarden JSON: 文件以 { 开头
  if (trimmed.startsWith("{")) {
    return importBitwardenJson(trimmed);
  }
  return importBrowserCsv(trimmed);
}

/** 解析 CSV，返回 VaultItem 数组 */
export function importBrowserCsv(csvText: string): ImportResult {
  const rows = parseCsv(csvText);
  if (rows.length < 2) {
    return { items: [], total: 0, skipped: 0, browserType: "unknown", folderNames: [] };
  }

  const headers = rows[0];
  const browserType = detectBrowserType(headers);
  if (browserType === "unknown") {
    return { items: [], total: 0, skipped: 0, browserType: "unknown", folderNames: [] };
  }

  const mapperMap: Record<string, (row: string[], h: string[]) => VaultItem | null> = {
    chrome: mapChromeRow,
    firefox: mapFirefoxRow,
    "1password": map1PasswordRow,
    safari: mapSafariRow,
    lastpass: mapLastPassRow,
    "bitwarden-csv": mapBitwardenCsvRow,
  };

  const mapper = mapperMap[browserType] || mapChromeRow;

  const items: VaultItem[] = [];
  const folderSet = new Set<string>();
  let skipped = 0;

  for (let i = 1; i < rows.length; i++) {
    const item = mapper(rows[i], headers);
    if (item) {
      items.push(item);
      folderSet.add(item.folder);
    } else {
      skipped++;
    }
  }

  return { items, total: rows.length - 1, skipped, browserType, folderNames: [...folderSet] };
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
