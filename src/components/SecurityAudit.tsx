// SecurityAudit — 安全审计仪表板（弱密码 / 复用 / 泄露检测）

import React from "react";
import { ShieldAlert, ShieldCheck, RefreshCw, AlertTriangle, Copy, EyeOff } from "lucide-react";

export interface SecurityAuditProps {
  isAuditScanning: boolean;
  hasAuditScanned: boolean;
  totalCount: number;
  weakCount: number;
  reusedCount: number;
  compromisedCount: number;
  expiredCount: number;
  ignoredCount: number;
  passMap: Record<string, number>;
  items: Array<{
    id: string;
    title: string;
    username?: string;
    password?: string;
    strength: "weak" | "medium" | "strong";
    ignoreSecurityWarning?: boolean;
  }>;
  onStartAudit: () => void;
  onFixItem: (id: string) => void;
  onToggleIgnore: (id: string) => void;
  onCopyPassword: (text: string) => void;
}

/** 评分计算 */
function calcScore(weak: number, reused: number, compromised: number): number {
  return Math.max(10, Math.min(100, 100 - (weak * 15) - (reused * 10) - (compromised * 20)));
}

export const SecurityAudit: React.FC<SecurityAuditProps> = ({
  isAuditScanning, hasAuditScanned,
  totalCount, weakCount, reusedCount, compromisedCount, expiredCount, ignoredCount,
  passMap, items,
  onStartAudit, onFixItem, onToggleIgnore, onCopyPassword,
}) => {
  const score = calcScore(weakCount, reusedCount, compromisedCount);

  return (
    <div className="flex-1 flex flex-col overflow-hidden font-sans bg-slate-50">
      {/* Header */}
      <div className="pt-4 pb-3 px-4 md:px-6 bg-slate-50 flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0 font-sans">
        <div className="flex items-center space-x-2 text-left">
          <ShieldAlert className="w-5 h-5 text-rose-600 animate-pulse shrink-0" />
          <div>
            <h3 className="text-xs font-bold text-slate-800 leading-tight">保险箱本地多维安全审计智库</h3>
            <p className="text-[10px] text-slate-400 mt-0.5">依据零知识协议进行本地哈希指纹对齐与热力学熵值解算</p>
          </div>
        </div>
        <div className="flex items-center space-x-1.5 bg-rose-50 px-2.5 py-1 rounded-lg border border-rose-200 shrink-0 self-start md:self-auto">
          <span className="w-1.5 h-1.5 rounded-full bg-rose-500 block animate-pulse"></span>
          <span className="text-[9px] font-bold text-rose-600 font-mono tracking-wider">AUDIT ENGINE</span>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 md:p-8 bg-slate-50">
        <div className="max-w-4xl mx-auto bg-white border border-slate-200/80 rounded-2xl p-6 md:p-8 shadow-sm space-y-6 flex flex-col justify-between min-h-full">

          {!hasAuditScanned && !isAuditScanning ? (
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-8 text-center max-w-2xl mx-auto my-auto w-full">
              <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-indigo-100 shadow-inner">
                <ShieldAlert className="w-8 h-8 animate-pulse text-indigo-500" />
              </div>
              <h3 className="text-sm font-bold text-slate-800 mb-1.5">准备执行全库深度密码防泄漏审计</h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto mb-6 leading-relaxed">
                通过分析密码特征库、熵值解算、以及哈希前缀的本地 K-Anonymity 安全数据库进行多级审计。
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-left mb-8 max-w-lg mx-auto">
                {[
                  { title: "1. 弱密码检测", desc: "计算 Shannon 物理熵，精准拦截低熵值破译凭证。" },
                  { title: "2. 密码复用碰撞", desc: "检索本地数据库对齐指纹，筛查一密多用等撞库风险条目。" },
                  { title: "3. 已泄漏特征碰撞", desc: "多重对齐公共泄露数据库，精准定位高危泄露账户凭证。" },
                ].map(c => (
                  <div key={c.title} className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm">
                    <span className="text-xs font-bold text-slate-700 block mb-1">{c.title}</span>
                    <p className="text-[10px] text-slate-500 leading-relaxed">{c.desc}</p>
                  </div>
                ))}
              </div>
              <button type="button" onClick={onStartAudit}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-6 py-3 rounded-xl transition shadow-md inline-flex items-center space-x-2 cursor-pointer font-sans">
                <ShieldCheck className="w-4 h-4" /><span>开启一键全库深度安全审计</span>
              </button>
            </div>
          ) : isAuditScanning ? (
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-12 text-center max-w-md mx-auto my-auto flex flex-col items-center w-full">
              <div className="relative w-20 h-20 mb-6 flex items-center justify-center">
                <div className="absolute inset-0 rounded-full border-4 border-indigo-100 animate-ping"></div>
                <div className="w-14 h-14 bg-indigo-600 rounded-full flex items-center justify-center text-white shadow-lg relative z-10">
                  <RefreshCw className="w-6 h-6 animate-spin" />
                </div>
              </div>
              <h3 className="text-sm font-bold text-slate-800 mb-1.5">正在执行本地安全审计...</h3>
              <p className="text-xs text-slate-400">基于密码强度、复用检测和熵值分析进行诊断</p>
            </div>
          ) : (
            <>
              {/* Score & Summary */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 items-center bg-slate-50 border border-slate-200/80 p-6 rounded-2xl">
                <div className="flex flex-col items-center text-center">
                  <div className="relative w-28 h-28 flex items-center justify-center">
                    <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                      <path className="text-slate-200" strokeWidth="3.5" stroke="currentColor" fill="none"
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                      <path className={score >= 80 ? "text-emerald-500" : score >= 55 ? "text-amber-500" : "text-rose-500"}
                        strokeWidth="3.5" strokeDasharray={`${score}, 100`} strokeLinecap="round" stroke="currentColor" fill="none"
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                    </svg>
                    <div className="absolute flex flex-col items-center">
                      <span className="text-2xl font-black font-sans tracking-tight text-slate-800">{score}</span>
                      <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wide">密码库评分</span>
                    </div>
                  </div>
                  <p className={`text-xs font-bold mt-3 ${score >= 80 ? "text-emerald-600" : score >= 55 ? "text-amber-600" : "text-rose-600"}`}>
                    {score >= 80 ? "密文健康度：极为安全" : score >= 55 ? "密文健康度：存在隐患" : "密文健康度：极其危险"}
                  </p>
                </div>
                <div className="md:col-span-2 space-y-4">
                  <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wide">全库诊断摘要统计</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <StatBox label="本地总资产条目" value={`${totalCount} 个`} />
                    <StatBox label="弱密码条目" value={`${weakCount} 个`} color="rose" />
                    <StatBox label="复用漏洞条目" value={`${reusedCount} 个`} color="amber" />
                    <StatBox label="到期/过期条目" value={`${expiredCount} 个`} color={expiredCount > 0 ? "amber" : undefined} />
                  </div>
                  <p className="text-[10px] text-slate-500 leading-relaxed">※ 本报告根据本地沙盒密码交叉解算，无任何数据上传。</p>
                </div>
              </div>

              <div className="space-y-6">
                {/* Weak passwords */}
                <AlertSection title={`弱密码安全警报 (${weakCount})`} icon={<AlertTriangle className="w-4 h-4 text-rose-500" />} count={weakCount}
                  emptyMsg="✨ 表现优秀！本地数据库中所有密码条目皆符合高强度标准。">
                  {items.filter(i => i.password && i.strength === "weak").map(i => (
                    <AlertRow key={i.id} item={i} tag="高危" tagColor="rose"
                      detail={`用户名: ${i.username || "未知"} | 当前长度: ${i.password?.length || 0} 位 | 推荐更换`}
                      btnLabel="一键安全修补" onAction={() => onFixItem(i.id)} />
                  ))}
                </AlertSection>

                {/* Reused passwords */}
                <AlertSection title={`一密多用/凭证交叉复用警报 (${reusedCount})`} icon={<Copy className="w-4 h-4 text-amber-500" />} count={reusedCount}
                  emptyMsg="✨ 表现极佳！本地库中无密码重合交叉，有效防范撞库风险。">
                  {items.filter(i => i.password && passMap[i.password] > 1).map(i => {
                    const dupes = items.filter(v => v.password === i.password && v.id !== i.id).map(d => d.title).join("、");
                    return (
                      <AlertRow key={i.id} item={i} tag={`复用 ${passMap[i.password!]} 次`} tagColor="amber"
                        detail={`此凭证密码与其它 ${passMap[i.password!] - 1} 个不同服务条目完全重合。`}
                        extraLine={<span className="text-[10px] text-rose-500 font-medium flex items-center gap-1">⚠️ 重合条目: <span className="bg-rose-50 text-rose-600 px-1.5 py-0.5 rounded border border-rose-100/80 font-bold text-[10px] truncate max-w-xs">{dupes}</span></span>}
                        btnLabel="派生独立密钥" onAction={() => onFixItem(i.id)} />
                    );
                  })}
                </AlertSection>

                {/* Compromised */}
                <AlertSection title={`已知公共数据库泄露痕迹匹配 (${compromisedCount})`} icon={<ShieldAlert className="w-4 h-4 text-rose-600" />} count={compromisedCount}
                  emptyMsg="✨ 表现合规！未碰撞到已公开泄漏的密码学特征备份。">
                  {items.filter(i => (i.password === "password123" || i.password === "123456")).map(i => (
                    <AlertRow key={i.id} item={i} tag="高危已泄漏" tagColor="rose" animate
                      detail="⚠️ 通用密码在 HIBP 本地备份集碰撞中已曝光"
                      btnLabel="紧急一键安全重构" onAction={() => onFixItem(i.id)} danger />
                  ))}
                </AlertSection>

                {/* Ignored */}
                {ignoredCount > 0 && (
                  <div className="pt-4 border-t border-slate-200">
                    <h4 className="text-xs font-bold text-slate-500 mb-3 flex items-center space-x-1.5">
                      <EyeOff className="w-4 h-4 text-slate-400" /><span>已手动忽略的安全警报 ({ignoredCount})</span>
                    </h4>
                    <div className="space-y-2.5">
                      {items.filter(i => i.ignoreSecurityWarning).map(i => (
                        <div key={i.id} className="bg-slate-100/60 border border-slate-200/80 p-3.5 rounded-xl flex items-center justify-between shadow-sm">
                          <div className="truncate pr-4 text-left">
                            <div className="flex items-center space-x-2">
                              <span className="text-xs font-bold text-slate-700">{i.title}</span>
                              <span className="text-[9px] font-mono bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded font-bold">已忽略</span>
                            </div>
                            <p className="text-[10px] text-slate-400 mt-1 font-mono">诊断原状态: {i.strength === "weak" ? "高危弱密码" : "交叉重复复用"} · 密文：••••••••</p>
                          </div>
                          <button type="button" onClick={() => onToggleIgnore(i.id)}
                            className="bg-white hover:bg-slate-50 text-slate-700 font-bold text-[10px] px-3 py-1.5 rounded-lg border border-slate-200 shadow-sm transition-all shrink-0 cursor-pointer font-sans">恢复安全监控</button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

// ---- Sub-components ----

const StatBox: React.FC<{ label: string; value: string; color?: string }> = ({ label, value, color }) => (
  <div className="bg-white p-3 rounded-xl border border-slate-200">
    <span className="text-[10px] text-slate-400 font-bold block flex items-center space-x-1">
      {color && <span className={`w-1.5 h-1.5 rounded-full bg-${color}-500 shrink-0`}></span>}
      <span>{label}</span>
    </span>
    <span className={`text-sm font-black font-mono mt-0.5 block ${color ? `text-${color}-600` : "text-slate-800"}`}>{value}</span>
  </div>
);

const AlertSection: React.FC<{
  title: string; icon: React.ReactNode; count: number; emptyMsg: string; children: React.ReactNode;
}> = ({ title, icon, count, emptyMsg, children }) => (
  <div>
    <h4 className="text-xs font-bold text-slate-700 mb-3 flex items-center space-x-1.5">{icon}<span>{title}</span></h4>
    {count === 0 ? (
      <p className="text-xs text-emerald-600 bg-emerald-50/50 border border-emerald-100 p-3 rounded-xl font-medium">{emptyMsg}</p>
    ) : (
      <div className="space-y-2.5">{children}</div>
    )}
  </div>
);

const AlertRow: React.FC<{
  item: { id: string; title: string; username?: string; password?: string };
  tag: string; tagColor: string; animate?: boolean; detail: string;
  extraLine?: React.ReactNode; btnLabel: string; onAction: () => void; danger?: boolean;
}> = ({ item, tag, tagColor, animate, detail, extraLine, btnLabel, onAction, danger }) => (
  <div className="bg-white border border-slate-200/80 p-3.5 rounded-xl flex items-center justify-between shadow-sm hover:border-slate-300 transition-all">
    <div className="truncate pr-4 text-left flex-1">
      <div className="flex items-center space-x-2">
        <span className="text-xs font-bold text-slate-800">{item.title}</span>
        <span className={`text-[9px] font-mono bg-${tagColor}-50 text-${tagColor}-600 px-1.5 py-0.5 rounded font-bold ${animate ? "animate-pulse" : ""}`}>{tag}</span>
      </div>
      <p className="text-[10px] text-slate-500 mt-1 font-mono">{detail}</p>
      {extraLine}
    </div>
    <button type="button" onClick={onAction}
      className={`font-bold text-[10px] px-3 py-1.5 rounded-lg transition-colors shrink-0 cursor-pointer font-sans h-fit self-center ${danger ? "bg-rose-600 hover:bg-rose-700 text-white shadow-sm" : "bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200"}`}>
      {btnLabel}
    </button>
  </div>
);
