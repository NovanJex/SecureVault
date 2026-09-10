// otp.ts — TOTP 密钥解析与归一化（粘贴输入、KDBX 导入共用）

/**
 * 从任意输入提取 Base32 密钥：
 * - otpauth:// URI → 取 secret= 参数（并做百分号解码）
 * - 纯密钥文本 → 原样返回
 * - 含 :// 但无 secret= → undefined（无法识别的 URI，不当作密钥存储）
 */
export function extractOtpSecret(raw: string): string | undefined {
  if (!raw) return undefined;
  const trimmed = raw.trim();

  if (trimmed.startsWith("otpauth://")) {
    const m = trimmed.match(/[?&]secret=([^&]+)/i);
    if (!m) return undefined; // URI 无 secret 参数 → 不存
    let value = m[1];
    try { value = decodeURIComponent(value); } catch { /* 非编码字符原样使用 */ }
    return normalizeOtpSecret(value) || undefined;
  }

  if (trimmed.includes("://")) return undefined; // 其他协议 URI 不作为密钥
  return normalizeOtpSecret(trimmed) || undefined;
}

/**
 * Base32 密钥归一化：去空格/连字符/padding、转大写（兼容各站点展示格式）
 * 与 Rust 端 normalize_totp_secret 保持一致
 */
export function normalizeOtpSecret(secret: string): string {
  return (secret || "").trim().toUpperCase().replace(/[\s-]/g, "").replace(/=+$/, "");
}
