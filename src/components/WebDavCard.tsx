// WebDavCard.tsx — WebDAV 应用内同步（v1.8.0）
// 密文上传（服务端零知识）；凭据用主密钥加密存入 config.json；
// 智能同步：本地/服务器谁更新用谁，双方都变时弹出三选一冲突对话框。
import { useEffect, useMemo, useState } from "react";
import { Cloud, Loader2, RefreshCw, Unplug, TestTube2 } from "lucide-react";
import { t, localizeError } from "../i18n";
import {
  webdavTest, webdavStat, webdavUpload, webdavDownload,
  getWebdavConfig, saveWebdavConfig, clearWebdavConfig,
  encryptVault, decryptVault,
  loadSecureVaultFile, saveSecureVaultFile, computeSha256,
} from "../utils/tauriBridge";

interface WebDavCardProps {
  masterKey: string | null;
}

/** 同步快照：上次同步时的服务器标识 + 本地密文哈希 */
interface SyncSnapshot {
  serverKey: string;
  localHash: string;
  syncedAt: string;
}

const SNAPSHOT_KEY = "sv-webdav-snapshot";

function readSnapshot(): SyncSnapshot | null {
  try {
    const raw = localStorage.getItem(SNAPSHOT_KEY);
    return raw ? (JSON.parse(raw) as SyncSnapshot) : null;
  } catch {
    return null;
  }
}

function writeSnapshot(snap: SyncSnapshot) {
  try {
    localStorage.setItem(SNAPSHOT_KEY, JSON.stringify(snap));
  } catch {
    /* localStorage 不可用时忽略 */
  }
}

