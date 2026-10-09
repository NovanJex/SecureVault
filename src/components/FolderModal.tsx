// FolderModal — 新建文件夹弹窗

import React from "react";
import { ShieldAlert } from "lucide-react";
import { motion } from "motion/react";
import { t } from "../i18n";

export interface FolderModalProps {
  newFolderName: string;
  setNewFolderName: (v: string) => void;
  folderError: string;
  onAddFolder: (e: React.FormEvent) => void;
  onClose: () => void;
}

export const FolderModal: React.FC<FolderModalProps> = ({
  newFolderName, setNewFolderName, folderError, onAddFolder, onClose,
}) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
    <div className="bg-white rounded-xl border border-slate-200 p-6 max-w-sm w-full shadow-2xl relative font-sans">
      <h3 className="text-sm font-bold text-slate-900 mb-1">{t("新建本地分类文件夹")}</h3>
      <p className="text-[11px] text-slate-500 mb-4">{t("创建后，您的密码项可直接归入此类文件夹做密文聚合分类。")}</p>

      <form onSubmit={onAddFolder} noValidate className="space-y-4">
        <div>
          <label className="block text-[10px] font-bold text-slate-400 tracking-wider uppercase mb-1">{t("分类名称")}</label>
          <input type="text" placeholder={t("如: 服务器密钥, 临时网购账户")}
            value={newFolderName}
            onChange={(e) => { setNewFolderName(e.target.value); }}
            className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:bg-white rounded-lg px-3 py-2 text-xs outline-none text-slate-800 font-semibold transition-all" />
        </div>

        {folderError && (
          <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
            className="bg-rose-50 border border-rose-100 rounded-lg px-3 py-2 text-rose-600 text-[10px] font-medium flex items-center space-x-1.5">
            <ShieldAlert className="w-3.5 h-3.5 text-rose-500 shrink-0" />
            <span className="leading-none">{folderError}</span>
          </motion.div>
        )}

        <div className="flex space-x-2.5 justify-end pt-1">
          <button type="button" onClick={onClose}
            className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer">{t("取消")}</button>
          <button type="submit"
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors shadow-sm cursor-pointer">{t("确认新建")}</button>
        </div>
      </form>
    </div>
  </div>
);
