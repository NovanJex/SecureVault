/**
 * Password Manager & PRD Hub Types
 */

export type ItemType = "login" | "card" | "note" | "identity";

export interface VaultItem {
  id: string;
  type: ItemType;
  title: string;
  folder: string;
  username?: string;
  password?: string;
  url?: string;
  cardName?: string;
  cardNumber?: string;
  cardExpiry?: string;
  cardCvv?: string;
  identityName?: string;
  identityEmail?: string;
  identityPhone?: string;
  identityAddress?: string;
  notes?: string;
  /** 自定义字段（键值对，随 vault 加密存储） */
  customFields?: Record<string, string>;
  /** TOTP 两步验证密钥（Base32 编码，随 vault 加密存储） */
  otpSecret?: string;
  /** 到期日期（YYYY-MM-DD，如卡券有效期、证书过期日） */
  expiresAt?: string;
  updatedAt: string;
  strength: "weak" | "medium" | "strong";
  isFavorite?: boolean;
  ignoreSecurityWarning?: boolean;
}

export interface VaultFolder {
  id: string;
  name: string;
  icon: string;
}

export interface PasswordConfig {
  length: number;
  useUppercase: boolean;
  useLowercase: boolean;
  useNumbers: boolean;
  useSymbols: boolean;
  excludeConfuse: boolean;
}

export interface ChatMessage {
  role: "user" | "model";
  text: string;
  timestamp: string;
}