export default function WebDavCard({ masterKey }: WebDavCardProps) {
  const [loading, setLoading] = useState(true);
  const [hasSavedPassword, setHasSavedPassword] = useState(false);
  const [form, setForm] = useState({ url: "", username: "", password: "" });
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [conflict, setConflict] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<string>("");

  const isConfigured = hasSavedPassword && form.url.trim().length > 0;

  useEffect(() => {
    (async () => {
      try {
        const cfg = await getWebdavConfig();
        if (cfg) {
          setForm((f) => ({ ...f, url: cfg.url, username: cfg.username }));
          setHasSavedPassword(!!cfg.passwordEnc);
        }
        const snap = readSnapshot();
        if (snap?.syncedAt) setLastSyncedAt(snap.syncedAt);
      } catch {
        /* 忽略配置读取失败 */
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const lastSyncLabel = useMemo(() => {
    if (!lastSyncedAt) return "";
    try {
      return new Date(lastSyncedAt).toLocaleString();
    } catch {
      return lastSyncedAt;
    }
  }, [lastSyncedAt]);

  /** 取当前生效的密码：表单填写优先，否则解密已保存的密文 */
  const resolvePassword = async (): Promise<string> => {
    if (form.password) return form.password;
    if (!masterKey) throw new Error(t("保险箱未解锁，无法读取同步凭据"));
    const cfg = await getWebdavConfig();
    if (!cfg?.passwordEnc) throw new Error(t("请填写服务器地址、用户名和密码"));
    return await decryptVault(cfg.passwordEnc, masterKey);
  };

  /** 测试连接（不保存配置） */
  const handleTest = async () => {
    if (!form.url.trim() || !form.username) {
      setStatus(t("请填写服务器地址、用户名和密码"));
      return;
    }
    setBusy(true);
    setStatus("");
    try {
      const password = await resolvePassword();
      const msg = await webdavTest(form.url, form.username, password);
      setStatus(t("✅ 测试连接成功: ") + msg);
    } catch (e) {
      setStatus(t("❌ 测试连接失败: ") + localizeError(e));
    } finally {
      setBusy(false);
    }
  };

  /** 保存配置（密码用主密钥加密后存储） */
  const handleSave = async () => {
    if (!masterKey) {
      setStatus(t("保险箱未解锁，无法保存同步凭据"));
      return;
    }
    if (!form.url.trim() || !form.username) {
      setStatus(t("请填写服务器地址、用户名和密码"));
      return;
    }
    setBusy(true);
    setStatus("");
    try {
      const password = await resolvePassword();
      const enc = await encryptVault(password, masterKey);
      await saveWebdavConfig(form.url, form.username, enc);
      setHasSavedPassword(true);
      setForm((f) => ({ ...f, password: "" }));
      setStatus(t("✅ 配置已保存"));
    } catch (e) {
      setStatus(t("❌ 保存配置失败: ") + localizeError(e));
    } finally {
      setBusy(false);
    }
  };

  /** 下载服务器数据 → 主密码验证 → 替换本地并重新加载 */
  const applyDownload = async (content: string, serverKey: string) => {
    const colonIdx = content.indexOf(":");
    if (colonIdx === -1) throw new Error(t("服务器文件格式无效"));
    const ciphertext = content.substring(colonIdx + 1);
    if (!masterKey) throw new Error(t("保险箱未解锁，无法验证下载数据"));
    // 用当前主密钥验证服务器数据可解密（防止用错误数据覆盖本地）
    await decryptVault(ciphertext, masterKey);
    await saveSecureVaultFile(content);
    const hash = await computeSha256(content);
    writeSnapshot({ serverKey, localHash: hash, syncedAt: new Date().toISOString() });
    setStatus(t("✅ 已从服务器下载最新数据，正在重新加载…"));
    setTimeout(() => window.location.reload(), 1200);
  };

  /** 上传本地数据并更新快照 */
  const uploadLocal = async (url: string, username: string, password: string, localHash: string) => {
    const stat = await webdavUpload(url, username, password);
    const serverKey = stat.etag || stat.last_modified || "";
    writeSnapshot({ serverKey, localHash, syncedAt: new Date().toISOString() });
    setLastSyncedAt(new Date().toISOString());
    setStatus(t("✅ 已上传到服务器"));
  };

  /** 智能同步 */
  const handleSync = async () => {
    if (!form.url.trim() || !form.username) {
      setStatus(t("请填写服务器地址、用户名和密码"));
      return;
    }
    setBusy(true);
    setStatus("");
    try {
      const password = await resolvePassword();
      const { url, username } = form;

      const localRaw = await loadSecureVaultFile();
      if (!localRaw) throw new Error(t("本地保险箱文件不存在"));
      const localHash = await computeSha256(localRaw);
      const snapshot = readSnapshot();

      const server = await webdavStat(url, username, password);
      if (!server.exists) {
        await uploadLocal(url, username, password, localHash);
        return;
      }

      const serverKey = server.etag || server.last_modified || "";
      const serverChanged = !snapshot || serverKey !== snapshot.serverKey;
      const localChanged = !snapshot || localHash !== snapshot.localHash;

      if (!serverChanged && !localChanged) {
        setStatus(t("已是最新，无需同步"));
        return;
      }
      if (localChanged && !serverChanged) {
        await uploadLocal(url, username, password, localHash);
        return;
      }
      if (serverChanged && !localChanged) {
        const dl = await webdavDownload(url, username, password);
        await applyDownload(dl.content, dl.stat.etag || dl.stat.last_modified || serverKey);
        return;
      }
      // 双方都有更新 → 冲突
      setConflict(true);
    } catch (e) {
      setStatus(t("❌ 同步失败: ") + localizeError(e));
    } finally {
      setBusy(false);
    }
  };

  /** 冲突处理：override = "upload"（本地覆盖服务器）| "download"（服务器覆盖本地） */
  const resolveConflict = async (override: "upload" | "download") => {
    setConflict(false);
    setBusy(true);
    setStatus("");
    try {
      const password = await resolvePassword();
      const { url, username } = form;
      if (override === "upload") {
        const localRaw = await loadSecureVaultFile();
        if (!localRaw) throw new Error(t("本地保险箱文件不存在"));
        const localHash = await computeSha256(localRaw);
        await uploadLocal(url, username, password, localHash);
      } else {
        const dl = await webdavDownload(url, username, password);
        await applyDownload(dl.content, dl.stat.etag || dl.stat.last_modified || "");
      }
    } catch (e) {
      setStatus(t("❌ 同步失败: ") + localizeError(e));
    } finally {
      setBusy(false);
    }
  };

  /** 断开同步（清除配置与快照） */
  const handleDisconnect = async () => {
    if (!window.confirm(t("确定要断开 WebDAV 同步吗？已保存的服务器地址与凭据将被删除。"))) return;
    setBusy(true);
    try {
      await clearWebdavConfig();
      try {
        localStorage.removeItem(SNAPSHOT_KEY);
      } catch {
        /* ignore */
      }
      setForm({ url: "", username: "", password: "" });
      setHasSavedPassword(false);
      setLastSyncedAt("");
      setStatus(t("已断开 WebDAV 同步"));
    } catch (e) {
      setStatus(t("❌ 断开失败: ") + localizeError(e));
    } finally {
      setBusy(false);
    }
  };

  const inputClass =
    "w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-lg px-3 py-2 text-[11px] outline-none text-slate-800";

  return (
    <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm space-y-4 text-left">
      <div className="border-b border-slate-100 pb-4">
        <h4 className="text-xs font-black text-slate-800 flex items-center space-x-2 uppercase tracking-wide">
          <Cloud className="w-4 h-4 text-indigo-500" />
          <span>{t("WebDAV 同步")}</span>
        </h4>
        <p className="text-[10px] text-slate-400 mt-1 leading-relaxed">
          {t("将加密保险箱上传到你的 WebDAV 服务器（坚果云 / NAS / Nextcloud 等），服务端只保存密文，无法读取内容。")}
        </p>
      </div>

      <div className="space-y-2">
        <input
          type="text"
          value={form.url}
          onChange={(e) => setForm((f) => ({ ...f, url: e.target.value }))}
          placeholder="https://dav.jianguoyun.com/dav/SecureVault/vault.enc"
          className={inputClass + " font-mono"}
          spellCheck={false}
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <input
            type="text"
            value={form.username}
            onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))}
            placeholder={t("用户名")}
            className={inputClass}
            spellCheck={false}
            autoComplete="off"
          />
          <input
            type="password"
            value={form.password}
            onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
            placeholder={hasSavedPassword ? t("留空则沿用已保存的密码") : t("应用专用密码")}
            className={inputClass}
            autoComplete="new-password"
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={handleTest}
          disabled={busy || loading}
          className="bg-slate-100 hover:bg-slate-200 disabled:opacity-50 text-slate-700 font-bold text-xs px-3 py-2 rounded-lg transition-colors cursor-pointer disabled:cursor-not-allowed flex items-center space-x-1.5"
        >
          <TestTube2 className="w-3.5 h-3.5" />
          <span>{t("测试连接")}</span>
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={busy || loading}
          className="bg-slate-100 hover:bg-slate-200 disabled:opacity-50 text-slate-700 font-bold text-xs px-3 py-2 rounded-lg transition-colors cursor-pointer disabled:cursor-not-allowed"
        >
          {t("保存配置")}
        </button>
        <button
          type="button"
          onClick={handleSync}
          disabled={busy || loading || !isConfigured}
          className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white font-bold text-xs px-4 py-2 rounded-lg transition-colors shadow-sm cursor-pointer disabled:cursor-not-allowed flex items-center space-x-1.5"
        >
          {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
          <span>{busy ? t("同步中...") : t("立即同步")}</span>
        </button>
        {isConfigured && (
          <button
            type="button"
            onClick={handleDisconnect}
            disabled={busy}
            className="text-[11px] font-medium text-slate-500 hover:text-rose-600 transition-colors cursor-pointer px-1 py-1 disabled:opacity-50"
          >
            <span className="flex items-center space-x-1">
              <Unplug className="w-3 h-3" />
              <span>{t("断开同步")}</span>
            </span>
          </button>
        )}
      </div>

      {lastSyncLabel && (
        <p className="text-[10px] text-slate-400 font-mono">{t("上次同步: ")}{lastSyncLabel}</p>
      )}
      {status && <p className="text-[10px] text-slate-500 leading-relaxed break-words">{status}</p>}

      {/* 同步冲突对话框 */}
      {conflict && (
        <div className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setConflict(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-5 text-left" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-sm font-black text-slate-800">{t("同步冲突")}</h3>
            <p className="text-[11px] text-slate-500 mt-2 leading-relaxed">
              {t("本地与服务器都有更新，请选择保留哪一份：")}
            </p>
            <div className="mt-4 space-y-2">
              <button
                type="button"
                onClick={() => resolveConflict("upload")}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs py-2.5 rounded-lg transition-colors cursor-pointer"
              >
                {t("用本地覆盖服务器")}
              </button>
              <button
                type="button"
                onClick={() => resolveConflict("download")}
                className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs py-2.5 rounded-lg transition-colors cursor-pointer"
              >
                {t("用服务器覆盖本地")}
              </button>
              <button
                type="button"
                onClick={() => setConflict(false)}
                className="w-full text-[11px] font-medium text-slate-500 hover:text-slate-700 py-1.5 cursor-pointer"
              >
                {t("取消")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
