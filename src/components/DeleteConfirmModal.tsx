// DeleteConfirmModal — 安全擦除 / 移入回收站 / 文件夹删除确认弹窗

import React from "react";
import { ShieldAlert, Trash2 } from "lucide-react";
import { t } from "../i18n";

export interface DeleteConfirmData {
  type: "item" | "folder";
  id: string;
  name: string;
  /** item 删除模式：trash=移入回收站（默认），erase=彻底删除 */
  mode?: "trash" | "erase";
}

export interface DeleteConfirmModalProps {
  data: DeleteConfirmData;
  onConfirm: () => void;
  onCancel: () => void;
}

export const DeleteConfirmModal: React.FC<DeleteConfirmModalProps> = ({ data, onConfirm, onCancel }) => {
  const isTrash = data.type === "item" && data.mode !== "erase";
  return (
  <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
    <div className="bg-white rounded-xl border border-slate-200 p-6 max-w-sm w-full shadow-2xl relative font-sans">
      <div className={`flex items-center space-x-2.5 mb-2 ${isTrash ? "text-slate-600" : "text-rose-600"}`}>
        {isTrash ? <Trash2 className="w-5 h-5 shrink-0" /> : <ShieldAlert className="w-5 h-5 shrink-0" />}
        <h3 className="text-sm font-bold">{isTrash ? t("移入回收站确认") : t("高强度安全擦除确认")}</h3>
      </div>
      <p className="text-[11px] text-slate-500 leading-relaxed mb-5">
        {data.type === "item" ? (
          isTrash ? (
            <>
              {t("确定要将")} <strong className="text-slate-800">「{data.name}」</strong>{t("移入回收站吗？可在回收站中恢复或彻底删除。")}
            </>
          ) : (
            <>
              {t("确定要从本端安全沙箱中彻底")} <strong className="text-rose-600">{t("物理擦除并覆写粉碎")}</strong> {t("密码凭证")} <strong className="text-slate-800">「{data.name}」</strong> {t("吗？此安全擦除操作不可逆，数据粉碎后无法恢复。")}
            </>
          )
        ) : (
          <>
            {t("确定要删除本地分类文件夹")} <strong className="text-slate-800">「{data.name}」</strong>{t("吗？删除后，其中的凭证条目将自动归为未分类。")}
          </>
        )}
      </p>
      <div className="flex space-x-2.5 justify-end">
        <button type="button" onClick={onCancel}
          className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer">{t("取消")}</button>
        <button type="button" onClick={onConfirm}
          className={`text-white px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors shadow-sm cursor-pointer ${isTrash ? "bg-indigo-600 hover:bg-indigo-700" : "bg-rose-600 hover:bg-rose-700"}`}>{isTrash ? t("移入回收站") : t("确认安全擦除")}</button>
      </div>
    </div>
  </div>
  );
};
