// UpToDateModal.tsx — 检查更新结果弹窗：已是最新版本
// 与 UpdateModal 保持同一视觉语言（indigo/slate，圆角卡片，遮罩可点击关闭）
import { CheckCircle2, X } from "lucide-react";
import { t } from "../i18n";

interface UpToDateModalProps {
  open: boolean;
  currentVersion: string;
  onClose: () => void;
}

export default function UpToDateModal({ open, currentVersion, onClose }: UpToDateModalProps) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 text-center font-sans relative"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute top-3 right-3 p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
          title={t("关闭")}
        >
          <X className="w-4 h-4" />
        </button>

        <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center mx-auto mb-4">
          <CheckCircle2 className="w-6 h-6 text-emerald-500" />
        </div>

        <h3 className="text-sm font-black text-slate-800">{t("已是最新版本")}</h3>
        <p className="text-[11px] text-slate-400 mt-1.5 leading-relaxed">
          {t("你正在使用最新版本的 SecureVault。")}
        </p>

        <div className="mt-3 inline-flex items-center space-x-1.5 bg-slate-50 border border-slate-200/60 rounded-lg px-3 py-1.5">
          <span className="text-[10px] text-slate-400">{t("当前版本")}</span>
          <span className="text-[10px] font-mono font-bold text-slate-600">{currentVersion || "…"}</span>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="w-full mt-5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs py-2.5 rounded-xl transition shadow-md cursor-pointer"
        >
          {t("好的")}
        </button>
      </div>
    </div>
  );
}
