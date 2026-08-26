// CredentialDetail — 凭证详情（登录账号 / 虚拟卡券 / 安全备忘 / 密保资料）

import React, { useState, useEffect } from "react";
import {
  ShieldCheck, User, CreditCard, FileText, FileCheck2,
  Edit3, Trash2, Copy, Eye, EyeOff, ExternalLink,
  AlertTriangle, Star, Clock, KeyRound
} from "lucide-react";
import type { VaultItem } from "../types";
import { generateTotp } from "../utils/tauriBridge";

export interface CredentialDetailProps {
  item: VaultItem;
  revealedPasswords: Record<string, boolean>;
  onToggleReveal: (key: string) => void;
  onToggleFavorite: (id: string) => void;
  onCopy: (text: string, label: string) => void;
  onOpenUrl: (url: string) => void;
  onEdit: () => void;
  onDelete: (id: string, title: string) => void;
  onToggleIgnoreWarning: (id: string) => void;
  passMap: Record<string, number>;
}

export const CredentialDetail: React.FC<CredentialDetailProps> = ({
  item, revealedPasswords, onToggleReveal, onToggleFavorite,
  onCopy, onOpenUrl, onEdit, onDelete, onToggleIgnoreWarning, passMap,
}) => (
  <div className="flex-1 flex flex-col overflow-hidden font-sans bg-slate-50">
    {/* Top Header */}
    <div className="pt-4 pb-3 px-4 md:px-6 bg-slate-50 flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0 font-sans">
      <div className="flex items-center space-x-2 text-left">
        <ShieldCheck className="w-5 h-5 text-blue-600 shrink-0" />
        <div>
          <h3 className="text-xs font-bold text-slate-800 leading-tight">安全凭证控制台</h3>
          <p className="text-[10px] text-slate-400 mt-0.5">本地沙盒安全区解密视图</p>
        </div>
      </div>
      <div className="flex items-center space-x-1.5 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200 shrink-0 self-start md:self-auto">
        <span className="w-1.5 h-1.5 rounded-full bg-blue-500 block animate-pulse"></span>
        <span className="text-[9px] font-bold text-blue-600 font-mono tracking-wider">SECURE ACTIVE</span>
      </div>
    </div>

    {/* Content */}
    <div className="flex-1 overflow-y-auto p-4 md:p-8 bg-slate-50">
      <div className="max-w-5xl mx-auto bg-white border border-slate-200/80 rounded-2xl p-6 md:p-8 shadow-sm space-y-6">
        <div className="space-y-6">
          {/* Item header */}
          <div className="flex items-start justify-between border-b border-slate-200 pb-4">
            <div className="flex items-center space-x-4">
              <div className={`w-14 h-14 rounded-xl flex items-center justify-center shrink-0 shadow-sm border ${
                item.type === "login" ? "bg-blue-50 border-blue-100 text-blue-600" :
                item.type === "card" ? "bg-emerald-50 border-emerald-100 text-emerald-600" :
                item.type === "note" ? "bg-sky-50 border-sky-100 text-sky-600" :
                "bg-amber-50 border-amber-100 text-amber-600"
              }`}>
                {item.type === "login" && <User className="w-7 h-7" />}
                {item.type === "card" && <CreditCard className="w-7 h-7" />}
                {item.type === "note" && <FileText className="w-7 h-7" />}
                {item.type === "identity" && <FileCheck2 className="w-7 h-7" />}
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h1 className="text-xl font-bold text-slate-900 leading-none">{item.title}</h1>
                  {item.expiresAt && (() => {
                    const days = Math.ceil((new Date(item.expiresAt + "T23:59:59").getTime() - Date.now()) / 86400000);
                    if (days < 0) {
                      return <span className="text-[10px] font-bold bg-rose-100 text-rose-700 px-2 py-0.5 rounded shrink-0">已于 {item.expiresAt} 过期</span>;
                    }
                    if (days <= 30) {
                      return <span className="text-[10px] font-bold bg-amber-100 text-amber-700 px-2 py-0.5 rounded shrink-0">剩 {days} 天到期</span>;
                    }
                    return <span className="text-[10px] font-bold bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded shrink-0">{item.expiresAt} 到期</span>;
                  })()}
                  <button onClick={() => onToggleFavorite(item.id)}
                    className={`p-1 rounded-md transition-all ${item.isFavorite ? "text-amber-500 hover:text-amber-600 bg-amber-50/50" : "text-slate-300 hover:text-amber-400"}`}
                    title={item.isFavorite ? "取消星标" : "加入星标"}>
                    <Star className={`w-4 h-4 ${item.isFavorite ? "fill-amber-400 text-amber-500" : ""}`} />
                  </button>
                </div>
                <p className="text-[10px] font-mono text-slate-400 mt-2">UUID: {item.id} · 归属分类: {item.folder}</p>
              </div>
            </div>
            <div className="flex items-center space-x-2 shrink-0">
              <button onClick={onEdit}
                className="px-3.5 py-2 bg-white hover:bg-slate-50 border border-slate-200 rounded-md text-xs font-semibold text-slate-700 transition shadow-sm flex items-center space-x-1.5 cursor-pointer">
                <Edit3 className="w-3.5 h-3.5" /><span>编辑条目</span>
              </button>
              <button onClick={() => onDelete(item.id, item.title)}
                className="px-3.5 py-2 bg-white hover:bg-rose-50 border border-slate-200 rounded-md text-xs font-semibold text-rose-600 transition shadow-sm flex items-center space-x-1.5 cursor-pointer">
                <Trash2 className="w-3.5 h-3.5" /><span>安全擦除</span>
              </button>
            </div>
          </div>

          {/* Detail fields by type */}
          <div className="space-y-6">
            {item.type === "login" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                <Field label="用户名 / 登录邮箱" value={item.username || ""} onCopy={() => onCopy(item.username || "", "用户名")} />
                <div className="border-b border-slate-100 pb-2.5 relative group">
                  <p className="text-[10px] font-bold text-slate-400 tracking-wider uppercase">密码安全密文</p>
                  <div className="flex items-center justify-between mt-1.5">
                    <p className="text-xs font-bold text-slate-800 font-mono tracking-widest">
                      {revealedPasswords[item.id] ? item.password : "••••••••••••••••"}
                    </p>
                    <div className="flex items-center space-x-2.5 ml-2 shrink-0">
                      <button onClick={() => onToggleReveal(item.id)} className="text-slate-400 hover:text-blue-600 transition-colors"
                        title={revealedPasswords[item.id] ? "隐藏密码" : "显示密码"}>
                        {revealedPasswords[item.id] ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                      <button onClick={() => onCopy(item.password || "", "密码")} className="text-slate-400 hover:text-blue-600 transition-colors"><Copy className="w-3.5 h-3.5" /></button>
                    </div>
                  </div>
                </div>
                <div className="border-b border-slate-100 pb-2.5 relative group md:col-span-2">
                  <p className="text-[10px] font-bold text-slate-400 tracking-wider uppercase">快捷访问网址 URL</p>
                  <div className="flex items-center justify-between mt-1.5">
                    <p className="text-xs font-semibold text-blue-600 truncate mr-4 font-mono select-all">{item.url}</p>
                    <button onClick={() => onOpenUrl(item.url || "")} className="text-slate-400 hover:text-blue-600 transition-colors shrink-0 cursor-pointer" title="在系统浏览器中打开">
                      <ExternalLink className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {item.type === "card" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                <Field label="资产所有人/备查代号" value={item.cardName || ""} onCopy={() => onCopy(item.cardName || "", "持卡人")} />
                <div className="border-b border-slate-100 pb-2.5 relative group">
                  <p className="text-[10px] font-bold text-slate-400 tracking-wider uppercase">卡号 / 充值券密钥</p>
                  <div className="flex items-center justify-between mt-1.5">
                    <p className="text-xs font-bold text-slate-800 font-mono">{revealedPasswords[item.id] ? item.cardNumber : "•••• •••• •••• ••••"}</p>
                    <div className="flex items-center space-x-2.5 ml-2">
                      <button onClick={() => onToggleReveal(item.id)} className="text-slate-400 hover:text-blue-600 transition-colors">{revealedPasswords[item.id] ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}</button>
                      <button onClick={() => onCopy(item.cardNumber || "", "卡号")} className="text-slate-400 hover:text-blue-600 transition-colors"><Copy className="w-3.5 h-3.5" /></button>
                    </div>
                  </div>
                </div>
                <PlainField label="有效期/保质期" value={item.cardExpiry || ""} />
                <div className="border-b border-slate-100 pb-2.5 relative group">
                  <p className="text-[10px] font-bold text-slate-400 tracking-wider uppercase">辅助说明码</p>
                  <div className="flex items-center justify-between mt-1.5">
                    <p className="text-xs font-bold text-slate-800 font-mono">{revealedPasswords[item.id + "_cvv"] ? item.cardCvv : "•••"}</p>
                    <div className="flex items-center space-x-2.5 ml-2">
                      <button onClick={() => onToggleReveal(item.id + "_cvv")} className="text-slate-400 hover:text-blue-600 transition-colors">{revealedPasswords[item.id + "_cvv"] ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}</button>
                      <button onClick={() => onCopy(item.cardCvv || "", "辅助说明码")} className="text-slate-400 hover:text-blue-600 transition-colors"><Copy className="w-3.5 h-3.5" /></button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {item.type === "identity" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                <PlainField label="常用登记所有人/姓名" value={item.identityName || ""} />
                <Field label="关联绑定/申诉邮箱" value={item.identityEmail || ""} onCopy={() => onCopy(item.identityEmail || "", "邮箱")} />
                <Field label="注册密保手机号" value={item.identityPhone || ""} onCopy={() => onCopy(item.identityPhone || "", "手机")} />
                <Field label="常用于配送 / 绑定物理地址" value={item.identityAddress || ""} onCopy={() => onCopy(item.identityAddress || "", "地址")} />
              </div>
            )}

            {item.notes && (
              <div className="bg-slate-50 border border-slate-200/60 p-4 rounded-lg relative group">
                <p className="text-[10px] font-bold text-slate-400 tracking-wider uppercase mb-2">安全备忘明细及备用字段</p>
                <div className="text-xs text-slate-700 whitespace-pre-wrap leading-relaxed select-all font-mono">{item.notes}</div>
                <button onClick={() => onCopy(item.notes || "", "安全备忘")} className="absolute right-3 top-3 opacity-0 group-hover:opacity-100 text-slate-400 hover:text-blue-600 transition-all"><Copy className="w-3.5 h-3.5" /></button>
              </div>
            )}

            {item.otpSecret && <TotpSection secret={item.otpSecret} onCopy={onCopy} />}

            {item.customFields && Object.keys(item.customFields).length > 0 && (
              <div>
                <p className="text-[10px] font-bold text-slate-400 tracking-wider uppercase mb-2">自定义字段</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
                  {Object.entries(item.customFields).map(([key, value]) => (
                    <Field key={key} label={key} value={value || ""} onCopy={() => onCopy(value || "", key)} />
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Security Warnings */}
          {(item.strength === "weak" || (item.password && ((passMap[item.password] && passMap[item.password] > 1) || KNOWN_COMPROMISED.has(item.password.toLowerCase())))) && (
            <div className={`border rounded-xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 transition-all ${item.ignoreSecurityWarning ? "bg-slate-100/70 border-slate-200/80" : "bg-amber-50 border-amber-200/70"}`}>
              <div className="flex items-start space-x-3 text-left">
                <div className={`p-2 rounded-full shrink-0 mt-0.5 md:mt-0 ${item.ignoreSecurityWarning ? "bg-slate-200 text-slate-500" : "bg-amber-100 text-amber-700 animate-pulse"}`}>
                  <AlertTriangle className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-800">{item.ignoreSecurityWarning ? "已忽略的安全风险" : "检测到凭证安全隐患"}</h4>
                  <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                    {item.ignoreSecurityWarning ? (
                      <span>🔇 已手动将该条目的风险设为忽略，全库评分已恢复。</span>
                    ) : (
                      <span>
                        {item.strength === "weak" && "当前密码字符复杂度较低，极易遭受穷举破译。"}
                        {passMap[item.password || ""] && passMap[item.password || ""] > 1 && `当前密码在本地库中存在 ${passMap[item.password || ""]} 次复用，易受一站撞库波及。`}
                        {KNOWN_COMPROMISED.has((item.password || "").toLowerCase()) && "当前密码极易猜测且在公开泄漏凭证中极度高危。"}
                      </span>
                    )}
                  </p>
                </div>
              </div>
              <button type="button" onClick={() => onToggleIgnoreWarning(item.id)}
                className={`text-[10px] font-bold px-3 py-1.5 rounded-lg border transition-all shrink-0 cursor-pointer ${item.ignoreSecurityWarning ? "bg-white border-slate-300 text-slate-700 hover:bg-slate-50 shadow-sm" : "bg-amber-100 border-amber-300/80 text-amber-800 hover:bg-amber-200 shadow-sm"}`}>
                {item.ignoreSecurityWarning ? "恢复风险监控" : "忽略此项警告"}
              </button>
            </div>
          )}

          {/* Password strength assessment */}
          {item.password && (
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="flex items-center space-x-3">
                <div className={`p-2 rounded-full ${item.strength === "strong" ? "bg-emerald-100 text-emerald-700" : item.strength === "medium" ? "bg-amber-100 text-amber-700" : "bg-rose-100 text-rose-700"}`}>
                  {item.strength === "strong" ? <ShieldCheck className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-800">本地密码强度诊断度量</h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    {item.strength === "strong" && "高热力学熵值保护，抵御超级计算机暴力破解。"}
                    {item.strength === "medium" && "基本符合安全合规，但建议加入特殊符号强化。"}
                    {item.strength === "weak" && "警告：密码强度极低，且检测到重复关联，极易遭受撞库。"}
                  </p>
                </div>
              </div>
              <span className={`text-[10px] font-bold px-3 py-1 rounded-full shrink-0 uppercase tracking-wider ${item.strength === "strong" ? "bg-emerald-100 text-emerald-800" : item.strength === "medium" ? "bg-amber-100 text-amber-800" : "bg-rose-100 text-rose-800"}`}>
                {item.strength === "strong" ? "高安全级" : item.strength === "medium" ? "中等合规" : "高危建议重设"}
              </span>
            </div>
          )}
        </div>

        {/* Footer: encryption badge + LWW clock */}
        <div className="space-y-4 pt-5 border-t border-slate-100">
          <div className="p-3 bg-slate-100/50 rounded-lg border border-slate-200/80 flex items-center shadow-sm">
            <div className="p-2 bg-blue-100 text-blue-600 rounded-full mr-3.5 shrink-0">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path>
              </svg>
            </div>
            <div>
              <div className="text-xs font-bold text-slate-800">军工级零知识端到端加密防护</div>
              <div className="text-[10px] text-slate-500">此保险箱受 AES-256-GCM 算法保护。密钥不落盘、不离港、绝不传输。</div>
            </div>
          </div>
          <div className="flex justify-between items-center text-[10px] text-slate-400 font-mono select-none">
            <span className="flex items-center space-x-1"><Clock className="w-3 h-3" /><span>最近修改：{item.updatedAt}</span></span>
            <span>逻辑时钟（LWW-Element-Set）：V1_{item.id}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
);

// ---- 子组件 ----

/** TOTP 两步验证码区域（1 秒轮询刷新，30 秒周期） */
const TotpSection: React.FC<{ secret: string; onCopy: (text: string, label: string) => void }> = ({ secret, onCopy }) => {
  const [code, setCode] = useState("");
  const [remaining, setRemaining] = useState(30);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    const tick = async () => {
      try {
        const r = await generateTotp(secret);
        if (!cancelled) {
          setCode(r.code);
          setRemaining(r.remaining);
          setError("");
        }
      } catch (e) {
        if (!cancelled) setError(String(e));
      }
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => { cancelled = true; clearInterval(id); };
  }, [secret]);

  if (error) {
    return (
      <div className="bg-rose-50 border border-rose-200/70 p-4 rounded-lg">
        <p className="text-[10px] font-bold text-rose-600 uppercase tracking-wider">两步验证码</p>
        <p className="text-xs text-rose-500 mt-1.5">{error}</p>
      </div>
    );
  }

  const progress = ((30 - remaining) / 30) * 100;

  return (
    <div className="bg-indigo-50/60 border border-indigo-200/70 p-4 rounded-lg relative group">
      <div className="flex items-center justify-between mb-2">
        <p className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider flex items-center space-x-1.5">
          <KeyRound className="w-3 h-3" />
          <span>两步验证码 (TOTP)</span>
        </p>
        <button onClick={() => onCopy(code, "验证码")}
          className="opacity-0 group-hover:opacity-100 text-indigo-500 hover:text-indigo-700 transition-all cursor-pointer flex items-center space-x-1 text-[10px] font-bold">
          <Copy className="w-3 h-3" />
          <span>复制</span>
        </button>
      </div>
      <div className="flex items-end justify-between">
        <span className="text-3xl font-bold font-mono text-indigo-800 tracking-[0.15em] tabular-nums">{code || "······"}</span>
        <span className="text-[10px] font-mono text-indigo-500 mb-1">{remaining}s</span>
      </div>
      <div className="mt-2 h-1 bg-indigo-100 rounded-full overflow-hidden">
        <div className="h-full bg-indigo-500 rounded-full transition-all duration-1000 ease-linear" style={{ width: `${progress}%` }} />
      </div>
    </div>
  );
};

const Field: React.FC<{ label: string; value: string; onCopy: () => void }> = ({ label, value, onCopy }) => (
  <div className="border-b border-slate-100 pb-2.5 relative group">
    <p className="text-[10px] font-bold text-slate-400 tracking-wider uppercase">{label}</p>
    <div className="flex items-center justify-between mt-1.5">
      <p className="text-xs font-semibold text-slate-800 select-all font-mono">{value}</p>
      <button onClick={onCopy} className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-blue-600 transition-all ml-2 cursor-pointer"><Copy className="w-3.5 h-3.5" /></button>
    </div>
  </div>
);

const PlainField: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="border-b border-slate-100 pb-2.5">
    <p className="text-[10px] font-bold text-slate-400 tracking-wider uppercase">{label}</p>
    <p className="text-xs font-semibold text-slate-800 font-mono mt-1.5">{value}</p>
  </div>
);

/** 已知高风险密码（与 useSecurityAudit 中的列表保持一致） */
const KNOWN_COMPROMISED = new Set(["password", "password123", "123456", "12345678", "qwerty", "admin", "letmein"]);
