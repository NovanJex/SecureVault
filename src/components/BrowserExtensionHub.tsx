// BrowserExtensionHub — 浏览器扩展中心面板
// 支持一键打包下载 Manifest V3 扩展 ZIP + 在线模拟器

import React, { useState, useEffect } from "react";
import {
  Download,
  Chrome,
  ShieldCheck,
  KeyRound,
  Copy,
  Check,
  Lock,
  Globe,
  Smartphone,
  RefreshCw,
  Sparkles,
  Zap,
  Info,
  MousePointerClick
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { writeText } from '@tauri-apps/plugin-clipboard-manager';
import { save } from '@tauri-apps/plugin-dialog';
import { getVersion } from '@tauri-apps/api/app';
import { invoke } from '@tauri-apps/api/core';
import { VaultItem } from "../types";
import { generateExtensionZip } from "../utils/extensionGenerator";

interface BrowserExtensionHubProps {
  vaultItems: VaultItem[];
  /** 异步获取加密导出数据（用于嵌入扩展包和复制同步密文） */
  getEncryptedPayload: () => Promise<string | null>;
  /** 当前选择的密钥派生算法 */
  selectedKdf: "argon2id" | "pbkdf2";
  showToast: (msg: string) => void;
}

export const BrowserExtensionHub: React.FC<BrowserExtensionHubProps> = ({
  vaultItems,
  getEncryptedPayload,
  selectedKdf,
  showToast
}) => {
  const [activeGuideTab, setActiveGuideTab] = useState<"chromium" | "firefox" | "safari" | "mobile">("chromium");
  const [isGeneratingZip, setIsGeneratingZip] = useState(false);
  const [copiedSyncText, setCopiedSyncText] = useState(false);
  const [appVersion, setAppVersion] = useState("1.3.1");

  // 模拟器状态
  const [simDomain, setSimDomain] = useState("github.com");
  const [simUnlocked, setSimUnlocked] = useState(false);
  const [simMasterPass, setSimMasterPass] = useState("");
  const [simFillSuccess, setSimFillSuccess] = useState<string | null>(null);
  const [simSearchQuery, setSimSearchQuery] = useState("");

  // 启动时获取应用版本号
  useEffect(() => {
    getVersion().then(v => setAppVersion(v)).catch(() => {});
  }, []);

  // Helper: Blob → Base64（用于 Tauri 二进制文件写入）
  const blobToBase64 = async (blob: Blob): Promise<string> => {
    const buffer = await blob.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  };

  // 打包下载扩展 ZIP（通过 Tauri save dialog）
  const handleDownloadExtension = async () => {
    setIsGeneratingZip(true);
    try {
      const payload = await getEncryptedPayload();
      const blob = await generateExtensionZip(payload, appVersion, selectedKdf);
      const base64 = await blobToBase64(blob);

      const filePath = await save({
        filters: [{ name: '浏览器扩展', extensions: ['zip'] }],
        defaultPath: 'SecureVault_Browser_Extension.zip',
      });
      if (!filePath) { setIsGeneratingZip(false); return; }

      await invoke('write_binary_file', { path: filePath, dataB64: base64 });
      showToast("📦 已成功生成并打包下载 Manifest V3 扩展 ZIP 包！");
    } catch (err) {
      console.error("生成扩展失败:", err);
      showToast("❌ 生成扩展压缩包失败，请重试！");
    } finally {
      setIsGeneratingZip(false);
    }
  };

  // 复制加密同步密文到剪贴板
  const handleCopySyncPayload = async () => {
    try {
      const payload = await getEncryptedPayload();
      if (!payload) {
        showToast("⚠️ 保险箱未解锁，无法获取加密同步数据");
        return;
      }
      await writeText(payload);
      setCopiedSyncText(true);
      showToast("📋 已复制扩展同步数据密文，可在扩展中粘贴一键同步！");
      setTimeout(() => setCopiedSyncText(false), 2000);
    } catch {
      showToast("⚠️ 剪贴板访问失败");
    }
  };

  // 模拟器域名匹配
  const simMatchedItems = vaultItems.filter(item => {
    if (!simDomain || !item.url) return false;
    return item.url.toLowerCase().includes(simDomain.toLowerCase());
  });

  const simDisplayItems = simSearchQuery
    ? vaultItems.filter(i =>
        i.title.toLowerCase().includes(simSearchQuery.toLowerCase()) ||
        (i.username && i.username.toLowerCase().includes(simSearchQuery.toLowerCase()))
      )
    : vaultItems;

  return (
    <div className="overflow-y-auto bg-slate-50/50 p-3 md:p-4 space-y-2.5 max-w-6xl mx-auto w-full text-slate-800">

      {/* 1. HERO BANNER */}
      <div className="bg-gradient-to-br from-indigo-900 via-slate-900 to-slate-950 text-white rounded-2xl p-2 md:p-2.5 border border-indigo-800/40 shadow-xl relative overflow-hidden">
        <div className="absolute -top-24 -right-24 w-80 h-80 bg-indigo-500/20 rounded-full filter blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-80 h-80 bg-blue-500/20 rounded-full filter blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3">
          <div className="space-y-1 max-w-2xl">
            <div className="inline-flex items-center space-x-2 bg-indigo-500/20 border border-indigo-400/30 rounded-full px-2.5 py-0.5 text-[10px] font-mono text-indigo-300">
              <Sparkles className="w-3 h-3 text-indigo-400 animate-pulse" />
              <span>Manifest V3 零知识无痕自动填充架构</span>
            </div>

            <h1 className="text-base md:text-lg font-bold tracking-tight text-white font-sans">
              SecureVault 跨浏览器扩展程序
            </h1>

            <p className="text-[11px] text-slate-300 leading-relaxed font-sans">
              打包生成的扩展内嵌桌面端加密备份数据，无需打开 Web 主应用。安装后输入主密码，通过轻量级扩展即可离线解锁、一键填充凭证。支持 Argon2id / PBKDF2 双 KDF 本地零知识解密，15 分钟无操作自动锁定内存密钥，数据绝不联网、绝不上传。
            </p>

          </div>

          {/* 操作按钮组 */}
          <div className="w-full lg:w-auto shrink-0 flex flex-col sm:flex-row lg:flex-col gap-1.5">
            <button
              onClick={handleDownloadExtension}
              disabled={isGeneratingZip}
              className="bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700 text-white px-3.5 py-2 rounded-xl text-xs font-bold transition-all shadow-md shadow-indigo-600/30 hover:shadow-indigo-500/40 cursor-pointer flex items-center justify-center space-x-2 border border-indigo-400/30"
            >
              {isGeneratingZip ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>正在打包生成扩展...</span>
                </>
              ) : (
                <>
                  <Download className="w-3.5 h-3.5" />
                  <span>打包下载浏览器扩展 (.zip)</span>
                </>
              )}
            </button>

            <button
              onClick={handleCopySyncPayload}
              className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center justify-center space-x-2"
            >
              {copiedSyncText ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
              <span>{copiedSyncText ? "密文已复制" : "复制扩展同步密文"}</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. 模拟器 + 架构优势 Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">

        {/* 左侧：扩展交互在线模拟器 (7列) */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200/80 shadow-sm p-3 space-y-2 flex flex-col">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <div className="flex items-center space-x-2">
              <div className="p-1.5 bg-indigo-50 rounded-lg text-indigo-600">
                <Zap className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs md:text-sm font-bold text-slate-800">扩展交互在线模拟器</h3>
                <p className="text-[10px] text-slate-400">实时体验扩展 Popup 的域名精准匹配与无痕自动填充效果</p>
              </div>
            </div>
            <span className="text-[10px] font-mono bg-indigo-50 text-indigo-700 border border-indigo-100 px-2 py-0.5 rounded font-semibold">
              Live Preview
            </span>
          </div>

          {/* 目标网址切换器 */}
          <div className="bg-slate-100/80 p-1.5 rounded-xl flex items-center space-x-2 border border-slate-200/60">
            <Globe className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="text-[10px] font-mono text-slate-400 select-none">https://</span>
            <input
              type="text"
              value={simDomain}
              onChange={(e) => setSimDomain(e.target.value)}
              placeholder="测试网址, 如 github.com, google.com"
              className="flex-1 bg-white border border-slate-200/80 rounded-lg px-2 py-0.5 text-xs outline-none focus:border-indigo-500 font-mono text-slate-700 font-bold"
            />
            <span className="text-[10px] bg-slate-200 text-slate-600 px-2 py-0.5 rounded font-mono font-medium">当前网页</span>
          </div>

          {/* 模拟扩展 Popup 窗口 */}
          <div className="bg-slate-100 rounded-xl py-2 px-2 border border-slate-200 shadow-inner relative flex flex-col items-center justify-center min-h-[190px]">
            <div className="w-[300px] bg-white text-slate-800 rounded-xl border border-slate-200 shadow-xl overflow-hidden text-left flex flex-col">

              {/* 扩展 Header */}
              <div className="bg-slate-50 px-3 py-1.5 border-b border-slate-200 flex items-center justify-between">
                <div className="flex items-center space-x-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />
                  <span className="text-xs font-bold text-slate-800 tracking-tight">SecureVault</span>
                  <span className="text-[9px] bg-indigo-50 text-indigo-700 border border-indigo-200 px-1 py-0.5 rounded font-mono font-bold">MV3</span>
                </div>
                {simUnlocked && (
                  <button
                    onClick={() => setSimUnlocked(false)}
                    className="text-[10px] text-slate-500 hover:text-slate-800 bg-white hover:bg-slate-100 px-2 py-0.5 rounded border border-slate-200 font-medium transition-colors cursor-pointer"
                  >
                    锁定
                  </button>
                )}
              </div>

              {/* Popup 内容 */}
              <div className="p-3 space-y-2 font-sans">
                {!simUnlocked ? (
                  <div className="text-center py-3 space-y-2">
                    <div className="w-10 h-10 bg-indigo-50 border border-indigo-100 rounded-xl flex items-center justify-center mx-auto text-indigo-600 shadow-sm">
                      <Lock className="w-5 h-5 animate-pulse" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-800">解密 SecureVault 保险箱</h4>
                      <p className="text-[10px] text-slate-400 mt-0.5">本地派生解密凭证数据</p>
                    </div>
                    <div className="space-y-1.5 pt-1">
                      <input
                        type="password"
                        value={simMasterPass}
                        onChange={(e) => setSimMasterPass(e.target.value)}
                        placeholder="输入主解密密码..."
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 placeholder-slate-400 outline-none focus:border-indigo-500 focus:bg-white"
                      />
                      <button
                        onClick={() => {
                          if (!simMasterPass) { showToast("⚠️ 请输入模拟密码！"); return; }
                          setSimUnlocked(true);
                        }}
                        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-1.5 rounded-lg text-xs transition-colors cursor-pointer shadow-sm"
                      >
                        解锁扩展保险箱
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {/* 域名匹配区 */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">📍 当前域名匹配</span>
                        <span className="text-[9px] bg-indigo-50 text-indigo-700 border border-indigo-100 px-1.5 py-0.5 rounded font-mono font-bold">
                          {simDomain}
                        </span>
                      </div>
                      {simMatchedItems.length > 0 ? (
                        <div className="space-y-1">
                          {simMatchedItems.map(item => (
                            <div key={item.id} className="bg-indigo-50/40 border border-indigo-200/80 rounded-lg p-2 flex flex-col space-y-1">
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-slate-800">{item.title}</span>
                                <span className="text-[9px] text-slate-400 font-mono truncate max-w-[110px]">{item.url}</span>
                              </div>
                              <div className="text-[10px] text-slate-600 font-mono">{item.username || "未设定账号"}</div>
                              <div className="flex space-x-1.5 pt-0.5">
                                <button
                                  onClick={() => {
                                    setSimFillSuccess(`✨ 已成功将 ${item.title} 的账号密码填入页面！`);
                                    setTimeout(() => setSimFillSuccess(null), 3000);
                                    showToast(`✅ 模拟填充成功：${item.title}`);
                                  }}
                                  className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-bold py-1 px-2 rounded transition-colors cursor-pointer flex items-center justify-center space-x-1 shadow-sm"
                                >
                                  <MousePointerClick className="w-3 h-3" />
                                  <span>一键填充</span>
                                </button>
                                <button
                                  onClick={() => {
                                    writeText(item.password || "").then(() =>
                                      showToast("🔑 模拟复制密码成功！")
                                    ).catch(() => {});
                                  }}
                                  className="bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 text-[10px] font-bold py-1 px-2 rounded transition-colors cursor-pointer shadow-sm"
                                >
                                  复制密码
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-[10px] text-slate-400 bg-slate-50 p-2 rounded-lg border border-slate-200 border-dashed text-center font-medium">
                          未在该域名检测到已匹配的常规凭证
                        </div>
                      )}
                    </div>

                    {/* 搜索全部凭证 */}
                    <div>
                      <input
                        type="text"
                        value={simSearchQuery}
                        onChange={(e) => setSimSearchQuery(e.target.value)}
                        placeholder="🔍 检索所有账号..."
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-[10px] text-slate-800 placeholder-slate-400 outline-none focus:border-indigo-500 focus:bg-white"
                      />
                    </div>

                    <div className="max-h-32 overflow-y-auto space-y-1 pr-1">
                      {simDisplayItems.slice(0, 4).map(item => (
                        <div key={item.id} className="bg-slate-50 border border-slate-200/80 rounded-lg p-1.5 flex items-center justify-between">
                          <div className="min-w-0 pr-2">
                            <p className="text-[10px] font-bold text-slate-800 truncate">{item.title}</p>
                            <p className="text-[9px] text-slate-500 font-mono truncate">{item.username || "未设定账号"}</p>
                          </div>
                          <button
                            onClick={() => {
                              setSimFillSuccess(`✨ 已成功填入 ${item.title}！`);
                              setTimeout(() => setSimFillSuccess(null), 3000);
                            }}
                            className="bg-white hover:bg-indigo-50 text-indigo-600 border border-slate-200 hover:border-indigo-200 text-[9px] px-1.5 py-0.5 rounded font-bold transition-colors cursor-pointer shrink-0 shadow-sm"
                          >
                            填充
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* 模拟填充 Toast */}
            <AnimatePresence>
              {simFillSuccess && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="absolute bottom-2 bg-emerald-600 text-white text-[11px] font-bold px-3 py-1.5 rounded-full shadow-lg flex items-center space-x-1 z-20 border border-emerald-500"
                >
                  <Check className="w-3 h-3" />
                  <span>{simFillSuccess}</span>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* 右侧：四大核心优势 (5列) */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200/80 shadow-sm p-3 space-y-2 flex flex-col justify-between">
          <div className="space-y-1.5 flex-1 flex flex-col">
            <h3 className="text-xs md:text-sm font-bold text-slate-800 flex items-center space-x-2 border-b border-slate-100 pb-1.5">
              <ShieldCheck className="w-4 h-4 text-indigo-600" />
              <span>Manifest V3 架构四大核心优势</span>
            </h3>

            <div className="grid grid-cols-1 gap-1.5 flex-1 pt-0.5">
              {[
                { title: "零知识本地派生", desc: "主密码仅在扩展内存参与 PBKDF2 解密 + AES-GCM，数据不上报任何服务器。", icon: KeyRound, color: "text-indigo-600 bg-indigo-50 border-indigo-100" },
                { title: "智能域名精准匹配", desc: "自动获取当前标签页主域名，优先呈现该站点的关联凭证。", icon: Globe, color: "text-blue-600 bg-blue-50 border-blue-100" },
                { title: "防窃听无痕填充", desc: "通过 Content Script 沙箱隔离注入，有效隔离恶意页面 DOM 侦听。", icon: Zap, color: "text-emerald-600 bg-emerald-50 border-emerald-100" },
                { title: "15 分钟内存自动锁定", desc: "休眠超时后自动清空内存密钥，防止电脑借用时的隐私泄露。", icon: Lock, color: "text-purple-600 bg-purple-50 border-purple-100" }
              ].map((feat, idx) => {
                const IconComp = feat.icon;
                return (
                  <div key={idx} className="p-2 rounded-xl border border-slate-100 bg-slate-50/60 hover:border-indigo-200 transition-colors flex flex-col justify-center">
                    <div className="flex items-center space-x-2">
                      <div className={`p-1 rounded-lg border ${feat.color}`}>
                        <IconComp className="w-3.5 h-3.5" />
                      </div>
                      <span className="text-xs font-bold text-slate-800">{feat.title}</span>
                    </div>
                    <p className="text-[10px] text-slate-500 leading-relaxed pl-6.5 mt-0.5">{feat.desc}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* 3. 全平台浏览器安装加载指南 */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-3 md:p-3.5 space-y-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2">
          <div>
            <h3 className="text-xs md:text-sm font-bold text-slate-800 flex items-center space-x-2">
              <Chrome className="w-4 h-4 text-indigo-600" />
              <span>全平台浏览器安装加载指南</span>
            </h3>
            <p className="text-[10px] text-slate-500 mt-0.5">选择您正在使用的浏览器，查看 1 分钟解压加载安装步骤</p>
          </div>

          <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200/60 font-medium text-xs">
            {[
              { key: "chromium" as const, label: "Chromium (Chrome/Edge/Brave)" },
              { key: "firefox" as const, label: "Firefox 火狐" },
              { key: "safari" as const, label: "Safari" },
              { key: "mobile" as const, label: "安卓手机 (Kiwi/Orion)" }
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveGuideTab(tab.key)}
                className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer text-[11px] font-medium whitespace-nowrap ${
                  activeGuideTab === tab.key ? "bg-white text-indigo-600 shadow-sm font-bold" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* 指南内容（固定最小高度防微动） */}
        <div className="pt-0.5 min-h-[64px] flex flex-col justify-center">
          {activeGuideTab === "chromium" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2">
              {[
                { step: "01", title: "解压 ZIP 压缩包", desc: "将下载的 SecureVault_Browser_Extension.zip 解压到本地任意文件夹。" },
                { step: "02", title: "打开扩展管理页", desc: "在地址栏输入 chrome://extensions/ (Edge 为 edge://extensions/ ) 并回车。" },
                { step: "03", title: "开启开发者模式", desc: "在扩展管理页面右上角，开启「开发者模式」开关。" },
                { step: "04", title: "加载已解压扩展", desc: "点击「加载已解压的扩展程序」，选择解压出来的目录即可！" }
              ].map((item, idx) => (
                <div key={idx} className="bg-slate-50 border border-slate-200/80 rounded-xl p-2 space-y-0.5 relative overflow-hidden h-full flex flex-col justify-start">
                  <div className="flex items-center space-x-1.5">
                    <span className="text-xs font-bold font-mono text-indigo-600">{item.step}</span>
                    <h4 className="text-xs font-bold text-slate-800">{item.title}</h4>
                  </div>
                  <p className="text-[10px] text-slate-500 leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>
          )}

          {activeGuideTab === "firefox" && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              {[
                { step: "01", title: "打开 about:debugging", desc: "在 Firefox 地址栏输入 about:debugging 并按回车。" },
                { step: "02", title: "进入「此 Firefox」", desc: "点击左侧边栏的「此 Firefox」选项。" },
                { step: "03", title: "载入临时附加组件", desc: "点击「载入临时附加组件…」，选择解压目录中的 manifest.json 文件即可！" }
              ].map((item, idx) => (
                <div key={idx} className="bg-slate-50 border border-slate-200/80 rounded-xl p-2 space-y-0.5 h-full flex flex-col justify-start">
                  <div className="flex items-center space-x-1.5">
                    <span className="text-xs font-bold font-mono text-indigo-600">{item.step}</span>
                    <h4 className="text-xs font-bold text-slate-800">{item.title}</h4>
                  </div>
                  <p className="text-[10px] text-slate-500 leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>
          )}

          {activeGuideTab === "safari" && (
            <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-2 space-y-0.5 h-full flex flex-col justify-center">
              <h4 className="text-xs font-bold text-slate-800 flex items-center space-x-2">
                <Info className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                <span>Safari 开发者转换模式</span>
              </h4>
              <p className="text-[10px] text-slate-600 leading-relaxed">
                Safari 使用 Apple Xcode 提供的 <code className="bg-slate-200 px-1 py-0.5 rounded font-mono text-[9px]">xcrun safari-web-extension-converter</code> 工具将 WebExtensions 转换为 Xcode 工程。轻量级 macOS 浏览器如 Orion 可直接以开发者模式一键加载解压目录。
              </p>
            </div>
          )}

          {activeGuideTab === "mobile" && (
            <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-2 space-y-0.5 h-full flex flex-col justify-center">
              <h4 className="text-xs font-bold text-slate-800 flex items-center space-x-2">
                <Smartphone className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                <span>Kiwi Browser / Orion (Android 移动端扩展)</span>
              </h4>
              <p className="text-[10px] text-slate-600 leading-relaxed">
                在 Android 手机上安装 <strong>Kiwi Browser</strong>，在 Kiwi 中访问 <code className="bg-slate-200 px-1 py-0.5 rounded font-mono text-[9px]">chrome://extensions</code>，勾选开发者模式，点击「+ from .zip / .crx / .user.js」即可加载并体验一键无痕填充！
              </p>
            </div>
          )}
        </div>
      </div>

    </div>
  );
};
