// UpdateModal.tsx — 应用内更新弹窗（Markdown 更新说明 + 下载进度 + 安装状态）
// 设计参考 Clash Verge Rev 的更新弹窗，样式沿用项目 indigo/slate 规范
import type { ReactNode } from "react";
import { Download, ExternalLink, Loader2, RefreshCw, X } from "lucide-react";
import { t } from "../i18n";

export type UpdatePhase = "idle" | "downloading" | "installing" | "error";

interface UpdateModalProps {
  open: boolean;
  version: string;
  currentVersion: string;
  notes: string;
  phase: UpdatePhase;
  progress: number;
  error?: string;
  onClose: () => void;
  onInstall: () => void;
  onOpenRelease: () => void;
}

/** 行内格式：**粗体** 与 `代码` */
function renderInline(text: string, keyBase: string): ReactNode[] {
  const parts: ReactNode[] = [];
  const re = /(\*\*[^*]+\*\*|`[^`]+`)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    const token = m[0];
    if (token.startsWith("**")) {
      parts.push(
        <strong key={`${keyBase}-b${i}`} className="font-bold text-slate-800">
          {token.slice(2, -2)}
        </strong>
      );
    } else {
      parts.push(
        <code key={`${keyBase}-c${i}`} className="px-1 py-0.5 bg-slate-100 rounded text-[10px] font-mono text-indigo-600">
          {token.slice(1, -1)}
        </code>
      );
    }
    last = m.index + token.length;
    i++;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}

/** 轻量 Markdown 渲染：### 标题 / **粗体** / `代码` / - 列表 / > 引用 / --- 分隔线 */
function renderMarkdown(md: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  let listItems: string[] = [];
  let key = 0;

  const flushList = () => {
    if (listItems.length === 0) return;
    nodes.push(
      <ul key={`ul-${key++}`} className="space-y-1 my-1">
        {listItems.map((item, i) => (
          <li key={i} className="text-[11px] text-slate-600 leading-relaxed pl-3 relative">
            <span className="absolute left-0 top-[0.45em] w-1 h-1 rounded-full bg-slate-300" />
            {renderInline(item, `li-${key}-${i}`)}
          </li>
        ))}
      </ul>
    );
    listItems = [];
  };

  for (const raw of md.split("\n")) {
    const line = raw.trim();
    if (!line) {
      flushList();
      continue;
    }
    if (line.startsWith("### ")) {
      flushList();
      nodes.push(
        <h4 key={`h-${key++}`} className="text-[11px] font-black text-slate-800 uppercase tracking-wide mt-4 first:mt-0 mb-1.5">
          {renderInline(line.slice(4), `h4-${key}`)}
        </h4>
      );
    } else if (line.startsWith("- ")) {
      listItems.push(line.slice(2));
    } else if (line.startsWith(">")) {
      flushList();
      const quote = line.replace(/^>\s?/, "");
      if (quote.trim() === "---") {
        nodes.push(<hr key={`hr-${key++}`} className="border-slate-100 my-2" />);
      } else if (quote.trim()) {
        nodes.push(
          <div key={`q-${key++}`} className="text-[10px] text-slate-500 bg-slate-50 border-l-2 border-slate-200 rounded-r-lg px-2.5 py-1.5 my-1 leading-relaxed">
            {renderInline(quote, `q-${key}`)}
          </div>
        );
      }
    } else if (line === "---") {
      flushList();
      nodes.push(<hr key={`hr-${key++}`} className="border-slate-100 my-2" />);
    } else {
      flushList();
      nodes.push(
        <p key={`p-${key++}`} className="text-[11px] text-slate-600 leading-relaxed my-1">
          {renderInline(line, `p-${key}`)}
        </p>
      );
    }
  }
  flushList();
  return nodes;
}

export default function UpdateModal({
  open,
  version,
  currentVersion,
  notes,
  phase,
  progress,
  error,
  onClose,
  onInstall,
  onOpenRelease,
}: UpdateModalProps) {
  if (!open) return null;

  const busy = phase === "downloading" || phase === "installing";
  const closable = !busy;

  return (
    <div
      className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={() => closable && onClose()}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden font-sans"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 pt-5 pb-4 border-b border-slate-100 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="text-sm font-black text-slate-800 flex items-center space-x-2">
              <RefreshCw className="w-4 h-4 text-indigo-500 shrink-0" />
              <span>{t("发现新版本")} v{version}</span>
            </h3>
            <p className="text-[10px] text-slate-400 mt-1 font-mono">
              {t("当前版本")} {currentVersion || "…"}
            </p>
          </div>
          <div className="flex items-center space-x-2 shrink-0">
            <button
              type="button"
              onClick={onOpenRelease}
              className="text-[10px] font-bold text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-100 rounded-lg px-2.5 py-1.5 transition-colors cursor-pointer flex items-center space-x-1"
            >
              <span>{t("前往发布页")}</span>
              <ExternalLink className="w-3 h-3" />
            </button>
            {closable && (
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                title={t("关闭")}
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Release notes */}
        <div className="flex-1 overflow-y-auto px-5 py-4 min-h-[120px]">
          {notes.trim() ? (
            <div className="space-y-0.5">{renderMarkdown(notes)}</div>
          ) : (
            <p className="text-[11px] text-slate-400 italic">{t("暂无更新说明")}</p>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-slate-100 space-y-3">
          {phase === "downloading" && (
            <div className="space-y-1.5">
              <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-indigo-500 rounded-full transition-all duration-300"
                  style={{ width: `${Math.max(progress, 2)}%` }}
                />
              </div>
              <p className="text-[10px] text-slate-500 font-mono">
                {t("正在下载更新...")} {progress}%
              </p>
            </div>
          )}

          {phase === "installing" && (
            <p className="text-[10px] text-slate-500 font-mono flex items-center space-x-1.5">
              <Loader2 className="w-3 h-3 animate-spin text-indigo-500" />
              <span>{t("下载完成，正在安装...")}</span>
            </p>
          )}

          {phase === "error" && error && (
            <p className="text-[10px] text-rose-600 leading-relaxed break-words">{error}</p>
          )}

          <div className="flex items-center justify-end space-x-2">
            {phase === "idle" && (
              <>
                <button
                  type="button"
                  onClick={onClose}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs px-4 py-2 rounded-lg transition-colors cursor-pointer"
                >
                  {t("稍后")}
                </button>
                <button
                  type="button"
                  onClick={onInstall}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-4 py-2 rounded-lg transition-colors shadow-sm cursor-pointer flex items-center space-x-1.5"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>{t("下载并安装")}</span>
                </button>
              </>
            )}

            {phase === "downloading" && (
              <button
                type="button"
                disabled
                className="bg-indigo-300 text-white font-bold text-xs px-4 py-2 rounded-lg cursor-not-allowed flex items-center space-x-1.5"
              >
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>{t("下载中")} {progress}%</span>
              </button>
            )}

            {phase === "installing" && (
              <button
                type="button"
                disabled
                className="bg-indigo-300 text-white font-bold text-xs px-4 py-2 rounded-lg cursor-not-allowed flex items-center space-x-1.5"
              >
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>{t("正在安装，应用即将重启...")}</span>
              </button>
            )}

            {phase === "error" && (
              <>
                <button
                  type="button"
                  onClick={onClose}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs px-4 py-2 rounded-lg transition-colors cursor-pointer"
                >
                  {t("关闭")}
                </button>
                <button
                  type="button"
                  onClick={onInstall}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-4 py-2 rounded-lg transition-colors shadow-sm cursor-pointer flex items-center space-x-1.5"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>{t("重试")}</span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
