// PasswordGenerator — 高性能随机密码与安全短语发生器

import React from "react";
import { Sparkles, RefreshCw, Copy, Clock } from "lucide-react";
import type { PasswordConfig } from "../types";
import { t, tf } from "../i18n";

export interface PasswordGeneratorProps {
  genType: "random" | "passphrase";
  setGenType: (v: "random" | "passphrase") => void;
  genConfig: PasswordConfig;
  setGenConfig: React.Dispatch<React.SetStateAction<PasswordConfig>>;
  passphraseWords: number;
  setPassphraseWords: (v: number) => void;
  passphraseSeparator: string;
  setPassphraseSeparator: (v: string) => void;
  passphraseCapitalize: boolean;
  setPassphraseCapitalize: (v: boolean) => void;
  passphraseAddNumber: boolean;
  setPassphraseAddNumber: (v: boolean) => void;
  generatedPass: string;
  generatorHistory: string[];
  onGenerate: () => void;
  onSaveToHistory: () => void;
  onClearHistory: () => void;
  onCopy: (text: string, label: string) => void;
  calculateEntropy: (length: number, config: PasswordConfig) => number;
  calculatePassphraseEntropy: (wordsCount: number) => number;
}

export const PasswordGenerator: React.FC<PasswordGeneratorProps> = ({
  genType, setGenType,
  genConfig, setGenConfig,
  passphraseWords, setPassphraseWords,
  passphraseSeparator, setPassphraseSeparator,
  passphraseCapitalize, setPassphraseCapitalize,
  passphraseAddNumber, setPassphraseAddNumber,
  generatedPass, generatorHistory,
  onGenerate, onSaveToHistory, onClearHistory, onCopy,
  calculateEntropy, calculatePassphraseEntropy,
}) => {
  const entropy = genType === "random"
    ? calculateEntropy(genConfig.length, genConfig)
    : calculatePassphraseEntropy(passphraseWords);

  const crackTime = entropy >= 80 ? t("3500 万年 (极高)") : entropy >= 50 ? t("120 年 (中等)") : t("28 小时 (易爆破)");

  return (
    <div className="flex-1 flex flex-col overflow-hidden font-sans bg-slate-50">
      {/* Top Header */}
      <div className="pt-3 pb-2 px-4 md:px-6 bg-slate-50 flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0 font-sans">
        <div className="flex items-center space-x-3 text-left">
          <div className="flex items-center space-x-2">
            <Sparkles className="w-5 h-5 text-indigo-500 shrink-0" />
            <div>
              <h3 className="text-xs font-bold text-slate-800 leading-tight">{t("高性能随机密码与安全短语发生器")}</h3>
              <p className="text-[10px] text-slate-400 mt-0.5">{t("采用客户端高熵安全随机数生成，提供高可读性短语模式与全规则密码模式")}</p>
            </div>
          </div>
        </div>
        <div className="flex items-center space-x-1.5 bg-indigo-50 px-2.5 py-1 rounded-lg border border-indigo-200 shrink-0 self-start md:self-auto">
          <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 block animate-pulse"></span>
          <span className="text-[9px] font-bold text-indigo-600 font-mono tracking-wider">GENERATOR ENGINE</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto lg:overflow-hidden p-3 lg:p-5 bg-slate-50 flex flex-col justify-start">
        <div className="max-w-5xl w-full mx-auto bg-white border border-slate-200/80 rounded-2xl p-5 md:p-6 shadow-sm flex flex-col justify-between lg:h-full min-h-0 font-sans">
          <div className="flex-1 flex flex-col min-h-0 space-y-4 md:space-y-5">

            {/* Mode Tabs */}
            <div className="flex bg-slate-200/60 p-1 rounded-xl border border-slate-200/50">
              <button type="button" onClick={() => setGenType("random")}
                className={`flex-1 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${genType === "random" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-800"}`}>
                {t("安全随机字符密码")}
              </button>
              <button type="button" onClick={() => setGenType("passphrase")}
                className={`flex-1 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${genType === "passphrase" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-800"}`}>
                {t("易记安全短语 (Passphrase)")}
              </button>
            </div>

            {/* Two-Column Responsive Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:items-stretch pt-1">
              {/* Left: Config (5 cols) */}
              <div className="lg:col-span-5 flex flex-col space-y-4">
                <div className="text-[11px] font-bold text-slate-400 tracking-wider uppercase">{t("生成参数配置")}</div>

                {genType === "random" ? (
                  <div className="flex-1 space-y-4 bg-slate-50 border border-slate-200/60 p-4 rounded-xl flex flex-col justify-between">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-xs font-semibold">
                        <span className="text-slate-600">{tf.genLength(genConfig.length)}</span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded font-mono ${genConfig.length >= 16 ? "bg-emerald-100 text-emerald-800" : genConfig.length >= 12 ? "bg-amber-100 text-amber-800" : "bg-rose-100 text-rose-800"}`}>
                          {genConfig.length >= 16 ? t("极其安全") : genConfig.length >= 12 ? t("安全合规") : t("强度偏低")}
                        </span>
                      </div>
                      <input type="range" min={8} max={64} value={genConfig.length}
                        onChange={(e) => setGenConfig(prev => ({ ...prev, length: parseInt(e.target.value) }))}
                        className="w-full accent-indigo-600 h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer" />
                    </div>

                    <div className="flex flex-wrap gap-x-4 gap-y-2 pt-1">
                      {[
                        { key: "useLowercase" as const, label: t("包含小写字母 (a-z)") },
                        { key: "useUppercase" as const, label: t("包含大写字母 (A-Z)") },
                        { key: "useNumbers" as const, label: t("包含数字成员 (0-9)") },
                        { key: "useSymbols" as const, label: t("包含特殊符号 (!@#)") },
                        { key: "excludeConfuse" as const, label: t("排除易混淆字 (l, 1, O, 0)") },
                      ].map(cb => (
                        <label key={cb.key} className="flex items-center space-x-2 text-xs text-slate-600 cursor-pointer select-none whitespace-nowrap">
                          <input type="checkbox" checked={genConfig[cb.key]}
                            onChange={(e) => setGenConfig(prev => ({ ...prev, [cb.key]: e.target.checked }))}
                            className="w-3.5 h-3.5 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500 accent-indigo-600 cursor-pointer" />
                          <span>{cb.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 space-y-4 bg-slate-50 border border-slate-200/60 p-4 rounded-xl flex flex-col justify-between">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-xs font-semibold">
                        <span className="text-slate-600">{tf.passphraseWords(passphraseWords)}</span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded font-mono ${passphraseWords >= 5 ? "bg-emerald-100 text-emerald-800" : passphraseWords >= 4 ? "bg-amber-100 text-amber-800" : "bg-rose-100 text-rose-800"}`}>
                          {passphraseWords >= 5 ? t("极其易记安全") : passphraseWords >= 4 ? t("合规高抗撞") : t("较弱")}
                        </span>
                      </div>
                      <input type="range" min={3} max={8} value={passphraseWords}
                        onChange={(e) => setPassphraseWords(parseInt(e.target.value))}
                        className="w-full accent-indigo-600 h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer" />
                    </div>

                    <div className="space-y-3 pt-1">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 tracking-wider uppercase mb-1">{t("自定义短语分隔符")}</label>
                        <input type="text" maxLength={3} value={passphraseSeparator}
                          onChange={(e) => setPassphraseSeparator(e.target.value)}
                          placeholder={t("如: - . _")} className="w-full bg-white border border-slate-200/60 focus:border-indigo-500 focus:bg-white rounded-lg px-3 py-1 text-xs outline-none text-slate-800 font-mono" />
                      </div>
                      <div className="flex flex-wrap gap-x-4 gap-y-2">
                        <label className="flex items-center space-x-2 text-xs text-slate-600 cursor-pointer select-none whitespace-nowrap">
                          <input type="checkbox" checked={passphraseCapitalize} onChange={(e) => setPassphraseCapitalize(e.target.checked)}
                            className="w-3.5 h-3.5 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500 accent-indigo-600 cursor-pointer" />
                          <span>{t("每个单词首字母大写")}</span>
                        </label>
                        <label className="flex items-center space-x-2 text-xs text-slate-600 cursor-pointer select-none whitespace-nowrap">
                          <input type="checkbox" checked={passphraseAddNumber} onChange={(e) => setPassphraseAddNumber(e.target.checked)}
                            className="w-3.5 h-3.5 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500 accent-indigo-600 cursor-pointer" />
                          <span>{t("在尾部追加随机数字")}</span>
                        </label>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Right: Output & History (7 cols) */}
              <div className="lg:col-span-7 flex flex-col space-y-4 lg:border-l lg:border-slate-200/60 lg:pl-6 w-full">
                <div className="text-[11px] font-bold text-slate-400 tracking-wider uppercase shrink-0">{t("生成结果 & 安全评估")}</div>

                {/* Generated Password */}
                <div className="bg-slate-900 text-white rounded-xl p-3.5 font-mono text-xs md:text-sm tracking-wider flex items-start justify-between shadow-inner relative group min-h-[52px] w-full shrink-0">
                  <span className="break-all whitespace-pre-wrap pr-4 text-emerald-400 font-mono leading-relaxed select-all">{generatedPass || t("请选择参数派生")}</span>
                  <div className="flex items-center space-x-2 shrink-0 pt-0.5">
                    <button type="button" onClick={onGenerate} className="text-slate-500 hover:text-white transition-colors cursor-pointer" title={t("重新生成")}>
                      <RefreshCw className="w-3.5 h-3.5" /></button>
                    <button type="button" onClick={() => { onCopy(generatedPass, t("生成的密码")); onSaveToHistory(); }} className="text-slate-500 hover:text-white transition-colors cursor-pointer" title={t("复制密码")}>
                      <Copy className="w-3.5 h-3.5" /></button>
                  </div>
                </div>

                {/* Entropy */}
                <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl flex items-center justify-between text-[11px] font-mono text-slate-500 shrink-0">
                  <div><span>{t("热力学物理熵: ")}</span><span className={`font-bold ${entropy >= 80 ? "text-emerald-600" : entropy >= 50 ? "text-amber-600" : "text-rose-600"}`}>{entropy} bits</span></div>
                  <div><span>{t("估计破译耗时: ")}</span><span className="font-bold text-slate-700">{crackTime}</span></div>
                </div>

                {/* Safety Recommendation */}
                <div className="bg-amber-50/40 border border-amber-200/50 p-3.5 rounded-xl text-[11px] text-amber-800 leading-relaxed flex-1 flex flex-col justify-center">
                  <div className="flex items-center space-x-2">
                    <span className="text-amber-500 font-bold shrink-0 text-sm leading-none">※</span>
                    <span>{t("强烈推荐使用 16 位以上密码，或者 5 个单词以上的易记安全短语 (Passphrase)，以抵御社会工程拖库爆破。")}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* History — 全宽置于双列下方 */}
            <div className="border-t border-slate-100 pt-5 mt-4 flex flex-col space-y-3 shrink-0">
              <div className="flex items-center justify-between shrink-0">
                <h4 className="text-xs font-bold text-slate-800 flex items-center space-x-1.5">
                  <Clock className="w-3.5 h-3.5 text-slate-500" /><span>{t("生成密码历史流缓存")}</span>
                </h4>
                {generatorHistory.length > 0 && (
                  <button type="button" onClick={onClearHistory} className="text-[10px] font-semibold text-slate-400 hover:text-rose-500 transition-colors cursor-pointer">{t("清空")}</button>
                )}
              </div>

              <div className="h-[202px] flex flex-col justify-center">
                {generatorHistory.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 overflow-y-auto h-full pr-1 content-start">
                    {generatorHistory.map((pass, idx) => (
                      <div key={idx} className="bg-slate-50 hover:bg-slate-100/80 px-2.5 py-2 rounded-lg border border-slate-100 flex items-center justify-between font-mono text-[10px] select-all shadow-sm transition-colors group text-left h-fit">
                        <span className="truncate pr-4 text-slate-600 font-mono">{pass}</span>
                        <button type="button" onClick={() => onCopy(pass, t("历史密码"))}
                          className="text-slate-400 hover:text-indigo-600 shrink-0 transition-colors opacity-0 group-hover:opacity-100 cursor-pointer p-0.5" title={t("复制此密码")}>
                          <Copy className="w-3.5 h-3.5" /></button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="bg-slate-50 border border-slate-200 border-dashed rounded-xl p-6 flex flex-col items-center justify-center text-center h-full">
                    <div className="flex items-center space-x-2 text-indigo-500 font-semibold text-[11px]">
                      <Clock className="w-4 h-4 text-slate-400" />
                      <span>{t("暂无生成记录，点击复制密码后会自动存入缓存")}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
