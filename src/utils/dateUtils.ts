// dateUtils.ts — 到期日期语义统一（列表徽标 / 详情徽标 / 审计统计共用）

/** 到期判定：到期日当天 23:59:59 之前视为未过期 */
export function isExpired(expiresAt?: string): boolean {
  if (!expiresAt) return false;
  const t = new Date(expiresAt + "T23:59:59").getTime();
  return Number.isFinite(t) && t < Date.now();
}

/**
 * 距到期天数：
 * - 已过期（含当天已过完）→ 负数或 0 以下
 * - 未来 N 天 → 1..N
 * 用 floor 语义避免 -0：过期后立即返回负值
 */
export function daysUntilExpiry(expiresAt: string): number {
  const end = new Date(expiresAt + "T23:59:59").getTime();
  if (!Number.isFinite(end)) return Infinity;
  const diff = end - Date.now();
  // 已过期（或正好到期瞬间）→ 用 floor 保证返回负值而非 -0
  if (diff < 0) return Math.floor(diff / 86400000);
  return Math.ceil(diff / 86400000);
}

/** 展示格式：2026-08-27 → 2026年8月27日 */
export function formatDateCn(dateStr: string): string {
  if (!dateStr) return "";
  const [y, m, d] = dateStr.split("-");
  if (!y || !m || !d) return dateStr;
  return `${Number(y)}年${Number(m)}月${Number(d)}日`;
}
