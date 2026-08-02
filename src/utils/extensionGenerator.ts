// extensionGenerator.ts — 在浏览器端实时打包 Manifest V3 扩展 ZIP
// 将桌面端加密备份数据嵌入扩展包，实现一键同步

import JSZip from "jszip";
// Vite ?raw 编译时将 argon2 WASM 内联为字符串，无需网络请求
import hashWasmBundle from 'hash-wasm/dist/argon2.umd.min.js?raw';

/**
 * 生成扩展图标 SVG Data URL
 */
function createExtensionIconSvg(): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 24 24" fill="none" stroke="#6366f1" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <rect width="18" height="18" x="3" y="3" rx="4" fill="#6366f1" fill-opacity="0.3" />
    <rect width="12" height="10" x="6" y="11" rx="2" fill="#4f46e5" stroke="#ffffff" stroke-width="1.5"/>
    <path d="M8 11V7a4 4 0 0 1 8 0v4" stroke="#4f46e5" stroke-width="2"/>
    <circle cx="12" cy="15" r="1" fill="#ffffff"/>
  </svg>`;
}

/**
 * 生成 Manifest V3 浏览器扩展 ZIP 包
 * @param encryptedPayload - 桌面端导出的加密备份 JSON 字符串（将嵌入扩展包）
 * @param appVersion - 应用版本号，用于 manifest.json
 * @param kdf - 密钥派生算法，用于扩展端选择解密方式
 */
export async function generateExtensionZip(
  encryptedPayload: string | null,
  appVersion: string,
  kdf?: "argon2id" | "pbkdf2"
): Promise<Blob> {
  const zip = new JSZip();

  // 1. manifest.json (Manifest V3)
  const manifestJson = {
    manifest_version: 3,
    name: "SecureVault - 零知识加密密码保险箱扩展",
    short_name: "SecureVault",
    version: appVersion,
    description: "SecureVault 浏览器无痕密码自动填充与零知识本地加密保险箱扩展",
    author: "SecureVault Cryptography Team",
    permissions: ["storage", "activeTab", "scripting"],
    host_permissions: ["<all_urls>"],
    content_security_policy: {
      extension_pages: "script-src 'self' 'wasm-unsafe-eval'; object-src 'self'"
    },
    action: {
      default_popup: "popup.html",
      default_title: "SecureVault 密码保险箱"
    },
    background: {
      service_worker: "background.js"
    },
    content_scripts: [
      {
        matches: ["<all_urls>"],
        js: ["content.js"],
        run_at: "document_end"
      }
    ],
    web_accessible_resources: [
      {
        resources: ["vault_backup.json"],
        matches: ["<all_urls>"]
      }
    ]
  };

  zip.file("manifest.json", JSON.stringify(manifestJson, null, 2));

  // 2. 嵌入加密备份数据（由桌面端导出）
  const backupContent = encryptedPayload || JSON.stringify({
    version: appVersion,
    note: "请在 SecureVault 桌面应用中导出加密备份后重新打包扩展。",
    isEmpty: true
  }, null, 2);
  zip.file("vault_backup.json", backupContent);

  // 3. 内联 hash-wasm 库（编译时内嵌，扩展端 Argon2id 解密需要）
  zip.file("lib/hash-wasm.js", hashWasmBundle);

  // 4. background.js — 内存驻留 + 15分钟自动锁定
  const backgroundJs = [
    '// SecureVault Manifest V3 Background Service Worker',
    'console.log("[SecureVault Background Worker] Initialized.");',
    '',
    'let unlockedVaultData = null;',
    'let autoLockTimer = null;',
    '',
    'chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {',
    '  if (request.action === "GET_UNLOCKED_DATA") {',
    '    sendResponse({ success: true, vault: unlockedVaultData });',
    '  } else if (request.action === "SET_UNLOCKED_DATA") {',
    '    unlockedVaultData = request.vault;',
    '    resetAutoLockTimer();',
    '    sendResponse({ success: true });',
    '  } else if (request.action === "LOCK_VAULT") {',
    '    unlockedVaultData = null;',
    '    if (autoLockTimer) clearTimeout(autoLockTimer);',
    '    sendResponse({ success: true });',
    '  } else if (request.action === "AUTOFILL_CREDENTIALS") {',
    '    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {',
    '      if (tabs && tabs[0] && tabs[0].id) {',
    '        chrome.tabs.sendMessage(tabs[0].id, {',
    '          action: "FILL_INPUTS",',
    '          username: request.username,',
    '          password: request.password',
    '        }, (response) => {',
    '          sendResponse({ success: !!response && response.filled });',
    '        });',
    '      }',
    '    });',
    '    return true;',
    '  }',
    '});',
    '',
    'function resetAutoLockTimer() {',
    '  if (autoLockTimer) clearTimeout(autoLockTimer);',
    '  autoLockTimer = setTimeout(() => {',
    '    unlockedVaultData = null;',
    '    console.log("[SecureVault] Memory session auto-locked due to 15min timeout.");',
    '  }, 15 * 60 * 1000);',
    '}'
  ].join('\n');
  zip.file("background.js", backgroundJs);

  // 4. content.js — DOM 安全注入 + 无痕填充
  const contentJs = [
    '// SecureVault Content Script - Autofill Engine',
    '(() => {',
    '  console.log("[SecureVault Content Script] Active on page.");',
    '',
    '  function fillPageInputs(username, password) {',
    '    let filled = 0;',
    '',
    '    const passwordInputs = document.querySelectorAll(\'input[type="password"]\');',
    '    passwordInputs.forEach(el => {',
    '      el.value = password;',
    '      el.dispatchEvent(new Event("input", { bubbles: true }));',
    '      el.dispatchEvent(new Event("change", { bubbles: true }));',
    '      filled++;',
    '    });',
    '',
    '    if (username) {',
    '      const candidates = document.querySelectorAll(',
    '        \'input[type="text"], input[type="email"], input[name*="user" i], input[name*="email" i], input[name*="login" i], input[id*="user" i], input[id*="email" i]\'',
    '      );',
    '      if (candidates.length > 0) {',
    '        candidates[0].value = username;',
    '        candidates[0].dispatchEvent(new Event("input", { bubbles: true }));',
    '        candidates[0].dispatchEvent(new Event("change", { bubbles: true }));',
    '        filled++;',
    '      }',
    '    }',
    '',
    '    return filled > 0;',
    '  }',
    '',
    '  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {',
    '    if (request.action === "FILL_INPUTS") {',
    '      const success = fillPageInputs(request.username, request.password);',
    '      sendResponse({ filled: success });',
    '    }',
    '  });',
    '})();'
  ].join('\n');
  zip.file("content.js", contentJs);

  // 5. popup.html
  const popupHtml = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>SecureVault Extension</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
    body { width: 360px; min-height: 480px; background: #f8fafc; color: #0f172a; font-size: 13px; }
    header { background: #fff; color: #1e293b; padding: 10px 16px; display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid #e2e8f0; }
    .brand { font-weight: 700; font-size: 14px; display: flex; align-items: center; gap: 8px; }
    .container { padding: 12px; flex: 1; display: flex; flex-direction: column; gap: 6px; }
    .card { background: #fff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); }
    .btn { background: #4f46e5; color: #fff; border: none; border-radius: 8px; padding: 8px 12px; font-weight: 600; cursor: pointer; width: 100%; transition: background 0.2s; font-size: 12px; }
    .btn:hover { background: #4338ca; }
    .btn-secondary { background: #f1f5f9; color: #334155; border: 1px solid #cbd5e1; }
    .btn-secondary:hover { background: #e2e8f0; }
    .input { width: 100%; padding: 8px 10px; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 12px; outline: none; margin-bottom: 8px; }
    .input:focus { border-color: #6366f1; }
    .item-card { border: 1px solid #e2e8f0; border-radius: 8px; padding: 8px; background: #fff; margin-bottom: 6px; display: flex; flex-direction: column; gap: 3px; }
    .item-title { font-weight: 600; font-size: 13px; color: #1e293b; display: flex; justify-content: space-between; align-items: center; }
    .item-user { font-size: 11px; color: #64748b; font-family: monospace; }
    .actions { display: flex; gap: 6px; margin-top: 6px; }
    .btn-xs { padding: 4px 8px; font-size: 11px; border-radius: 6px; flex: 1; }
    .domain-tag { background: #e0e7ff; color: #3730a3; padding: 2px 6px; border-radius: 4px; font-size: 10px; font-family: monospace; font-weight: 600; }
    .toast { position: fixed; bottom: 16px; left: 50%; transform: translateX(-50%); background: #065f46; color: #fff; font-size: 11px; font-weight: 600; padding: 8px 16px; border-radius: 20px; z-index: 999; }
  </style>
</head>
<body>
  <header>
    <div class="brand"><span>🛡️ SecureVault</span></div>
    <div id="headerActions"></div>
  </header>
  <div class="container" id="appContent"></div>
  <script src="lib/hash-wasm.js"></script>
  <script src="popup.js"></script>
</body>
</html>
`;
  zip.file("popup.html", popupHtml);

  // 6. popup.js — 加载内嵌加密备份 + 解锁 + 域名匹配 + 填充
  const popupJs = [
    '// SecureVault Extension Popup Logic',
    'let vaultItems = [];',
    'let currentTabDomain = "";',
    'let isUnlocked = false;',
    'let currentPass = "";  // 解锁密码，用于同步后自动解密刷新',
    '',
    'document.addEventListener("DOMContentLoaded", async () => {',
    '  try {',
    '    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });',
    '    if (tabs && tabs[0] && tabs[0].url) {',
    '      currentTabDomain = new URL(tabs[0].url).hostname.replace("www.", "");',
    '    }',
    '  } catch (e) { /* ignore */ }',
    '',
    '  chrome.runtime.sendMessage({ action: "GET_UNLOCKED_DATA" }, (res) => {',
    '    if (res && res.vault) {',
    '      vaultItems = res.vault;',
    '      isUnlocked = true;',
    '      renderUnlockedView();',
    '    } else {',
    '      renderLockedView();',
    '    }',
    '  });',
    '});',
    '',
    'function showToast(msg) {',
    '  const el = document.createElement("div");',
    '  el.className = "toast";',
    '  el.textContent = msg;',
    '  document.body.appendChild(el);',
    '  setTimeout(() => el.remove(), 2500);',
    '}',
    '',
    'function renderLockedView() {',
    '  const container = document.getElementById("appContent");',
    '  document.getElementById("headerActions").innerHTML = "";',
    '',
    '  container.innerHTML = "<div class=\\"card\\" style=\\"text-align:center;padding:14px 8px;\\">" +',
    '    "<div style=\\"font-size:28px;margin-bottom:8px;\\">🔐</div>" +',
    '    "<h3 style=\\"font-size:14px;margin-bottom:4px;\\">解密 SecureVault 保险箱</h3>" +',
    '    "<p style=\\"font-size:11px;color:#64748b;margin-bottom:10px;\\">请输入主密码以解密内嵌的加密备份数据</p>" +',
    '    "<input type=\\"password\\" id=\\"masterPassInput\\" class=\\"input\\" placeholder=\\"输入主解密密码...\\" />" +',
    '    "<button class=\\"btn\\" id=\\"unlockBtn\\">派生解密并开启填充</button>" +',
    '    "<div style=\\"margin-top:14px;border-top:1px solid #f1f5f9;padding-top:10px;font-size:10px;color:#94a3b8;\\">扩展内置加密备份由 SecureVault 桌面应用打包生成</div>" +',
    '    "</div>";',
    '',
    '  document.getElementById("unlockBtn").addEventListener("click", handleUnlock);',
    '}',
    '',
    'async function handleUnlock() {',
    '  const pass = document.getElementById("masterPassInput").value;',
    '  if (!pass) return showToast("请输入主密码！");',
    '',
    '  try {',
    '    // 优先读取同步数据，不存在则用内嵌出厂备份',
    '    let backup;',
    '    const syncResult = await chrome.storage.local.get("vault_sync");',
    '    if (syncResult && syncResult.vault_sync) {',
    '      backup = syncResult.vault_sync;',
    '    } else {',
    '      const res = await fetch(chrome.runtime.getURL("vault_backup.json"));',
    '      backup = await res.json();',
    '    }',
    '',
    '    if (backup.isEmpty) {',
    '      showToast("⚠️ 请先在桌面应用中导出加密备份后重新打包扩展");',
    '      return;',
    '    }',
    '',
    '    if (!backup.encryptedPayload || !backup.salt) {',
    '      showToast("⚠️ 备份数据格式无效，请重新在桌面应用中导出");',
    '      return;',
    '    }',
    '',
    '    const enc = new TextEncoder();',
    '    const saltBytes = Uint8Array.from(atob(backup.salt), c => c.charCodeAt(0));',
    '    const kdf = backup.kdf || "argon2id";',
    '',
    '    let derivedKey;',
    '',
    '    if (kdf === "pbkdf2") {',
    '      // Web Crypto API: PBKDF2 + AES-256-GCM',
    '      const keyMaterial = await crypto.subtle.importKey(',
    '        "raw", enc.encode(pass), "PBKDF2", false, ["deriveKey"]',
    '      );',
    '      derivedKey = await crypto.subtle.deriveKey(',
    '        { name: "PBKDF2", salt: saltBytes, iterations: 100000, hash: "SHA-256" },',
    '        keyMaterial,',
    '        { name: "AES-GCM", length: 256 },',
    '        false,',
    '        ["decrypt"]',
    '      );',
    '    } else {',
    '      // Argon2id via hash-wasm (内联 WASM)',
    '      const hash = await hashwasm.argon2id({',
    '        password: pass,',
    '        salt: saltBytes,',
    '        parallelism: 4,',
    '        iterations: 4,',
    '        memorySize: 65536,',
    '        hashLength: 32,',
    '        outputType: "binary"',
    '      });',
    '      derivedKey = await crypto.subtle.importKey(',
    '        "raw", hash,',
    '        { name: "AES-GCM", length: 256 },',
    '        false, ["decrypt"]',
    '      );',
    '    }',
    '',
    '    const packedBytes = Uint8Array.from(atob(backup.encryptedPayload), c => c.charCodeAt(0));',
    '    const nonce = packedBytes.slice(0, 12);',
    '    const ciphertext = packedBytes.slice(12);',
    '',
    '    const plainBuf = await crypto.subtle.decrypt(',
    '      { name: "AES-GCM", iv: nonce },',
    '      derivedKey,',
    '      ciphertext',
    '    );',
    '    const plaintext = new TextDecoder().decode(plainBuf);',
    '    const payload = JSON.parse(plaintext);',
    '',
    '    vaultItems = payload.vaultItems || [];',
    '    currentPass = pass;  // 保存密码供同步后自动解密',
    '    chrome.runtime.sendMessage({ action: "SET_UNLOCKED_DATA", vault: vaultItems }, () => {',
    '      isUnlocked = true;',
    '      renderUnlockedView();',
    '      showToast("🔓 保险箱已解密（" + kdf.toUpperCase() + "），共 " + vaultItems.length + " 条凭证");',
    '    });',
    '  } catch (err) {',
    '    console.error("解密失败:", err);',
    '    showToast("❌ 密码错误或备份数据已损坏");',
    '  }',
    '}',
    '',
    'function renderUnlockedView() {',
    '  const container = document.getElementById("appContent");',
    '  document.getElementById("headerActions").innerHTML = \'<button id="syncBtn" style="background:transparent;border:1px solid #cbd5e1;color:#64748b;border-radius:4px;padding:2px 6px;font-size:10px;cursor:pointer;margin-right:4px;">📥 同步</button><button id="lockBtn" style="background:transparent;border:1px solid #cbd5e1;color:#64748b;border-radius:4px;padding:2px 6px;font-size:10px;cursor:pointer;">锁定</button>\';',
    '  document.getElementById("syncBtn").addEventListener("click", renderSyncView);',
    '  document.getElementById("lockBtn").addEventListener("click", () => {',
    '    chrome.runtime.sendMessage({ action: "LOCK_VAULT" }, () => {',
    '      isUnlocked = false;',
    '      currentPass = "";',
    '      renderLockedView();',
    '    });',
    '  });',
    '',
    '  const matchedItems = vaultItems.filter(item => {',
    '    if (!currentTabDomain || !item.url) return false;',
    '    return item.url.toLowerCase().includes(currentTabDomain.toLowerCase());',
    '  });',
    '',
    '  const isRealDomain = currentTabDomain && !currentTabDomain.startsWith("newtab") && !currentTabDomain.includes("://");',
    '  let matchedHtml = "";',
    '  if (isRealDomain) {',
    '    const matchedContent = matchedItems.length > 0',
    '      ? matchedItems.map(item => renderItemCard(item, true)).join("")',
    '      : \'<div style="font-size:11px;color:#94a3b8;font-style:italic;padding:8px;background:#fff;border-radius:6px;border:1px dashed #cbd5e1;">未在该域名匹配到凭证</div>\';',
    '    matchedHtml = \'<div style="margin-bottom:8px;"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;"><span style="font-size:11px;font-weight:bold;color:#475569;">📍 当前网站匹配凭证</span><span class="domain-tag">\' + currentTabDomain + \'</span></div>\' + matchedContent + \'</div>\';',
    '  }',
    '',
    '  container.innerHTML = matchedHtml +',
    '    \'<div style="margin-bottom:6px;"><input type="text" id="searchInput" class="input" placeholder="🔍 搜索所有凭证..." /></div>\' +',
    '    \'<div id="itemsList" style="max-height:280px;overflow-y:auto;">\' + vaultItems.map(item => renderItemCard(item, false)).join("") + \'</div>\';',
    '',
    '  document.getElementById("searchInput").addEventListener("input", handleSearch);',
    '',
    '  bindEvents();',
    '}',
    '',
    'function bindEvents() {',
    '  document.querySelectorAll(".autofill-btn").forEach(btn => {',
    '    btn.addEventListener("click", (e) => {',
    '      const target = e.currentTarget;',
    '      const u = target.getAttribute("data-user");',
    '      const p = target.getAttribute("data-pass");',
    '      chrome.runtime.sendMessage({ action: "AUTOFILL_CREDENTIALS", username: u, password: p }, (res) => {',
    '        showToast(res && res.success ? "✨ 凭证已无痕填充至网页！" : "⚠️ 未检测到密码输入框，已复制密码");',
    '        if (!res || !res.success && p) navigator.clipboard.writeText(p);',
    '      });',
    '    });',
    '  });',
    '',
    '  document.querySelectorAll(".copy-pass-btn").forEach(btn => {',
    '    btn.addEventListener("click", (e) => {',
    '      const target = e.currentTarget;',
    '      const p = target.getAttribute("data-pass");',
    '      if (p) navigator.clipboard.writeText(p);',
    '      target.textContent = "已复制 ✓";',
    '      setTimeout(() => { target.textContent = "复制密码"; }, 1500);',
    '    });',
    '  });',
    '}',
    '',
    'function handleSearch(e) {',
    '  const q = e.target.value.toLowerCase();',
    '  const filtered = vaultItems.filter(i =>',
    '    (i.title && i.title.toLowerCase().includes(q)) ||',
    '    (i.username && i.username.toLowerCase().includes(q)) ||',
    '    (i.url && i.url.toLowerCase().includes(q))',
    '  );',
    '  document.getElementById("itemsList").innerHTML = filtered.map(item => renderItemCard(item, false)).join("");',
    '  bindEvents();',
    '}',
    '',
    'function renderSyncView() {',
    '  const container = document.getElementById("appContent");',
    '  container.innerHTML = "<div class=\\"card\\" style=\\"margin-bottom:10px;\\">" +',
    '    "<h3 style=\\"font-size:13px;margin-bottom:8px;\\">📥 同步最新加密备份</h3>" +',
    '    "<p style=\\"font-size:10px;color:#64748b;margin-bottom:10px;\\">请将桌面端「复制扩展同步密文」的内容粘贴到下方，更新后无需重新生成扩展包。</p>" +',
    '    "<textarea id=\\"syncPayloadText\\" class=\\"input\\" style=\\"height:120px;font-family:monospace;font-size:10px;\\" placeholder=\\"粘贴桌面端复制的加密备份数据...\\"></textarea>" +',
    '    "<div style=\\"display:flex;gap:8px;\\">" +',
    '      "<button class=\\"btn\\" id=\\"saveSyncBtn\\">保存并更新保险箱</button>" +',
    '      "<button class=\\"btn btn-secondary\\" id=\\"cancelSyncBtn\\">返回</button>" +',
    '    "</div>" +',
    '    "</div>";',
    '',
    '  document.getElementById("saveSyncBtn").addEventListener("click", () => {',
    '    const raw = document.getElementById("syncPayloadText").value.trim();',
    '    if (!raw) return showToast("请粘贴有效的加密数据 JSON！");',
    '    try {',
    '      const parsed = JSON.parse(raw);',
    '      if (!parsed.encryptedPayload || !parsed.salt) {',
    '        showToast("⚠️ 数据格式无效：缺少加密字段，请重新复制");',
    '        return;',
    '      }',
    '      chrome.storage.local.set({ vault_sync: parsed }, async () => {',
    '        if (!currentPass) {',
    '          showToast("✅ 已保存同步数据，锁定后重新解锁即可加载");',
    '          renderUnlockedView();',
    '          return;',
    '        }',
    '        // 自动用当前密码重新解密同步数据并刷新',
    '        try {',
    '          const enc = new TextEncoder();',
    '          const saltBytes = Uint8Array.from(atob(parsed.salt), c => c.charCodeAt(0));',
    '          const kdf = parsed.kdf || "argon2id";',
    '          let derivedKey;',
    '          if (kdf === "pbkdf2") {',
    '            const km = await crypto.subtle.importKey("raw", enc.encode(currentPass), "PBKDF2", false, ["deriveKey"]);',
    '            derivedKey = await crypto.subtle.deriveKey({ name: "PBKDF2", salt: saltBytes, iterations: 100000, hash: "SHA-256" }, km, { name: "AES-GCM", length: 256 }, false, ["decrypt"]);',
    '          } else {',
    '            const hash = await hashwasm.argon2id({ password: currentPass, salt: saltBytes, parallelism: 4, iterations: 4, memorySize: 65536, hashLength: 32, outputType: "binary" });',
    '            derivedKey = await crypto.subtle.importKey("raw", hash, { name: "AES-GCM", length: 256 }, false, ["decrypt"]);',
    '          }',
    '          const packedBytes = Uint8Array.from(atob(parsed.encryptedPayload), c => c.charCodeAt(0));',
    '          const plainBuf = await crypto.subtle.decrypt({ name: "AES-GCM", iv: packedBytes.slice(0, 12) }, derivedKey, packedBytes.slice(12));',
    '          const payload = JSON.parse(new TextDecoder().decode(plainBuf));',
    '          vaultItems = payload.vaultItems || [];',
    '          chrome.runtime.sendMessage({ action: "SET_UNLOCKED_DATA", vault: vaultItems }, () => {',
    '            renderUnlockedView();',
    '            showToast("✅ 已同步并刷新数据，共 " + vaultItems.length + " 条凭证");',
    '          });',
    '        } catch (e) {',
    '          showToast("❌ 解密失败，密码不匹配或数据损坏");',
    '          renderUnlockedView();',
    '        }',
    '      });',
    '    } catch (e) {',
    '      showToast("❌ JSON 格式错误，请检查粘贴内容");',
    '    }',
    '  });',
    '',
    '  document.getElementById("cancelSyncBtn").addEventListener("click", renderUnlockedView);',
    '}',
    '',
    'function renderItemCard(item, isMatched) {',
    '  const style = isMatched ? "border-color:#6366f1;background:#f5f3ff;" : "";',
    '  const safeTitle = escapeHtml(item.title || "未命名");',
    '  const safeUrl = escapeHtml(item.url || "");',
    '  const safeUser = escapeHtml(item.username || "未设定用户名");',
    '  const attrUser = escapeAttr(item.username || "");',
    '  const attrPass = escapeAttr(item.password || "");',
    '  return \'<div class="item-card" style="\' + style + \'">\' +',
    '    \'<div class="item-title"><span>\' + safeTitle + \'</span><span style="font-size:10px;color:#94a3b8;font-weight:normal;">\' + safeUrl + \'</span></div>\' +',
    '    \'<div class="item-user">\' + safeUser + \'</div>\' +',
    '    \'<div class="actions">\' +',
    '    \'<button class="btn btn-xs autofill-btn" data-user="\' + attrUser + \'" data-pass="\' + attrPass + \'">⚡ 一键填充</button>\' +',
    '    \'<button class="btn btn-xs btn-secondary copy-pass-btn" data-pass="\' + attrPass + \'">🔑 复制密码</button>\' +',
    '    \'</div></div>\';',
    '}',
    '',
    'function escapeHtml(str) {',
    '  return String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");',
    '}',
    '',
    'function escapeAttr(str) {',
    '  return String(str).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/\'/g, "&#39;");',
    '}'
  ].join('\n');
  zip.file("popup.js", popupJs);

  // 7. icons
  zip.file("icons/icon.svg", createExtensionIconSvg());

  // 8. README.md
  const readmeContent = `# SecureVault Manifest V3 浏览器扩展安装指南

## 🚀 支持的浏览器

本扩展基于 W3C WebExtensions Manifest V3 标准开发，支持 10+ 款浏览器：

1. Google Chrome (Windows / macOS / Linux / ChromeOS)
2. Microsoft Edge (Windows / macOS)
3. Brave Browser
4. Firefox / Mozilla 火狐
5. Safari (macOS)
6. Arc Browser
7. Vivaldi
8. Opera / Opera GX
9. Kiwi Browser (Android)
10. Orion Browser (macOS / iOS)

## 🛠️ 安装步骤 (Chromium 浏览器)

1. 解压下载的 SecureVault_Browser_Extension.zip 到本地文件夹。
2. 在浏览器地址栏输入 chrome://extensions/ (Edge: edge://extensions/)
3. 开启右上角 **"开发者模式"** 开关。
4. 点击 **"加载已解压的扩展程序"**，选择解压目录即可！

## 🔐 零知识安全机制

- 扩展内嵌由 SecureVault 桌面应用导出的 AES-256-GCM 加密备份
- 解锁时通过 Web Crypto API 在本地执行 PBKDF2 密钥派生 + AES-GCM 解密
- 解锁后 15 分钟无操作自动锁定并清空内存
- 无任何网络请求，100% 本地运行

> 如需更换凭证数据，请在桌面应用中重新导出备份并重新打包扩展。
`;
  zip.file("README.md", readmeContent);

  return zip.generateAsync({ type: "blob" });
}
