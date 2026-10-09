// DeleteConfirmModal — 安全擦除 / 删除确认弹窗

import React from "react";
import { ShieldAlert } from "lucide-react";
import { t } from "../i18n";

export interface DeleteConfirmData {
  type: "item" | "folder";
  id: string;
  name: string;
}

export interface DeleteConfirmModalProps {
  data: DeleteConfirmData;
  onConfirm: () => void;
  onCancel: () => void;
}

export const DeleteConfirmModal: React.FC<DeleteConfirmModalProps> = ({ data, onConfirm, onCancel }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
    <div className="bg-white rounded-xl border border-slate-200 p-6 max-w-sm w-full shadow-2xl relative font-sans">
      <div className="flex items-center space-x-2.5 text-rose-600 mb-2">
        <ShieldAlert className="w-5 h-5 shrink-0" />
        <h3 className="text-sm font-bold">{t("高强度安全擦除确认")}</h3>
      </div>
      <p className="text-[11px] text-slate-500 leading-relaxed mb-5">
        {data.type === "item" ? (
          <>
            {t("确定要从本端安全沙箱中彻底")} <strong className="text-rose-600">{t("物理擦除并覆写粉碎")}</strong> {t("密码凭证")} <strong className="text-slate-800">「{data.name}」</strong> {t("吗？此安全擦除操作不可逆，数据粉碎后无法恢复。")}
          </>
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
          className="bg-rose-600 hover:bg-rose-700 text-white px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors shadow-sm cursor-pointer">{t("确认安全擦除")}</button>
      </div>
    </div>
  </div>
);
