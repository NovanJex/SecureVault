// LockScreen — 保险箱锁定界面（创建主密码 / 解锁）


import React from "react";
import { Lock, LockKeyhole, KeyRound, Unlock, ShieldAlert, RefreshCw, Check, ChevronDown, Eye, EyeOff } from "lucide-react";
import { motion } from "motion/react";
import { t } from "../i18n";

export interface LockScreenProps {
  isFirstTime: boolean;
  isDeriving: boolean;
  derivationProgress: string;
  unlockError: string;
  enteredPassword: string;
  setEnteredPassword: (v: string) => void;
  selectedKdf: "argon2id" | "pbkdf2";
  setSelectedKdf: (v: "argon2id" | "pbkdf2") => void;
  showForceResetConfirm: boolean;
  setShowForceResetConfirm: (v: boolean) => void;
  onCreateMasterPassword: (e: React.FormEvent) => void;
  onUnlockVault: (e: React.FormEvent) => void;
  onForceReset: () => void;
}

export const LockScreen: React.FC<LockScreenProps> = ({
  isFirstTime,
  isDeriving,
  derivationProgress,
  unlockError,
  enteredPassword,
  setEnteredPassword,
  selectedKdf,
  setSelectedKdf,
  showForceResetConfirm,
  setShowForceResetConfirm,
  onCreateMasterPassword,
  onUnlockVault,
  onForceReset,
}) => {
  const [kdfOpen, setKdfOpen] = React.useState(false);
  const [showRegisterPassword, setShowRegisterPassword] = React.useState(false);
  const [showUnlockPassword, setShowUnlockPassword] = React.useState(false);
  return (
    <div className="flex-1 flex items-center justify-center p-6 bg-slate-50 relative overflow-hidden transition-colors duration-1000">
      {/* Ambient Glow Orbs */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
        {isFirstTime ? (
          <>
            <div className="absolute w-[360px] h-[360px] rounded-full bg-indigo-200/40 filter blur-[90px] -top-12 -left-12 animate-float-1 transition-all duration-1000" />
            <div className="absolute w-[360px] h-[360px] rounded-full bg-emerald-100/50 filter blur-[100px] -bottom-20 -right-12 animate-float-2 transition-all duration-1000" />
            <div className="absolute w-[280px] h-[280px] rounded-full bg-purple-100/30 filter blur-[80px] top-1/2 left-1/3 -translate-y-1/2 -translate-x-1/2 animate-pulse transition-all duration-1000" />
          </>
        ) : (
          <>
            <div className="absolute w-[360px] h-[360px] rounded-full bg-blue-200/40 filter blur-[90px] -top-12 -left-12 animate-float-1 transition-all duration-1000" />
            <div className="absolute w-[360px] h-[360px] rounded-full bg-violet-100/40 filter blur-[100px] -bottom-20 -right-12 animate-float-2 transition-all duration-1000" />
            <div className="absolute w-[280px] h-[280px] rounded-full bg-sky-100/30 filter blur-[80px] top-1/2 left-1/3 -translate-y-1/2 -translate-x-1/2 animate-pulse transition-all duration-1000" />
          </>
        )}
      </div>

      {/* Matrix grid background */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#e2e8f0_1px,transparent_1px),linear-gradient(to_bottom,#e2e8f0_1px,transparent_1px)] bg-[size:2rem_2rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-50 z-0 pointer-events-none" />

      {/* Glowing Tech Intersection Nodes */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0 opacity-80">
        <div className="absolute w-2 h-2 rounded-full bg-indigo-500/80 shadow-[0_0_8px_#6366f1] animate-node-blink" style={{ left: '20%', top: '30%', '--blink-duration': '3.2s' } as React.CSSProperties} />
        <div className="absolute w-2 h-2 rounded-full bg-emerald-500/80 shadow-[0_0_8px_#10b981] animate-node-blink" style={{ right: '25%', top: '20%', '--blink-duration': '4.5s' } as React.CSSProperties} />
        <div className="absolute w-1.5 h-1.5 rounded-full bg-purple-500/60 shadow-[0_0_6px_#a855f7] animate-node-blink" style={{ left: '15%', bottom: '25%', '--blink-duration': '5s' } as React.CSSProperties} />
        <div className="absolute w-2 h-2 rounded-full bg-blue-500/70 shadow-[0_0_8px_#3b82f6] animate-node-blink" style={{ right: '15%', bottom: '35%', '--blink-duration': '3.8s' } as React.CSSProperties} />
        <div className="absolute w-1.5 h-1.5 rounded-full bg-indigo-400/60 shadow-[0_0_6px_#818cf8] animate-node-blink" style={{ left: '40%', top: '15%', '--blink-duration': '6s' } as React.CSSProperties} />
        <div className="absolute w-2 h-2 rounded-full bg-teal-400/70 shadow-[0_0_8px_#2dd4bf] animate-node-blink" style={{ right: '45%', bottom: '15%', '--blink-duration': '4.2s' } as React.CSSProperties} />
      </div>

      {/* Security Scanning Beam */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <div className="w-[150%] h-[3px] bg-gradient-to-r from-transparent via-indigo-500/20 to-transparent -left-[25%] absolute transform rotate-12 animate-tech-scan" />
      </div>

      <div className="bg-white/95 backdrop-blur-md max-w-md w-full rounded-2xl border border-slate-200/80 shadow-2xl shadow-slate-200/50 z-10 relative flex flex-col overflow-hidden">
        {/* 顶部动感流光线条 */}
        <div className="h-[4.5px] w-full shrink-0 overflow-hidden relative">
          <div className={`w-full h-full ${isFirstTime ? "animated-gradient-create" : "animated-gradient-unlock"}`} />
        </div>

        <div className="p-8 text-center">
          <div className="inline-flex bg-blue-50 p-4 rounded-full text-blue-600 mb-6 border border-blue-100 shadow-inner">
            <Lock className="w-8 h-8 text-blue-600 animate-pulse" />
          </div>

          {isFirstTime ? (
            /* ===== 创建主密码 ===== */
            <div>
              <h2 className="text-xl font-bold text-slate-800 mb-2 font-sans tracking-tight">{t("创建本地高强度保险箱")}</h2>
              <p className="text-xs text-slate-500 mb-6 leading-relaxed">
                {t("欢迎使用 SecureVault！首次运行，我们需要在本地派生物理存储库对称密钥，该主密码仅存在您的本地，切勿遗忘。")}
              </p>

              <form onSubmit={onCreateMasterPassword} noValidate className="space-y-4 text-left">
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 tracking-wider uppercase mb-2">{t("输入您的主解锁密码")}</label>
                  <div className="relative">
                    <LockKeyhole className="w-4 h-4 absolute left-3 top-3.5 text-slate-400" />
                    <input
                      type={showRegisterPassword ? "text" : "password"}
                      placeholder={t("设置至少 8 位的主密码...")}
                      value={enteredPassword}
                      onChange={(e) => setEnteredPassword(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-10 py-3 text-xs text-slate-800 placeholder-slate-400 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 transition-all font-sans"
                    />
                    <button
                      type="button"
                      onClick={() => setShowRegisterPassword(!showRegisterPassword)}
                      className="absolute right-3 top-3.5 text-slate-400 hover:text-indigo-600 transition-colors focus:outline-none cursor-pointer flex items-center justify-center"
                      title={showRegisterPassword ? t("隐藏密码") : t("显示密码")}
                    >
                      {showRegisterPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-1 items-end relative">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 tracking-wider uppercase mb-2">{t("主密钥推导算法 (KDF)")}</label>
                    <div className="relative">
                      <button type="button" onClick={() => setKdfOpen(!kdfOpen)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-3 text-xs text-slate-700 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 cursor-pointer flex items-center justify-between transition-all hover:bg-slate-100/50">
                        <span className="flex items-center space-x-1.5">
                          <span className="text-xs">{selectedKdf === "argon2id" ? "🛡️" : "⚙️"}</span>
                          <span className="font-semibold text-slate-800">{selectedKdf === "argon2id" ? t("Argon2id (推荐)") : t("PBKDF2-SHA256")}</span>
                        </span>
                        <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 shrink-0 ${kdfOpen ? "rotate-180 text-indigo-500" : ""}`} />
                      </button>
                      {kdfOpen && (
                        <>
                          <div className="fixed inset-0 z-10 cursor-default" onClick={() => setKdfOpen(false)} />
                          <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200/90 rounded-xl shadow-xl shadow-slate-200/50 py-1 z-20 overflow-hidden">
                            {(["argon2id", "pbkdf2"] as const).map(k => (
                              <button key={k} type="button" onClick={() => { setSelectedKdf(k); setKdfOpen(false); }}
                                className={`w-full text-left px-3.5 py-2 text-xs flex items-center space-x-2 transition-colors cursor-pointer ${selectedKdf === k ? "bg-indigo-50/70 text-indigo-700 font-bold" : "text-slate-700 hover:bg-slate-50"}`}>
                                <span className="text-sm shrink-0">{k === "argon2id" ? "🛡️" : "⚙️"}</span>
                                <span className="flex-1 truncate">{k === "argon2id" ? t("Argon2id (推荐)") : t("PBKDF2-SHA256")}</span>
                                {selectedKdf === k && <Check className="w-3.5 h-3.5 text-indigo-500 shrink-0" />}
                              </button>
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="text-[10px] text-slate-400 leading-relaxed pb-1">
                    {selectedKdf === "argon2id"
                      ? t("Argon2id: 抗 GPU/ASIC 硬件暴力破解，64MB 内存硬化，业界最安全 KDF。")
                      : t("PBKDF2-SHA256: NIST/FIPS 标准，100,000 轮哈希迭代拉伸。")}
                  </div>
                </div>

                {unlockError && (
                  <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
                    className="bg-rose-50 border border-rose-100 rounded-xl px-3.5 py-2.5 text-rose-600 text-[11px] font-medium flex items-center space-x-2">
                    <ShieldAlert className="w-4 h-4 text-rose-500 shrink-0" />
                    <span className="leading-relaxed">{unlockError}</span>
                  </motion.div>
                )}

                <button type="submit" disabled={isDeriving}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none text-white font-semibold py-3 px-4 rounded-xl text-xs transition-colors flex items-center justify-center space-x-1.5 shadow-md cursor-pointer disabled:cursor-not-allowed">
                  <KeyRound className="w-3.5 h-3.5" />
                  <span>{t("派生密钥并创建安全区")}</span>
                </button>

                {isDeriving && derivationProgress && (
                  <div className="mt-3 p-3 bg-slate-50 border border-slate-200/60 rounded-xl flex items-start space-x-2 text-[10px] text-left text-slate-500 font-mono animate-pulse">
                    <RefreshCw className="w-3.5 h-3.5 text-indigo-500 animate-spin shrink-0 mt-0.5" />
                    <span className="leading-relaxed break-all">{derivationProgress}</span>
                  </div>
                )}
              </form>
            </div>
          ) : (
            /* ===== 解锁保险箱 ===== */
            <div>
              <h2 className="text-xl font-bold text-slate-800 mb-1 font-sans tracking-tight">{t("安全保险箱已锁定")}</h2>
              <p className="text-xs text-slate-500 mb-6">{t("明文密钥已安全退出，请输入 Master Password 解锁")}</p>
              <form onSubmit={onUnlockVault} noValidate className="space-y-4 text-left">
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 tracking-wider uppercase mb-2">{t("主密码 (MASTER PASSWORD)")}</label>
                  <div className="relative">
                    <LockKeyhole className="w-4 h-4 absolute left-3 top-3.5 text-slate-400" />
                    <input
                      type={showUnlockPassword ? "text" : "password"}
                      autoFocus placeholder={t("输入对应的主解密密码...")}
                      value={enteredPassword} onChange={(e) => setEnteredPassword(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-10 py-3 text-xs text-slate-800 placeholder-slate-400 outline-none focus:border-blue-500/80 focus:ring-1 focus:ring-blue-500/30 transition-all font-sans" />
                    <button
                      type="button"
                      onClick={() => setShowUnlockPassword(!showUnlockPassword)}
                      className="absolute right-3 top-3.5 text-slate-400 hover:text-blue-600 transition-colors focus:outline-none cursor-pointer flex items-center justify-center"
                      title={showUnlockPassword ? t("隐藏密码") : t("显示密码")}
                    >
                      {showUnlockPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {unlockError && (
                  <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
                    className="bg-rose-50 border border-rose-100 rounded-xl px-3.5 py-2.5 text-rose-600 text-[11px] font-medium flex items-center space-x-2">
                    <ShieldAlert className="w-4 h-4 text-rose-500 shrink-0" />
                    <span className="leading-relaxed">{unlockError}</span>
                  </motion.div>
                )}

                <button type="submit" disabled={isDeriving}
                  className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none text-white font-semibold py-3 px-4 rounded-xl text-xs transition-all duration-150 flex items-center justify-center space-x-1.5 shadow-lg shadow-blue-100 active:scale-[0.99] cursor-pointer disabled:cursor-not-allowed">
                  <Unlock className="w-3.5 h-3.5" />
                  <span>{t("验证主密码并解锁")}</span>
                </button>

                {isDeriving && derivationProgress && (
                  <div className="mt-3 p-3 bg-slate-50 border border-slate-200/60 rounded-xl flex items-start space-x-2 text-[10px] text-left text-slate-500 font-mono animate-pulse">
                    <RefreshCw className="w-3.5 h-3.5 text-blue-500 animate-spin shrink-0 mt-0.5" />
                    <span className="leading-relaxed break-all">{derivationProgress}</span>
                  </div>
                )}
              </form>

              {/* 忘记密码 / 强制重置 */}
              <details className="mt-6 text-left">
                <summary className="text-[11px] font-bold text-slate-400 hover:text-slate-500 cursor-pointer select-none outline-none flex items-center space-x-1 uppercase">
                  <span>{t("❓ 忘了主密码怎么办？")}</span>
                </summary>
                <div className="mt-3 space-y-3 text-[11px] text-slate-500 leading-relaxed">
                  <div className="p-2.5 bg-slate-50 border border-slate-100 rounded">
                    <span className="font-semibold text-slate-700">{t("第一步：仔细回想与核对")}</span>
                    <p className="mt-0.5 text-slate-500 leading-normal">{t("主密码是解密对称密钥的唯一密码学钥匙。请核对是否曾在离线本子、纸张或硬件保险箱中进行了物理抄写备份。")}</p>
                  </div>

                  <div className="p-2.5 bg-rose-50 border border-rose-100 rounded text-rose-800">
                    <span className="font-semibold text-rose-900">{t("实在找不到？只能进行强制重置")}</span>
                    <p className="mt-0.5 text-rose-700/90 leading-normal">{t("如果主密码确实彻底遗失，由于密码学无法被暴力攻破，您只能通过\"强制重置保险箱\"重新开始使用。但这会导致之前保存在本地的所有数据不可逆地永久销毁。")}</p>

                    {!showForceResetConfirm ? (
                      <button type="button" onClick={() => setShowForceResetConfirm(true)}
                        className="mt-2.5 text-[9px] bg-rose-100 hover:bg-rose-200 text-rose-700 border border-rose-200 rounded px-2.5 py-1.5 font-semibold transition-colors cursor-pointer">
                        {t("💥 强制初始化重置保险箱")}
                      </button>
                    ) : (
                      <div className="mt-2.5 p-2.5 bg-rose-100/50 rounded border border-rose-200 space-y-2">
                        <p className="text-[10px] text-rose-800 font-bold leading-normal">
                          {t("🚨 终极警告：重置将永久且不可恢复地清除您本地的所有加密卡券、密码凭证及密保文件。确认要清除并刷新应用吗？")}
                        </p>
                        <div className="flex space-x-2">
                          <button type="button" onClick={onForceReset}
                            className="text-[9px] bg-rose-600 hover:bg-rose-700 text-white font-bold rounded px-2.5 py-1.5 transition-colors cursor-pointer">
                            {t("确认彻底清除")}
                          </button>
                          <button type="button" onClick={() => setShowForceResetConfirm(false)}
                            className="text-[9px] bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold rounded px-2.5 py-1.5 transition-colors cursor-pointer">
                            {t("取消")}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </details>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
