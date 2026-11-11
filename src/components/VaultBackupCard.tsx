// VaultBackupCard.tsx — 本地自动备份轮转（v1.8.0）
// 每次保存时自动保留最近 5 份备份（间隔至少 10 分钟），可一键恢复。
import { useEffect, useState } from "react";
import { ArchiveRestore, HardDriveDownload } from "lucide-react";
import { t, localizeError } from "../i18n";
import { listVaultBackups, restoreVaultBackup, type VaultBackupInfo } from "../utils/tauriBridge";

function formatBackupTime(modified: string | null): string {
  if (!modified) return "—";
  try {
    return new Date(Number(modified) * 1000).toLocaleString();
  } catch {
    return modified;
  }
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export default function VaultBackupCard() {
  const [backups, setBackups] = useState<VaultBackupInfo[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");

  const load = async () => {
    try {
      setBackups(await listVaultBackups());
    } catch {
      setBackups([]);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const handleRestore = async (name: string) => {
    if (!window.confirm(t("确定要恢复此备份吗？当前数据会先自动备份一份，应用随后重新加载。"))) return;
    setBusy(true);
    setStatus("");
    try {
      await restoreVaultBackup(name);
      setStatus(t("已恢复备份，应用将重新加载。"));
      setTimeout(() => window.location.reload(), 1200);
    } catch (e) {
      setStatus(t("❌ 恢复备份失败: ") + localizeError(e));
      setBusy(false);
    }
  };

  return (
    <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm space-y-4 text-left">
      <div className="border-b border-slate-100 pb-4">
        <h4 className="text-xs font-black text-slate-800 flex items-center space-x-2 uppercase tracking-wide">
          <HardDriveDownload className="w-4 h-4 text-indigo-500" />
          <span>{t("本地自动备份")}</span>
        </h4>
        <p className="text-[10px] text-slate-400 mt-1 leading-relaxed">
          {t("每次保存时自动保留最近 5 份备份（间隔至少 10 分钟），用于误操作或文件损坏时恢复。")}
        </p>
      </div>

      {backups === null ? (
        <p className="text-[10px] text-slate-400">{t("加载中...")}</p>
      ) : backups.length === 0 ? (
        <p className="text-[10px] text-slate-400">{t("暂无备份（保存后会自动生成）")}</p>
      ) : (
        <div className="space-y-1.5 max-h-48 overflow-y-auto">
          {backups.map((b) => (
            <div
              key={b.name}
              className="flex items-center justify-between bg-slate-50 border border-slate-200/60 rounded-lg px-3 py-2"
            >
              <div className="min-w-0">
                <p className="text-[11px] text-slate-700 font-mono truncate">{formatBackupTime(b.modified)}</p>
                <p className="text-[9px] text-slate-400 mt-0.5">{formatSize(b.size)}</p>
              </div>
              <button
                type="button"
                onClick={() => handleRestore(b.name)}
                disabled={busy}
                className="shrink-0 text-[10px] font-bold text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-100 rounded-lg px-2.5 py-1.5 transition-colors cursor-pointer disabled:opacity-50 flex items-center space-x-1"
              >
                <ArchiveRestore className="w-3 h-3" />
                <span>{t("恢复")}</span>
              </button>
            </div>
          ))}
        </div>
      )}

      {status && <p className="text-[10px] text-slate-500 leading-relaxed break-words">{status}</p>}
    </div>
  );
}
