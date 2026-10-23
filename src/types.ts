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
  /** 密码历史（最新在前，最多保留 5 条；仅记录被替换掉的旧密码） */
  passwordHistory?: Array<{ password: string; changedAt: string }>;
  /** 回收站标记（ISO 时间；有值即已移入回收站，不参与统计/常规视图） */
  deletedAt?: string;
  /** 最近使用时间（打开详情 / 从列表复制密码时更新） */
  lastUsedAt?: string;
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
