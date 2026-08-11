// BrowserImportPreview — 浏览器密码导入预览弹窗

import React, { useState, useCallback } from "react";
import {
  Download,
  AlertTriangle,
  Check,
  Globe,
  X,
  FileText,
} from "lucide-react";
import { VaultItem } from "../types";
import { ImportResult } from "../utils/browserImport";

interface BrowserImportPreviewProps {
  importResult: ImportResult;
  duplicates: number;
  existingCount: number;
  importStrategy: "merge" | "skip-duplicates";
  setImportStrategy: (s: "merge" | "skip-duplicates") => void;
  onConfirm: () => void;
  onCancel: () => void;
}

const browserLabel: Record<string, string> = {
  chrome: "Chrome / Edge",
  firefox: "Firefox",
  "1password": "1Password",
  lastpass: "LastPass",
  "bitwarden-csv": "Bitwarden (CSV)",
  "bitwarden-json": "Bitwarden (JSON)",
  safari: "Safari",
  kdbx: "KeePass (.kdbx)",
  unknown: "未知来源",
};

export const BrowserImportPreview: React.FC<BrowserImportPreviewProps> = ({
  importResult,
  duplicates,
  existingCount,
  importStrategy,
  setImportStrategy,
  onConfirm,
  onCancel,
}) => {
  const { items, total, skipped, browserType } = importResult;
  const [visibleCount, setVisibleCount] = useState(30);
  const hasMore = visibleCount < items.length;

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    if (scrollHeight - scrollTop - clientHeight < 60 && hasMore) {
      setVisibleCount(prev => Math.min(prev + 20, items.length));
    }
  }, [hasMore, items.length]);

  if (items.length === 0) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
        <div className="bg-white rounded-xl border border-slate-200 p-6 max-w-md w-full shadow-2xl">
          <div className="text-center space-y-4">
            <AlertTriangle className="w-10 h-10 text-amber-500 mx-auto" />
            <div>
              <h3 className="text-sm font-bold text-slate-800">无法识别导入文件</h3>
              <p className="text-[11px] text-slate-500 mt-1">
                {browserType === "unknown"
                  ? "CSV 格式不被识别。目前支持 Chrome、Edge、Firefox 导出的密码文件。"
                  : "文件中没有有效的密码记录。"}
              </p>
            </div>
            <button
              onClick={onCancel}
              className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
            >
              关闭
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
      <div className="bg-white rounded-xl border border-slate-200 p-6 max-w-2xl w-full shadow-2xl max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
          <div className="flex items-center space-x-2">
            <Globe className="w-5 h-5 text-indigo-600" />
            <div>
              <h3 className="text-sm font-bold text-slate-800">导入浏览器密码</h3>
              <p className="text-[10px] text-slate-400 mt-0.5">
                检测到 {browserLabel[browserType]} 格式
              </p>
            </div>
          </div>
          <button
            onClick={onCancel}
            className="text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Summary: 可导入数量跟随策略 */}
        {(() => {
          const nonDups = items.filter(i => !i.title.includes("(重复)")).length;
          const willImport = importStrategy === "skip-duplicates" ? nonDups : items.length;
          return (
            <div className="grid grid-cols-4 gap-3 mb-4">
              <div className={`rounded-lg p-2.5 text-center ${importStrategy === "skip-duplicates" && duplicates > 0 ? "bg-emerald-50" : "bg-indigo-50"}`}>
                <p className={`text-lg font-bold ${importStrategy === "skip-duplicates" && duplicates > 0 ? "text-emerald-700" : "text-indigo-700"}`}>{willImport}</p>
                <p className={`text-[10px] ${importStrategy === "skip-duplicates" && duplicates > 0 ? "text-emerald-500" : "text-indigo-500"}`}>
                  {importStrategy === "skip-duplicates" && duplicates > 0 ? "将导入" : "可导入"}
                </p>
              </div>
              <div className="bg-slate-50 rounded-lg p-2.5 text-center">
                <p className="text-lg font-bold text-slate-700">{total}</p>
                <p className="text-[10px] text-slate-500">总记录</p>
              </div>
              <div className="bg-amber-50 rounded-lg p-2.5 text-center">
                <p className="text-lg font-bold text-amber-700">{duplicates}</p>
                <p className="text-[10px] text-amber-500">域名重复</p>
              </div>
              <div className="bg-slate-50 rounded-lg p-2.5 text-center">
                <p className="text-lg font-bold text-slate-700">{existingCount}</p>
                <p className="text-[10px] text-slate-500">已有记录</p>
              </div>
            </div>
          );
        })()}

        {/* 固定表头 */}
        <table className="w-full text-left text-[11px] table-fixed rounded-t-lg overflow-hidden border border-slate-200 border-b-0 shrink-0">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-2.5 py-2 font-bold text-slate-600 w-[22%]">标题</th>
              <th className="px-2.5 py-2 font-bold text-slate-600 w-[20%]">账号</th>
              <th className="px-2.5 py-2 font-bold text-slate-600 w-[18%]">密码</th>
              <th className="px-2.5 py-2 font-bold text-slate-600 w-[28%]">URL</th>
              <th className="px-2.5 py-2 font-bold text-slate-600 w-[12%] text-center">状态</th>
            </tr>
          </thead>
        </table>
        {/* 滚动数据区 */}
        <div className="flex-1 overflow-y-auto border border-slate-200 border-t-0 rounded-b-lg mb-4" style={{ scrollbarGutter: "stable" }} onScroll={handleScroll}>
          <table className="w-full text-left text-[11px] table-fixed">
            <tbody className="divide-y divide-slate-100">
              {items.slice(0, visibleCount).map((item, idx) => {
                const isDup = item.title.includes("(重复)");
                const willSkip = isDup && importStrategy === "skip-duplicates";
                const rowClass = willSkip ? "bg-slate-100 opacity-50" : isDup ? "bg-amber-50/50" : "";
                const cellClass = willSkip ? "line-through text-slate-400" : "";
                return (
                  <tr key={idx} className={`${rowClass} group`}>
                    <td className={`px-2.5 py-1.5 font-medium truncate ${cellClass}`}>
                      {item.title.replace(" (重复)", "")}
                    </td>
                    <td className={`px-2.5 py-1.5 font-mono truncate ${cellClass}`}>
                      {item.username || "—"}
                    </td>
                    <td className={`px-2.5 py-1.5 font-mono truncate ${cellClass}`}>
                      <span className="group-hover:hidden text-slate-400">••••••</span>
                      <span className="hidden group-hover:inline">{item.password || "—"}</span>
                    </td>
                    <td className={`px-2.5 py-1.5 truncate ${cellClass}`}>
                      {item.url || "—"}
                    </td>
                    <td className="px-2.5 py-1.5 text-center">
                      {willSkip ? (
                        <span className="inline-flex items-center space-x-0.5 text-[10px] text-slate-400 font-bold">
                          <X className="w-3 h-3" />
                          <span>跳过</span>
                        </span>
                      ) : isDup ? (
                        <span className="inline-flex items-center space-x-0.5 text-[10px] text-amber-600 font-medium">
                          <AlertTriangle className="w-3 h-3" />
                          <span>重复</span>
                        </span>
                      ) : (
                        <Check className="w-3 h-3 text-emerald-500 mx-auto" />
                      )}
                    </td>
                  </tr>
                );
              })}
              {hasMore && (
                <tr>
                  <td colSpan={5} className="px-3 py-2 text-center text-[10px] text-slate-400">
                    向下滚动加载更多（剩余 {items.length - visibleCount} 条）
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Import Strategy + Buttons */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="text-[10px] text-slate-500">导入策略:</span>
            <div className="flex bg-slate-100 p-0.5 rounded-lg text-[10px] font-medium">
              <button
                onClick={() => setImportStrategy("merge")}
                className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                  importStrategy === "merge"
                    ? "bg-white text-indigo-600 shadow-sm font-bold"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                合并（保留已有）
              </button>
              <button
                onClick={() => setImportStrategy("skip-duplicates")}
                className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                  importStrategy === "skip-duplicates"
                    ? "bg-white text-indigo-600 shadow-sm font-bold"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                跳过重复项
              </button>
            </div>
          </div>

          <div className="flex space-x-2">
            <button
              onClick={onCancel}
              className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
            >
              取消
            </button>
            <button
              onClick={onConfirm}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors shadow-sm cursor-pointer flex items-center space-x-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              <span>确认导入 {items.length} 条</span>
            </button>
          </div>
        </div>

        {duplicates > 0 && (
          <p className="text-[10px] text-amber-600 mt-2 flex items-center space-x-1">
            <AlertTriangle className="w-3 h-3" />
            <span>检测到 {duplicates} 条可能与已有记录重复，导入前请确认策略。</span>
          </p>
        )}
      </div>
    </div>
  );
};
