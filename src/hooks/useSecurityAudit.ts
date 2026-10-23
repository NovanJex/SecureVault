// useSecurityAudit — 安全审计 Hook
// 基于密码强度 / 复用检测 / 已知泄露特征进行本地诊断

import { useState, useMemo, useCallback } from "react";
import type { VaultItem } from "../types";

export interface SecurityAuditResult {
  totalCount: number;
  weakCount: number;
  reusedCount: number;
  compromisedCount: number;
  ignoredCount: number;
  passMap: Record<string, number>;
}

export interface UseSecurityAuditReturn {
  isAuditScanning: boolean;
  hasAuditScanned: boolean;
  handleStartAudit: () => void;
  auditResult: SecurityAuditResult;
  getStrength: (password: string) => "weak" | "medium" | "strong";
}

/** 计算单条密码强度 */
export function calculateStrength(password: string): "weak" | "medium" | "strong" {
  if (!password || password.length < 8) return "weak";

  let score = 0;
  if (/[a-z]/.test(password)) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  if (password.length >= 14 && score >= 3) return "strong";
  if (password.length >= 10 && score >= 2) return "medium";
  return "weak";
}

/** 已知高风险密码特征（本地碰撞检测） */
export const KNOWN_COMPROMISED = new Set(["password", "password123", "123456", "12345678", "qwerty", "admin", "letmein"]);

export function useSecurityAudit(items: VaultItem[]): UseSecurityAuditReturn {
  const [isAuditScanning, setIsAuditScanning] = useState(false);
  const [hasAuditScanned, setHasAuditScanned] = useState(false);

  const handleStartAudit = useCallback(() => {
    setIsAuditScanning(true);
    setTimeout(() => {
      setIsAuditScanning(false);
      setHasAuditScanned(true);
    }, 800);
  }, []);

  /** 审计结果（即时计算，O(n)） */
  const auditResult = useMemo<SecurityAuditResult>(() => {
    const totalCount = items.length;
    const passMap: Record<string, number> = {};

    let weakCount = 0;
    let compromisedCount = 0;

    for (const item of items) {
      if (!item.password || item.ignoreSecurityWarning) continue;

      // 密码复用统计
      passMap[item.password] = (passMap[item.password] || 0) + 1;

      // 弱密码检测
      if (calculateStrength(item.password) === "weak") weakCount++;

      // 已知泄露特征检测
      if (KNOWN_COMPROMISED.has(item.password.toLowerCase())) compromisedCount++;
    }

    // 复用计数（出现次数 > 1 的密码所涉及的条目数）
    const reusedCount = items.filter(
      item => item.password && passMap[item.password] > 1 && !item.ignoreSecurityWarning
    ).length;

    const ignoredCount = items.filter(item => item.ignoreSecurityWarning).length;

    return { totalCount, weakCount, reusedCount, compromisedCount, ignoredCount, passMap };
  }, [items]);

  return {
    isAuditScanning,
    hasAuditScanned,
    handleStartAudit,
    auditResult,
    getStrength: calculateStrength,
  };
}
