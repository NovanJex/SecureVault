// ImportPasswordModal — 导入备份密码输入弹窗

import React, { useState } from "react";
import { Lock, Eye, EyeOff, ShieldAlert, RefreshCw } from "lucide-react";
import { motion } from "motion/react";
import { t } from "../i18n";

export interface ImportPasswordModalProps {
  importPassword: string;
  setImportPassword: (v: string) => void;
  importPasswordError: string;
  isDeriving: boolean;
  derivationProgress: string;
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
}

export const ImportPasswordModal: React.FC<ImportPasswordModalProps> = ({
  importPassword, setImportPassword, importPasswordError,
  isDeriving, derivationProgress,
  onSubmit, onCancel,
}) => {
  const [showPassword, setShowPassword] = useState(false);
  return (
  <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
    <div className="bg-white rounded-xl border border-slate-200 p-6 max-w-sm w-full shadow-2xl relative font-sans">
      <div className="flex items-center space-x-2.5 text-indigo-600 mb-2">
        <Lock className="w-5 h-5 shrink-0" />
        <h3 className="text-sm font-bold text-slate-900">{t("备份文件解密")}</h3>
      </div>
      <p className="text-[11px] text-slate-500 leading-relaxed mb-4">
        {t("此备份文件已加密。请输入创建该备份时使用的主密码进行解密。")}
      </p>

      <form onSubmit={onSubmit} noValidate className="space-y-4">
        <div>
          <label className="block text-[10px] font-bold text-slate-400 tracking-wider uppercase mb-1">{t("解密密码")}</label>
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              disabled={isDeriving}
              value={importPassword}
              onChange={(e) => { setImportPassword(e.target.value); }}
              placeholder={t("请输入备份文件的解密密码")}
              className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:bg-white rounded-lg pl-3 pr-10 py-2 text-xs outline-none text-slate-800 font-mono transition-all disabled:opacity-60 disabled:cursor-not-allowed"
            />
            <button
              type="button"
              disabled={isDeriving}
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-2.5 text-slate-400 hover:text-indigo-600 transition-colors focus:outline-none cursor-pointer flex items-center justify-center disabled:opacity-50"
              title={showPassword ? t("隐藏密码") : t("显示密码")}
            >
              {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {importPasswordError && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-rose-50 border border-rose-100 rounded-lg px-3 py-2 text-rose-600 text-[10px] font-medium flex items-center space-x-1.5"
          >
            <ShieldAlert className="w-3.5 h-3.5 text-rose-500 shrink-0" />
            <span className="leading-relaxed">{importPasswordError}</span>
          </motion.div>
        )}

        {isDeriving && derivationProgress && (
          <div className="p-3 bg-indigo-50/50 border border-indigo-100 rounded-lg flex items-start space-x-2 text-[10px] text-left text-indigo-700 font-mono animate-pulse">
            <RefreshCw className="w-3.5 h-3.5 text-indigo-500 animate-spin shrink-0 mt-0.5" />
            <span className="leading-relaxed break-all">{derivationProgress}</span>
          </div>
        )}

        <div className="flex space-x-2.5 justify-end pt-1">
          <button
            type="button"
            disabled={isDeriving}
            onClick={onCancel}
            className="bg-slate-100 hover:bg-slate-200 disabled:bg-slate-50 disabled:text-slate-400 text-slate-700 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer disabled:cursor-not-allowed"
          >
            {t("取消")}
          </button>
          <button
            type="submit"
            disabled={isDeriving}
            className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 disabled:text-white/80 text-white px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors shadow-sm cursor-pointer disabled:cursor-not-allowed flex items-center space-x-1"
          >
            {isDeriving && <RefreshCw className="w-3 h-3 animate-spin" />}
            <span>{isDeriving ? t("解密中...") : t("解密并导入")}</span>
          </button>
        </div>
      </form>
    </div>
  </div>
  );
};
