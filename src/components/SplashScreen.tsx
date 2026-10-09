// SplashScreen — 启动 Splash 屏幕，带进度条过渡动画

import React from "react";
import { LockKeyhole } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { t } from "../i18n";

export interface SplashScreenProps {
  visible: boolean;
  loadingStep: string;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ visible, loadingStep }) => (
  <AnimatePresence>
    {visible && (
      <motion.div
        initial={{ opacity: 1 }}
        exit={{ opacity: 0, scale: 0.98 }}
        transition={{ duration: 0.4, ease: "easeInOut" }}
        className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-slate-50 text-slate-900 select-none"
      >
        {/* Ambient background lights — matching LockScreen */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
          <div className="absolute w-[450px] h-[450px] rounded-full bg-indigo-200/30 filter blur-[100px] top-1/4 left-1/4 animate-pulse" />
          <div className="absolute w-[400px] h-[400px] rounded-full bg-blue-100/40 filter blur-[90px] bottom-1/4 right-1/4 animate-pulse" />
        </div>

        {/* Matrix grid background */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#e2e8f0_1px,transparent_1px),linear-gradient(to_bottom,#e2e8f0_1px,transparent_1px)] bg-[size:2rem_2rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-40 z-0 pointer-events-none" />

        <div className="relative z-10 flex flex-col items-center space-y-6 max-w-sm w-full px-6 text-center">
          {/* Glass card */}
          <div className="bg-white/95 backdrop-blur-md w-full rounded-2xl border border-slate-200/80 shadow-2xl shadow-slate-200/40 p-8 flex flex-col items-center space-y-6">

            {/* Spinning ring + lock icon */}
            <div className="relative flex items-center justify-center">
              <div className="absolute w-20 h-20 rounded-full border-2 border-indigo-500/10 border-t-indigo-600 animate-spin" />
              <div className="w-14 h-14 bg-indigo-50 rounded-2xl flex items-center justify-center border border-indigo-100 shadow-inner">
                <LockKeyhole className="w-6 h-6 text-indigo-600 animate-pulse" />
              </div>
            </div>

            {/* Title */}
            <div className="space-y-1.5">
              <h2 className="text-lg font-bold tracking-tight text-slate-800 font-sans">
                {t("SecureVault 安全保险箱")}
              </h2>
              <p className="text-[10px] text-slate-400 uppercase tracking-widest font-mono font-bold">
                ZERO-KNOWLEDGE SECURITY SANDBOX
              </p>
            </div>

            {/* Progress bar */}
            <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden border border-slate-200/60">
              <motion.div
                className="bg-gradient-to-r from-blue-500 to-indigo-600 h-full rounded-full"
                initial={{ width: "0%" }}
                animate={{ width: "100%" }}
                transition={{ duration: 1.2, ease: "easeInOut" }}
              />
            </div>

            {/* Loading step text */}
            <div className="h-5 flex items-center justify-center">
              <p className="text-[11px] text-indigo-600 font-mono tracking-wide font-medium flex items-center space-x-1.5">
                <span className="w-1 h-1 bg-indigo-500 rounded-full animate-ping" />
                <span>{loadingStep}</span>
              </p>
            </div>
          </div>
        </div>

        {/* Bottom branding */}
        <div className="absolute bottom-8 text-center space-y-1 relative z-10">
          <p className="text-[9px] text-slate-400 uppercase tracking-wider font-mono font-semibold">
            100% Client-Side Pure Local Cryptography Sandbox
          </p>
          <div className="flex items-center justify-center space-x-1.5 text-[9px] text-slate-400/80 font-mono">
            <span>AES-256-GCM</span>
            <span className="text-slate-300">•</span>
            <span>PBKDF2</span>
            <span className="text-slate-300">•</span>
            <span>Argon2id</span>
          </div>
        </div>
      </motion.div>
    )}
  </AnimatePresence>
);
