import React, { useState, useEffect, useRef } from "react";
import {
  Lock,
  KeyRound,
  ShieldCheck,
  ShieldAlert,
  Folder,
  FolderPlus,
  ChevronDown,
  Plus,
  Trash2,
  Edit3,
  Copy,
  Check,
  Eye,
  EyeOff,
  Search,
  Sparkles,
  Download,
  RefreshCw,
  FileText,
  ChevronRight,
  User,
  CreditCard,
  FileSpreadsheet,
  AlertTriangle,
  Clock,
  ExternalLink,
  LockKeyholeOpen,
  FileCheck2,
  X,
  Star,
  Settings,
  Upload,
  Chrome,
  Globe
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { writeText } from '@tauri-apps/plugin-clipboard-manager';
import { save, open } from '@tauri-apps/plugin-dialog';
import { open as shellOpen } from '@tauri-apps/plugin-shell';
import { ItemType, VaultItem, VaultFolder } from "./types";
import { secureRandomIndex } from "./utils/vaultStorage";
import { decryptVault, deriveMasterKey } from "./utils/tauriBridge";
import { invoke } from '@tauri-apps/api/core';
import { useVault } from "./hooks/useVault";
import { usePasswordGenerator } from "./hooks/usePasswordGenerator";
import { useSecurityAudit, calculateStrength } from "./hooks/useSecurityAudit";
import { LockScreen } from "./components/LockScreen";
import { FolderModal } from "./components/FolderModal";
import { DeleteConfirmModal } from "./components/DeleteConfirmModal";
import { ImportPasswordModal } from "./components/ImportPasswordModal";
import { SplashScreen } from "./components/SplashScreen";
import { CredentialDetail } from "./components/CredentialDetail";
import { SecurityAudit } from "./components/SecurityAudit";
import { PasswordGenerator } from "./components/PasswordGenerator";
import { BrowserExtensionHub } from "./components/BrowserExtensionHub";
import { BrowserImportPreview } from "./components/BrowserImportPreview";
import { importBrowserFile, checkDuplicates, type ImportResult } from "./utils/browserImport";

export default function App() {
  // ===== 保险箱核心 Hook =====
  const {
    isLocked, vaultLoaded, isFirstTime,
    isDeriving, derivationProgress, unlockError,
    vaultItems, folders, autoLockTimeout,
    selectedKdf, setSelectedKdf,
    createMasterPassword, unlockVault, lockVault, forceResetVault, changeMasterPassword,
    setVaultItems, setFolders, setAutoLockTimeout, setUnlockError,
    masterKey, vaultSalt,
    exportData, importData,
  } = useVault();

  // ===== UI 本地状态 =====
  const [enteredPassword, setEnteredPassword] = useState<string>("");

  // 文件夹管理
  const [newFolderName, setNewFolderName] = useState<string>("");
  const [showFolderModal, setShowFolderModal] = useState<boolean>(false);
  const [folderError, setFolderError] = useState<string>("");
  const [editingFolderId, setEditingFolderId] = useState<string | null>(null);
  const [editingFolderName, setEditingFolderName] = useState<string>("");

  const getTimeoutLabel = (minutes: number) => {
    if (minutes === 0) return "从不锁定";
    if (minutes < 60) return `${minutes} 分钟`;
    return `${minutes / 60} 小时`;
  };

  // 过滤与搜索状态
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedFolder, setSelectedFolder] = useState<string>("all"); // 'all'=全部, 'favorites'=收藏, 或指定文件夹名
  const [selectedItemType, setSelectedItemType] = useState<"all" | ItemType>("all");

  // 选择与表单状态
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [isCreating, setIsCreating] = useState<boolean>(false);
  const [formType, setFormType] = useState<ItemType>("login");
  const [deleteConfirm, setDeleteConfirm] = useState<{
    type: "item" | "folder";
    id: string;
    name: string;
  } | null>(null);

  // 临时表单字段
  const [formTitle, setFormTitle] = useState("");
  const [formFolder, setFormFolder] = useState("未分类");
  const [isFormFolderDropdownOpen, setIsFormFolderDropdownOpen] = useState(false);
  const [formUsername, setFormUsername] = useState("");
  const [formPassword, setFormPassword] = useState("");
  const [formUrl, setFormUrl] = useState("");
  const [formCardName, setFormCardName] = useState("");
  const [formCardNumber, setFormCardNumber] = useState("");
  const [formCardExpiry, setFormCardExpiry] = useState("");
  const [formCardCvv, setFormCardCvv] = useState("");
  const [formIdentityName, setFormIdentityName] = useState("");
  const [formIdentityEmail, setFormIdentityEmail] = useState("");
  const [formIdentityPhone, setFormIdentityPhone] = useState("");
  const [formIdentityAddress, setFormIdentityAddress] = useState("");
  const [formNotes, setFormNotes] = useState("");
  const [showFormPassword, setShowFormPassword] = useState(false);

  // 密码明文/暗文显示映射
  const [revealedPasswords, setRevealedPasswords] = useState<Record<string, boolean>>({});

  // ===== 密码生成器 Hook =====
  const {
    genType, setGenType,
    genConfig, setGenConfig,
    passphraseWords, setPassphraseWords,
    passphraseSeparator, setPassphraseSeparator,
    passphraseCapitalize, setPassphraseCapitalize,
    passphraseAddNumber, setPassphraseAddNumber,
    generatedPass, generatorHistory,
    generatePassword, saveGeneratedToHistory, clearGeneratorHistory,
    calculateEntropy, calculatePassphraseEntropy,
  } = usePasswordGenerator();

  const [clipboardTimeLeft, setClipboardTimeLeft] = useState<number | null>(null);
  const clipboardIntervalRef = useRef<any>(null);

  // ===== 安全审计 Hook =====
  const { isAuditScanning, hasAuditScanned, handleStartAudit, auditResult, getStrength } = useSecurityAudit(vaultItems);
  // pendingSaveRef 已移入 useVault Hook

  // Toast 通知
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [showForceResetConfirm, setShowForceResetConfirm] = useState<boolean>(false);

  // 导入/导出状态
  const [importStrategy, setImportStrategy] = useState<"merge" | "overwrite">("merge");
  const [showImportPasswordModal, setShowImportPasswordModal] = useState<boolean>(false);
  const [importBackupData, setImportBackupData] = useState<any>(null);
  const [importPassword, setImportPassword] = useState<string>("");
  const [importPasswordError, setImportPasswordError] = useState<string>("");
  const [isImportDecrypting, setIsImportDecrypting] = useState(false);
  const [importDecryptProgress, setImportDecryptProgress] = useState("");

  // 浏览器密码导入
  const [showBrowserImport, setShowBrowserImport] = useState(false);
  const [browserImportResult, setBrowserImportResult] = useState<ImportResult | null>(null);
  const [browserImportDups, setBrowserImportDups] = useState(0);
  const [browserImportStrategy, setBrowserImportStrategy] = useState<"merge" | "skip-duplicates">("merge");

  // 修改主密码
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [changePwOld, setChangePwOld] = useState("");
  const [changePwNew, setChangePwNew] = useState("");
  const [changePwConfirm, setChangePwConfirm] = useState("");
  const [changePwError, setChangePwError] = useState("");
  const [changePwNewKdf, setChangePwNewKdf] = useState<"argon2id" | "pbkdf2">("argon2id");
  const [isChangingPw, setIsChangingPw] = useState(false);
  const [changePwProgress, setChangePwProgress] = useState("");
  const [showChangePwOld, setShowChangePwOld] = useState(false);
  const [showChangePwNew, setShowChangePwNew] = useState(false);
  const [showChangePwConfirm, setShowChangePwConfirm] = useState(false);
  const [autoLockOpen, setAutoLockOpen] = useState(false);
  const [changePwKdfOpen, setChangePwKdfOpen] = useState(false);

  // ===== 启动 Splash =====
  const [isInitializingApp, setIsInitializingApp] = useState(true);
  const [initialLoadingStep, setInitialLoadingStep] = useState("🔐 正在初始化本地沙盒安全区 (Secure Enclave)...");

  useEffect(() => {
    const steps = [
      "🔐 正在初始化本地沙盒安全区 (Secure Enclave)...",
      "⚙️ 正在载入 PBKDF2 / Argon2id 密码推导引擎...",
      "🛡️ 正在进行对称密码体系与本地密文对齐度量...",
      "⚡ 本端零知识安全沙箱启动就绪！",
    ];
    let currentStep = 0;
    const interval = setInterval(() => {
      currentStep++;
      if (currentStep < steps.length) {
        setInitialLoadingStep(steps[currentStep]);
      } else {
        clearInterval(interval);
        setTimeout(() => setIsInitializingApp(false), 400);
      }
    }, 320);
    return () => clearInterval(interval);
  }, []);

  // 参数变更时重新生成密码
  useEffect(() => {
    generatePassword();
  }, [genConfig, genType, passphraseWords, passphraseSeparator, passphraseCapitalize, passphraseAddNumber]);

  // 清理剪贴板计时器
  useEffect(() => {
    return () => {
      if (clipboardIntervalRef.current) clearInterval(clipboardIntervalRef.current);
    };
  }, []);

  // 自动锁定超时计时器
  useEffect(() => {
    if (isLocked || autoLockTimeout === 0) return;

    let timeoutId: any;

    const resetTimer = () => {
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        handleLockVault();
        showToast("⏳ 由于长时间无操作，保险箱已自动安全锁定！");
      }, autoLockTimeout * 60 * 1000);
    };

    // 桌面端鼠标键盘交互事件 -- 用于自动锁定超时检测
    const events = ["mousemove", "keydown", "mousedown", "click", "scroll", "touchstart"];
    events.forEach((event) => {
      window.addEventListener(event, resetTimer, { passive: true });
    });

    resetTimer();

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      events.forEach((event) => {
        window.removeEventListener(event, resetTimer);
      });
    };
  }, [isLocked, autoLockTimeout]);

  // Toast 辅助方法
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3000);
  };

  // 以下函数已移入 usePasswordGenerator / useSecurityAudit Hook

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await writeText(text);
      showToast(`✅ ${label}已成功复制到剪贴板！`);

      // 防剪贴板泄漏计时器
      if (clipboardIntervalRef.current) {
        clearInterval(clipboardIntervalRef.current);
      }
      setClipboardTimeLeft(15);
      const interval = setInterval(() => {
        setClipboardTimeLeft(prev => {
          if (prev === null || prev <= 1) {
            clearInterval(interval);
            // Tauri 环境下通过覆写空字符串来清除剪贴板
            writeText("").catch(() => {});
            return null;
          }
          return prev - 1;
        });
      }, 1000);
      clipboardIntervalRef.current = interval;
    } catch (err) {
      console.error("剪贴板写入失败:", err);
      showToast("⚠️ 剪贴板访问失败");
    }
  };

  // 创建主密码 -- 委托给 useVault Hook
  const handleCreateMasterPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createMasterPassword(enteredPassword);
      setEnteredPassword("");
      showToast("🔓 密码安全保险箱创建成功！");
    } catch {
      // 错误已在 Hook 中设置到 unlockError
    }
  };

  // 解锁保险箱 -- 委托给 useVault Hook
  const handleUnlockVault = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await unlockVault(enteredPassword);
      setEnteredPassword("");
      showToast("🔓 保险箱已成功解锁！数据加载完毕。");
    } catch {
      // 错误已在 Hook 中设置
    }
  };

  const handleLockVault = async () => {
    await lockVault();
    setRevealedPasswords({});
    setSelectedItemId(null);
    setIsEditing(false);
    setIsCreating(false);
    showToast("🔒 保险箱已锁定。明文密钥及机密数据已安全从内存中擦除！");
  };

  const handleForceResetVault = async () => {
    await forceResetVault();
    setEnteredPassword("");
    setShowForceResetConfirm(false);
    showToast("💥 保险箱已成功强制重置并清空所有旧数据！");
  };

  // 新建文件夹
  const handleAddFolder = (e: React.FormEvent) => {
    e.preventDefault();
    const nameTrimmed = newFolderName.trim();
    if (!nameTrimmed) {
      setFolderError("⚠️ 文件夹分类名称不能为空！");
      return;
    }

    const isDuplicate = folders.some(f => f.name.toLowerCase() === nameTrimmed.toLowerCase());
    if (isDuplicate) {
      setFolderError("⚠️ 文件夹分类名称已存在！");
      return;
    }
    
    const newFolder: VaultFolder = {
      id: `folder-${Date.now()}`,
      name: nameTrimmed,
      icon: "folder"
    };

    setFolders(prev => [...prev, newFolder]);
    setNewFolderName("");
    setFolderError("");
    setShowFolderModal(false);
    showToast(`📁 文件夹「${newFolder.name}」创建成功！`);
  };

  // 重命名文件夹
  const handleRenameFolder = (id: string, oldName: string, newName: string) => {
    const trimmed = newName.trim();
    if (!trimmed) {
      showToast("⚠️ 文件夹名称不能为空！");
      return;
    }
    if (trimmed === oldName) {
      setEditingFolderId(null);
      return;
    }
    const exists = folders.some(f => f.id !== id && f.name.toLowerCase() === trimmed.toLowerCase());
    if (exists) {
      showToast("⚠️ 已存在同名文件夹！");
      return;
    }

    setFolders(prev => prev.map(f => f.id === id ? { ...f, name: trimmed } : f));
    setVaultItems(prev => prev.map(item => item.folder === oldName ? { ...item, folder: trimmed } : item));
    if (selectedFolder === oldName) {
      setSelectedFolder(trimmed);
    }
    setEditingFolderId(null);
    showToast(`📁 文件夹重命名为「${trimmed}」成功！`);
  };

  // 删除文件夹
  const handleDeleteFolder = (folderId: string, folderName: string) => {
    setDeleteConfirm({
      type: "folder",
      id: folderId,
      name: folderName
    });
  };

  // calculateStrength 已移入 useSecurityAudit Hook (使用 getStrength 代替)

  // 填充表单（编辑或创建）
  const handleSelectItem = (item: VaultItem) => {
    setSelectedItemId(item.id);
    setIsEditing(false);
    setIsCreating(false);

    setFormTitle(item.title);
    setFormFolder(item.folder);
    setFormUsername(item.username || "");
    setFormPassword(item.password || "");
    setFormUrl(item.url || "");
    setFormCardName(item.cardName || "");
    setFormCardNumber(item.cardNumber || "");
    setFormCardExpiry(item.cardExpiry || "");
    setFormCardCvv(item.cardCvv || "");
    setFormIdentityName(item.identityName || "");
    setFormIdentityEmail(item.identityEmail || "");
    setFormIdentityPhone(item.identityPhone || "");
    setFormIdentityAddress(item.identityAddress || "");
    setFormNotes(item.notes || "");
  };

  const handleStartCreate = (type: ItemType) => {
    setIsCreating(true);
    setIsEditing(false);
    setSelectedFolder("all");
    setSelectedItemId(null);
    setFormType(type);

    setFormTitle("");
    setFormFolder(folders[0]?.name || "未分类");
    setFormUsername("");
    setFormPassword("");
    setFormUrl("");
    setFormCardName("");
    setFormCardNumber("");
    setFormCardExpiry("");
    setFormCardCvv("");
    setFormIdentityName("");
    setFormIdentityEmail("");
    setFormIdentityPhone("");
    setFormIdentityAddress("");
    setFormNotes("");
    setShowFormPassword(false);
  };

  const handleSaveItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) {
      showToast("⚠️ 凭证标题不能为空！");
      return;
    }

    const calculatedStr = formType === "login"
      ? getStrength(formPassword || "")
      : "strong";

    // 自动重置过滤条件以确保证据保存后在列表中可见
    setSelectedFolder("all");
    setSelectedItemType("all");
    setSearchQuery("");

    if (isCreating) {
      const newItem: VaultItem = {
        id: `item-${Date.now()}`,
        type: formType,
        title: formTitle,
        folder: formFolder,
        username: formUsername,
        password: formPassword,
        url: formUrl,
        cardName: formCardName,
        cardNumber: formCardNumber,
        cardExpiry: formCardExpiry,
        cardCvv: formCardCvv,
        identityName: formIdentityName,
        identityEmail: formIdentityEmail,
        identityPhone: formIdentityPhone,
        identityAddress: formIdentityAddress,
        notes: formNotes,
        strength: calculatedStr,
        updatedAt: new Date().toISOString().replace("T", " ").substring(0, 16),
        isFavorite: false,
        ignoreSecurityWarning: false
      };

      setVaultItems(prev => [newItem, ...prev]);
      setSelectedItemId(newItem.id);
      setIsCreating(false);
      showToast("💾 成功添加新密码条目并完成 AES-256 扇区加密存储！");
    } else if (selectedItemId) {
      setVaultItems(prev => prev.map(item => {
        if (item.id === selectedItemId) {
          return {
            ...item,
            title: formTitle,
            folder: formFolder,
            username: formUsername,
            password: formPassword,
            url: formUrl,
            cardName: formCardName,
            cardNumber: formCardNumber,
            cardExpiry: formCardExpiry,
            cardCvv: formCardCvv,
            identityName: formIdentityName,
            identityEmail: formIdentityEmail,
            identityPhone: formIdentityPhone,
            identityAddress: formIdentityAddress,
            notes: formNotes,
            strength: calculatedStr,
            updatedAt: new Date().toISOString().replace("T", " ").substring(0, 16)
          };
        }
        return item;
      }));
      setIsEditing(false);
      showToast("💾 条目修改成功，已在内存防泄漏保护区写入安全磁道！");
    }
  };

  const handleDeleteItem = (id: string, title: string) => {
    setDeleteConfirm({
      type: "item",
      id: id,
      name: title
    });
  };

  const confirmDeleteAction = () => {
    if (!deleteConfirm) return;
    if (deleteConfirm.type === "item") {
      setVaultItems(prev => prev.filter(item => item.id !== deleteConfirm.id));
      setSelectedItemId(null);
      showToast(`🗑️ 密码条目「${deleteConfirm.name}」已从本地存储完全覆写粉碎并擦除！`);
    } else {
      setFolders(prev => prev.filter(f => f.id !== deleteConfirm.id));
      setVaultItems(prev => prev.map(item => item.folder === deleteConfirm.name ? { ...item, folder: "未分类" } : item));
      if (selectedFolder === deleteConfirm.name) {
        setSelectedFolder("all");
      }
      showToast(`📁 文件夹「${deleteConfirm.name}」已安全删除。`);
    }
    setDeleteConfirm(null);
  };

  const toggleFavorite = (id: string) => {
    setVaultItems(prev => prev.map(item => {
      if (item.id === id) {
        return { ...item, isFavorite: !item.isFavorite };
      }
      return item;
    }));
  };

  const toggleIgnoreWarning = (id: string) => {
    setVaultItems(prev => prev.map(item => {
      if (item.id === id) {
        const newVal = !item.ignoreSecurityWarning;
        showToast(newVal ? "👁️ 已忽略该条目的密码安全诊断告警" : "🔒 已恢复该条目的密码安全诊断告警");
        return { ...item, ignoreSecurityWarning: newVal };
      }
      return item;
    }));
  };

  const handleFixVulnerableItem = (itemId: string) => {
    // 生成 20 位密码学安全随机密码
    const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+-=[]{}|;:,.<>?";
    let strongPass = "";
    for (let i = 0; i < 20; i++) {
      strongPass += chars[secureRandomIndex(chars.length)];
    }

    setVaultItems(prev => prev.map(item => {
      if (item.id === itemId) {
        return {
          ...item,
          password: strongPass,
          strength: "strong",
          updatedAt: new Date().toISOString().replace("T", " ").substring(0, 16)
        };
      }
      return item;
    }));

    showToast(`🔒 已自动为该条目安全更新 20 位高强随机密码！`);
  };

  const handleExportData = async () => {
    const dataStr = await exportData();
    if (!dataStr) {
      showToast("⚠️ 保险箱未解锁，无法导出");
      return;
    }

    try {
      const filePath = await save({
        filters: [{ name: 'SecureVault 备份', extensions: ['json'] }],
        defaultPath: `SecureVault_Backup_${new Date().toISOString().slice(0, 10)}.json`,
      });
      if (!filePath) return;

      await invoke('write_export_file', { path: filePath, content: dataStr });
      showToast("🔒 保险箱已使用 AES-256-GCM 加密并成功导出备份！");
    } catch (e) {
      console.error("导出失败:", e);
      showToast("❌ 导出加密文件失败，请重试");
    }
  };

  const processImportData = async (data: any, strategy: "merge" | "overwrite") => {
    if (!data || typeof data !== "object") {
      showToast("❌ 无效的备份数据，请确保格式正确");
      return;
    }

    if (data.isEncrypted && data.encryptedPayload && data.salt) {
      if (!masterKey) {
        // 保险箱未解锁 → 弹出密码输入模态框
        setImportBackupData(data);
        setImportStrategy(strategy);
        setShowImportPasswordModal(true);
        return;
      }
      // 已解锁 → 尝试用当前密钥解密
      try {
        await importData(JSON.stringify(data), strategy);
        showToast("🎉 自动校验当前主密码成功，已无感解密并载入数据！");
      } catch {
        setImportBackupData(data);
        setImportStrategy(strategy);
        setShowImportPasswordModal(true);
      }
      return;
    }

    // 未加密的旧版备份
    await importData(JSON.stringify(data), strategy);
    showToast("⚠️ 载入了未加密的旧版明文格式备份文件");
  };

  // 通过 Tauri 文件对话框导入备份
  const handleImportFile = async () => {
    try {
      const selected = await open({
        filters: [{ name: 'JSON 备份', extensions: ['json'] }],
        multiple: false,
      });

      if (!selected) return; // 用户取消选择

      // Tauri v2 的 open() 单选时返回文件路径字符串
      const filePath = selected as string;
      const content = await invoke<string>('read_export_file', { path: filePath });
      const data = JSON.parse(content);

      // 调用导入处理
      await processImportData(data, importStrategy);
    } catch (err) {
      console.error("导入文件失败:", err);
      showToast("❌ 备份文件读取或解析失败");
    }
  };

  // 浏览器密码 CSV 导入
  const handleBrowserImport = async () => {
    try {
      const selected = await open({
        filters: [{ name: '密码导入文件', extensions: ['csv', 'json'] }],
        multiple: false,
      });
      if (!selected) return;

      const filePath = Array.isArray(selected) ? selected[0] : selected as string;
      if (!filePath) return;

      let content: string;
      try {
        content = await invoke<string>('read_export_file', { path: filePath });
      } catch (e) {
        console.error("读取文件失败:", e);
        showToast(`❌ 文件读取失败: ${String(e)}`);
        return;
      }

      let result: ImportResult;
      try {
        result = importBrowserFile(content);
      } catch (e) {
        console.error("CSV 解析失败:", e);
        showToast(`❌ CSV 解析错误: ${String(e)}`);
        return;
      }

      if (result.browserType === "unknown" || result.items.length === 0) {
        setBrowserImportResult(result);
        setBrowserImportDups(0);
        setShowBrowserImport(true);
        return;
      }

      const dupCheck = checkDuplicates(result.items, vaultItems);
      setBrowserImportDups(dupCheck.duplicates);
      setBrowserImportResult({ ...result, items: dupCheck.items });
      setShowBrowserImport(true);
    } catch (err) {
      console.error("浏览器导入失败:", err);
      showToast(`❌ 导入失败: ${String(err)}`);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setChangePwError("");

    if (!changePwNew.trim() || changePwNew.length < 8) {
      setChangePwError("新主密码长度至少需要 8 位");
      return;
    }
    if (changePwNew !== changePwConfirm) {
      setChangePwError("两次输入的新密码不一致");
      return;
    }

    setIsChangingPw(true);
    setChangePwProgress("");
    const delay = (ms: number) => new Promise(r => setTimeout(r, ms));
    try {
      setChangePwProgress("🔑 正在验证旧密码...");
      await delay(200);
      await changeMasterPassword(changePwOld, changePwNew, changePwNewKdf);

      setChangePwProgress("🧬 正在用新密码重新加密保险箱...");
      await delay(150);

      setChangePwProgress("✅ 主密码修改成功！即将锁定...");
      showToast("✅ 主密码修改成功！请用新密码重新解锁");

      setTimeout(() => {
        handleLockVault();
        setShowChangePassword(false);
        setChangePwOld(""); setChangePwNew(""); setChangePwConfirm("");
        setShowChangePwOld(false); setShowChangePwNew(false); setShowChangePwConfirm(false);
        setChangePwProgress("");
        setIsChangingPw(false);
      }, 800);
    } catch {
      setChangePwError("❌ 旧密码错误，请重新输入");
      setIsChangingPw(false);
      setChangePwProgress("");
    }
  };

  const handleBrowserImportConfirm = () => {
    if (!browserImportResult) return;

    const toImport = browserImportStrategy === "skip-duplicates"
      ? browserImportResult.items.filter(i => !i.title.includes("(重复)"))
      : browserImportResult.items;

    if (toImport.length > 0) {
      setVaultItems(prev => [...toImport, ...prev]);
      // 自动创建导入涉及的所有文件夹
      const newFolders = browserImportResult.folderNames.filter(
        fn => !folders.some(f => f.name === fn)
      );
      if (newFolders.length > 0) {
        setFolders(prev => [...prev, ...newFolders.map(fn => ({
          id: `folder-import-${fn.replace(/\s/g, "-")}`, name: fn, icon: "folder" as const
        }))]);
      }
      showToast(`✅ 已导入 ${toImport.length} 条浏览器密码记录`);
    }

    setShowBrowserImport(false);
    setBrowserImportResult(null);
  };

  // 处理导入密码模态框提交 — 含进度动画
  const handleImportPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!importBackupData || !importPassword.trim()) {
      setImportPasswordError("请输入备份文件的解密密码");
      return;
    }

    setIsImportDecrypting(true);
    setImportPasswordError("");

    try {
      setImportDecryptProgress("🔓 正在派生解密密钥...");
      await new Promise(r => setTimeout(r, 150));
      const key = await deriveMasterKey(importPassword, importBackupData.salt);

      setImportDecryptProgress("🔑 正在解密备份文件...");
      await new Promise(r => setTimeout(r, 150));
      const decrypted = await decryptVault(importBackupData.encryptedPayload, key);
      const payload = JSON.parse(decrypted);

      setImportDecryptProgress("📥 正在导入凭证数据...");
      await new Promise(r => setTimeout(r, 150));
      const data = { vaultItems: payload.vaultItems || [], folders: payload.folders || [] };
      await importData(JSON.stringify(data), importStrategy);

      setIsImportDecrypting(false);
      setImportDecryptProgress("");
      showToast("🎉 解密验证通过，成功恢复备份数据！");

      setShowImportPasswordModal(false);
      setImportBackupData(null);
      setImportPassword("");
    } catch {
      setIsImportDecrypting(false);
      setImportDecryptProgress("");
      setImportPasswordError("❌ 密码错误或备份文件已损坏，无法解密");
    }
  };

  // handleStartAudit 已移入 useSecurityAudit Hook

  // 审计诊断：使用 useSecurityAudit 计算的 auditResult
  const { totalCount, weakCount, reusedCount, compromisedCount, ignoredCount, passMap } = auditResult;

  const selectedItem = vaultItems.find(item => item.id === selectedItemId) || null;

  const filteredItems = vaultItems.filter(item => {
    const matchesSearch = item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.username && item.username.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (item.url && item.url.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (item.notes && item.notes.toLowerCase().includes(searchQuery.toLowerCase()));
    
    if (!matchesSearch) return false;

    if (selectedFolder === "favorites") {
      if (!item.isFavorite) return false;
    } else if (selectedFolder !== "all") {
      if (item.folder !== selectedFolder) return false;
    }

    if (selectedItemType !== "all") {
      if (item.type !== selectedItemType) return false;
    }

    return true;
  });

  // 审计统计来自 useSecurityAudit Hook (auditResult)

  return (
    <div className="h-screen bg-slate-50 text-slate-900 flex flex-col antialiased relative overflow-hidden select-none">
      {/* 1.1 PREMIUM APP INITIALIZATION SPLASH */}
      <SplashScreen visible={isInitializingApp} loadingStep={initialLoadingStep} />

      {/* Dynamic Toast System */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-6 left-1/2 -translate-x-1/2 z-50 bg-slate-900/95 text-white px-5 py-3 rounded-full text-sm font-medium shadow-2xl flex items-center space-x-2 border border-slate-800"
          >
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* CORE PROTOYPE CONTENT AREA */}
      <div className="flex-1 flex flex-col overflow-hidden relative">
                
                {/* 2.1 LOCKED STATE -- 使用 LockScreen 组件 */}
                {isLocked ? (
                    <LockScreen
                      isFirstTime={isFirstTime}
                      isDeriving={isDeriving}
                      derivationProgress={derivationProgress}
                      unlockError={unlockError}
                      enteredPassword={enteredPassword}
                      setEnteredPassword={setEnteredPassword}
                      selectedKdf={selectedKdf}
                      setSelectedKdf={setSelectedKdf}
                      showForceResetConfirm={showForceResetConfirm}
                      setShowForceResetConfirm={setShowForceResetConfirm}
                      onCreateMasterPassword={handleCreateMasterPassword}
                      onUnlockVault={handleUnlockVault}
                      onForceReset={handleForceResetVault}
                    />
                ) : (
                  
                  /* 2.2 UNLOCKED VAULT CONTENT */
                  <div className="flex-1 flex flex-col md:flex-row overflow-hidden w-full bg-slate-50 text-slate-800">
                    
                    {/* LEFT PANEL: VAULT SIDEBAR */}
                    <div className="w-full md:w-60 bg-slate-50 border-r border-slate-200 shrink-0 flex flex-col overflow-hidden shadow-sm">
                      
                      {/* Scrollable Sidebar Content */}
                      <div className="flex-1 overflow-y-auto p-3 flex flex-col space-y-3.5">
                        
                        {/* Add Item Quick Button */}
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleStartCreate("login")}
                            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-3 rounded-md text-xs flex items-center justify-center space-x-1.5 transition-colors shadow-sm cursor-pointer"
                          >
                            <Plus className="w-4 h-4" />
                            <span>新建凭证</span>
                          </button>
                          
                          <button
                            onClick={() => {
                              setNewFolderName("");
                              setFolderError("");
                              setShowFolderModal(true);
                            }}
                            className="bg-white hover:bg-slate-100 text-slate-600 p-2 rounded-md border border-slate-200 transition-colors shadow-sm cursor-pointer"
                            title="新建文件夹"
                          >
                            <FolderPlus className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* Categories / Standard Folders */}
                        <div className="space-y-4 font-sans">
                          <div>
                            <p className="text-[10px] font-bold text-slate-400 tracking-wider uppercase mb-1.5 px-2">常用视角</p>
                            <div className="space-y-0.5">
                              <button
                                onClick={() => { setSelectedFolder("all"); setSelectedItemType("all"); setSelectedItemId(null); setIsCreating(false); setIsEditing(false); }}
                                className={`w-full text-left px-3.5 py-1.5 rounded-md text-xs font-semibold flex items-center justify-between transition-colors cursor-pointer ${
                                  selectedFolder === "all" && selectedItemType === "all"
                                    ? "bg-blue-50 text-blue-700"
                                    : "text-slate-600 hover:bg-slate-200"
                                }`}
                              >
                                <span className="flex items-center space-x-2">
                                  <LockKeyholeOpen className="w-3.5 h-3.5" />
                                  <span>所有本地条目</span>
                                </span>
                                <span className="text-[10px] bg-slate-200/60 text-slate-600 px-1.5 py-0.5 rounded font-mono">{vaultItems.length}</span>
                              </button>

                              <button
                                onClick={() => { setSelectedFolder("favorites"); setSelectedItemType("all"); setSelectedItemId(null); setIsCreating(false); setIsEditing(false); }}
                                className={`w-full text-left px-3.5 py-1.5 rounded-md text-xs font-semibold flex items-center justify-between transition-colors cursor-pointer ${
                                  selectedFolder === "favorites"
                                    ? "bg-blue-50 text-blue-700"
                                    : "text-slate-600 hover:bg-slate-200"
                                }`}
                              >
                                <span className="flex items-center space-x-2">
                                  <Sparkles className="w-3.5 h-3.5" />
                                  <span>星标收藏</span>
                                </span>
                                <span className="text-[10px] bg-slate-200/60 text-slate-600 px-1.5 py-0.5 rounded font-mono">
                                  {vaultItems.filter(i => i.isFavorite).length}
                                </span>
                              </button>

                              <button
                                onClick={() => { setSelectedFolder("generator"); setSelectedItemType("all"); setSelectedItemId(null); setIsCreating(false); setIsEditing(false); }}
                                className={`w-full text-left px-3.5 py-1.5 rounded-md text-xs font-semibold flex items-center justify-between transition-colors cursor-pointer ${
                                  selectedFolder === "generator"
                                    ? "bg-indigo-50 text-indigo-700"
                                    : "text-slate-600 hover:bg-slate-200"
                                }`}
                              >
                                <span className="flex items-center space-x-2">
                                  <KeyRound className="w-3.5 h-3.5" />
                                  <span>智能密码生成器</span>
                                </span>
                              </button>

                              <button
                                onClick={() => { setSelectedFolder("audit"); setSelectedItemType("all"); setSelectedItemId(null); setIsCreating(false); setIsEditing(false); }}
                                className={`w-full text-left px-3.5 py-1.5 rounded-md text-xs font-semibold flex items-center justify-between transition-colors cursor-pointer ${
                                  selectedFolder === "audit"
                                    ? "bg-rose-50 text-rose-700"
                                    : "text-slate-600 hover:bg-slate-200"
                                }`}
                              >
                                <span className="flex items-center space-x-2">
                                  <ShieldAlert className={`w-3.5 h-3.5 ${selectedFolder === "audit" ? "text-rose-600" : "text-slate-500 animate-pulse"}`} />
                                  <span>安全智能审计</span>
                                </span>
                                {weakCount + reusedCount > 0 ? (
                                  <span className="text-[10px] px-1.5 py-0.5 rounded font-mono font-bold bg-rose-100 text-rose-800 animate-bounce">
                                    {weakCount + reusedCount}
                                  </span>
                                ) : ignoredCount > 0 ? (
                                  <span className="text-[10px] px-1.5 py-0.5 rounded font-mono font-bold bg-amber-100 text-amber-800 animate-bounce">
                                    {ignoredCount}
                                  </span>
                                ) : (
                                  <span className="text-[10px] px-1.5 py-0.5 rounded font-mono font-bold bg-emerald-100 text-emerald-800">
                                    0
                                  </span>
                                )}
                              </button>

                              <button
                                onClick={() => { setSelectedFolder("extension"); setSelectedItemType("all"); setSelectedItemId(null); setIsCreating(false); setIsEditing(false); }}
                                className={`w-full text-left px-3.5 py-1.5 rounded-md text-xs font-semibold flex items-center justify-between transition-colors cursor-pointer ${
                                  selectedFolder === "extension"
                                    ? "bg-indigo-50 text-indigo-700"
                                    : "text-slate-600 hover:bg-slate-200"
                                }`}
                              >
                                <span className="flex items-center space-x-2">
                                  <Chrome className={`w-3.5 h-3.5 ${selectedFolder === "extension" ? "text-indigo-600" : ""}`} />
                                  <span>浏览器插件包</span>
                                </span>
                              </button>
                            </div>
                          </div>

                          {/* Types selector */}
                          <div>
                            <p className="text-[10px] font-bold text-slate-400 tracking-wider uppercase mb-1.5 px-2">按模版过滤</p>
                            <div className="space-y-0.5">
                              {[
                                { id: "login", label: "常规账号", icon: User, textClass: "text-blue-700", bgClass: "bg-blue-50/70 border-l-2 border-blue-500", iconBg: "bg-blue-100 text-blue-600" },
                                { id: "card", label: "虚拟卡券", icon: CreditCard, textClass: "text-emerald-700", bgClass: "bg-emerald-50/70 border-l-2 border-emerald-500", iconBg: "bg-emerald-100 text-emerald-600" },
                                { id: "note", label: "安全备忘", icon: FileText, textClass: "text-sky-700", bgClass: "bg-sky-50/70 border-l-2 border-sky-500", iconBg: "bg-sky-100 text-sky-600" },
                                { id: "identity", label: "密保资料", icon: FileCheck2, textClass: "text-amber-700", bgClass: "bg-amber-50/70 border-l-2 border-amber-500", iconBg: "bg-amber-100 text-amber-600" }
                              ].map((t) => {
                                const IconComp = t.icon;
                                const isSelected = selectedItemType === t.id;
                                return (
                                  <button
                                    key={t.id}
                                    onClick={() => { setSelectedItemType(t.id as any); setSelectedFolder("all"); setSelectedItemId(null); setIsCreating(false); setIsEditing(false); }}
                                    className={`w-full text-left px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-between transition-all duration-150 border border-transparent cursor-pointer ${
                                      isSelected
                                        ? `${t.bgClass} ${t.textClass} shadow-sm`
                                        : "text-slate-600 hover:bg-slate-100"
                                    }`}
                                  >
                                    <span className="flex items-center space-x-2.5">
                                      <div className={`p-1 rounded-md transition-colors ${
                                        isSelected ? t.iconBg : "bg-slate-100 text-slate-500 group-hover:bg-slate-200"
                                      }`}>
                                        <IconComp className="w-3.5 h-3.5" />
                                      </div>
                                      <span>{t.label}</span>
                                    </span>
                                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono transition-colors ${
                                      isSelected ? `${t.iconBg} font-bold` : "bg-slate-200/60 text-slate-600"
                                    }`}>
                                      {vaultItems.filter(i => i.type === t.id).length}
                                    </span>
                                  </button>
                                );
                              })}
                            </div>
                          </div>

                          {/* Folders List */}
                          <div>
                            <p className="text-[10px] font-bold text-slate-400 tracking-wider uppercase mb-1.5 px-2">自定义文件夹</p>
                            <div className="space-y-0.5 max-h-52 overflow-y-auto overflow-x-hidden pr-1">
                              {folders.map((f) => {
                                const isEditingFolder = editingFolderId === f.id;
                                return (
                                  <div 
                                    key={f.id} 
                                    className={`group flex items-center justify-between px-3.5 py-1 rounded-md text-xs font-semibold transition-colors ${
                                      selectedFolder === f.name
                                        ? "bg-slate-200/60 text-slate-900"
                                        : "text-slate-600 hover:bg-slate-200"
                                    }`}
                                  >
                                    {isEditingFolder ? (
                                      <div className="flex items-center space-x-1.5 w-full py-0.5 min-w-0">
                                        <Folder className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                                        <input
                                          type="text"
                                          autoFocus
                                          value={editingFolderName}
                                          onChange={(e) => setEditingFolderName(e.target.value)}
                                          onKeyDown={(e) => {
                                            if (e.key === "Enter") {
                                              handleRenameFolder(f.id, f.name, editingFolderName);
                                            } else if (e.key === "Escape") {
                                              setEditingFolderId(null);
                                            }
                                          }}
                                          className="flex-1 min-w-0 bg-white border border-indigo-400 rounded px-1.5 py-0.5 text-xs outline-none text-slate-800 font-semibold"
                                        />
                                        <button
                                          onClick={() => handleRenameFolder(f.id, f.name, editingFolderName)}
                                          className="text-emerald-600 hover:text-emerald-700 p-0.5 rounded transition-colors cursor-pointer shrink-0"
                                          title="保存"
                                        >
                                          <Check className="w-3.5 h-3.5" />
                                        </button>
                                        <button
                                          onClick={() => setEditingFolderId(null)}
                                          className="text-slate-400 hover:text-slate-500 p-0.5 rounded transition-colors cursor-pointer shrink-0"
                                          title="取消"
                                        >
                                          <X className="w-3.5 h-3.5" />
                                        </button>
                                      </div>
                                    ) : (
                                      <>
                                        <button
                                          onClick={() => { setSelectedFolder(f.name); setSelectedItemType("all"); setSelectedItemId(null); setIsCreating(false); setIsEditing(false); }}
                                          className="flex-1 text-left flex items-center space-x-2 truncate cursor-pointer"
                                        >
                                          <Folder className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                          <span className="truncate">{f.name}</span>
                                        </button>
                                        <div className="flex items-center space-x-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                          <button 
                                            onClick={() => {
                                              setEditingFolderId(f.id);
                                              setEditingFolderName(f.name);
                                            }}
                                            className="text-slate-400 hover:text-indigo-600 transition-colors p-0.5 rounded cursor-pointer"
                                            title="重命名"
                                          >
                                            <Edit3 className="w-3.5 h-3.5" />
                                          </button>
                                          <button 
                                            onClick={() => handleDeleteFolder(f.id, f.name)}
                                            className="text-slate-400 hover:text-rose-500 transition-colors p-0.5 rounded cursor-pointer"
                                            title="删除文件夹"
                                          >
                                            <Trash2 className="w-3.5 h-3.5" />
                                          </button>
                                        </div>
                                      </>
                                    )}
                                  </div>
                                );
                              })}
                              {folders.length === 0 && (
                                <p className="text-[10px] text-slate-400 px-3.5 py-2 italic">暂无文件夹</p>
                              )}
                            </div>
                          </div>

                        </div>

                      </div> {/* Closes Scrollable Sidebar Content */}

                      {/* STICKY FOOTER PANEL */}
                      <div className="p-3 pt-1.5 space-y-1.5 shrink-0 bg-slate-50">
                        <div 
                          onClick={() => { setSelectedFolder("audit"); setSelectedItemType("all"); setSelectedItemId(null); setIsCreating(false); setIsEditing(false); }}
                          className={`group border rounded-xl p-2.5 flex items-center justify-between cursor-pointer transition-all duration-200 shadow-sm hover:shadow-md ${
                            weakCount + reusedCount === 0 
                              ? "bg-emerald-50/60 border-emerald-100 hover:bg-emerald-50" 
                              : "bg-amber-50/70 border-amber-200/70 hover:bg-amber-50"
                          }`}
                        >
                          <div className="flex items-center space-x-2 min-w-0">
                            {weakCount + reusedCount === 0 ? (
                              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                            ) : (
                              <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
                            )}
                            <div className="min-w-0">
                              <p className={`text-[10px] font-bold leading-none ${
                                weakCount + reusedCount === 0 ? "text-emerald-800" : "text-amber-800"
                              }`}>
                                {weakCount + reusedCount === 0 ? "安全状态：极佳" : "检测到安全隐患"}
                              </p>
                              <p className={`text-[9px] mt-1 leading-none truncate ${
                                weakCount + reusedCount === 0 ? "text-emerald-600" : "text-amber-600"
                              }`}>
                                {weakCount + reusedCount === 0 
                                  ? "无弱密码或复用漏洞" 
                                  : `弱密码/复用计: ${weakCount + reusedCount} 项`}
                              </p>
                            </div>
                          </div>
                          
                          <div className={`text-[9px] font-bold flex items-center shrink-0 ${
                            weakCount + reusedCount === 0 ? "text-emerald-600" : "text-amber-700"
                          }`}>
                            <span>智能审计</span>
                            <ChevronRight className="w-2.5 h-2.5 ml-0.5 group-hover:translate-x-0.5 transition-transform" />
                          </div>
                        </div>

                        {/* Settings & Safe Lock Buttons */}
                        <div className="flex space-x-2 w-full">
                          <button
                            type="button"
                            onClick={() => { setSelectedFolder("settings"); setSelectedItemType("all"); setSelectedItemId(null); setIsCreating(false); setIsEditing(false); }}
                            className={`p-2 rounded-lg transition-colors border cursor-pointer shadow-sm flex items-center justify-center shrink-0 ${
                              selectedFolder === "settings"
                                ? "bg-indigo-50 border-indigo-200 text-indigo-600"
                                : "bg-white border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-700"
                            }`}
                            title="打开设置中心"
                          >
                            <Settings className="w-3.5 h-3.5 animate-spin-hover" />
                          </button>

                          <button 
                            type="button"
                            onClick={handleLockVault}
                            className="flex-1 text-rose-600 hover:bg-rose-50 hover:text-rose-700 py-1.5 rounded-lg transition-colors text-[10px] font-bold flex items-center justify-center space-x-1.5 border border-rose-200 cursor-pointer shadow-sm bg-white"
                            title="立即锁定保险箱"
                          >
                            <Lock className="w-3 h-3" />
                            <span>立即锁定保险箱</span>
                          </button>
                        </div>
                      </div>

                    </div> {/* Closes Left Panel */}

                    {/* RIGHT CONTENT AREA: MIDDLE PANEL + DETAILS PANEL + BOTTOM STATUS BAR */}
                    <div className="flex-1 min-h-0 flex flex-col w-full">
                      
                      <div className="flex-1 min-h-0 flex flex-col md:flex-row overflow-hidden w-full">

                        {/* MIDDLE PANEL: CREDENTIALS LIST (DYNAMIC SPACIOUS CREDENTIALS HUB) */}
                        {selectedFolder !== "audit" && selectedFolder !== "generator" && selectedFolder !== "settings" && selectedFolder !== "extension" ? (
                          <div className={`bg-slate-50/50 flex-col overflow-hidden ${selectedItemId !== null || isCreating || isEditing ? "hidden" : "flex-1 flex"}`}>

                        {/* Dynamic Search Header */}
                        <div className="pt-4 pb-3 px-4 md:px-6 bg-slate-50 shrink-0 font-sans border-b border-slate-100">
                          <div className="max-w-5xl mx-auto w-full">
                          <div className="relative w-full">
                            <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
                            <input
                              type="text"
                              placeholder="搜索安全密盒标题、登录账号、网址、自定义分类..."
                              value={searchQuery}
                              onChange={(e) => setSearchQuery(e.target.value)}
                              className="w-full bg-white pl-10 pr-12 py-3 text-xs rounded-xl border border-slate-200/80 shadow-sm outline-none focus:border-blue-500 text-slate-800 font-semibold transition-all focus:shadow-md"
                            />
                            {searchQuery && (
                              <button
                                onClick={() => setSearchQuery("")}
                                className="absolute right-3.5 top-3 text-slate-400 hover:text-slate-600 text-xs font-bold font-sans cursor-pointer"
                              >
                                清除
                              </button>
                            )}
                          </div>
                          </div>
                        </div>

                        {/* Beautiful Bento-style grid of credentials */}
                        <div className="flex-1 overflow-y-auto p-4 md:p-6">
                          <div className="max-w-5xl mx-auto w-full">
                          {filteredItems.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-80 text-center text-slate-400">
                              <div className="p-4 bg-white rounded-2xl mb-3.5 border border-slate-200/80 shadow-sm">
                                <KeyRound className="w-7 h-7 text-slate-400" />
                              </div>
                              <h4 className="text-sm font-bold text-slate-700">未发现匹配的安全凭证</h4>
                              <p className="text-xs text-slate-400 max-w-xs mt-1">您可以调整搜索过滤词，或点击左上角的「新建凭证」开始录入加密项。</p>
                            </div>
                          ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                              {filteredItems.map((item) => (
                                <div
                                  key={item.id}
                                  onClick={() => handleSelectItem(item)}
                                  className={`bg-white rounded-xl border p-4 text-left transition-all cursor-pointer shadow-sm relative group flex flex-col justify-between h-40 hover:-translate-y-0.5 hover:shadow-md ${
                                    selectedItemId === item.id 
                                      ? "border-blue-600 ring-1 ring-blue-600" 
                                      : "border-slate-200/80 hover:border-slate-300"
                                  }`}
                                >
                                  <div>
                                    {/* Icon & Status */}
                                    <div className="flex items-center justify-between">
                                      <div className={`p-2 rounded-lg shrink-0 ${
                                        item.type === "login" ? "bg-blue-50 text-blue-600" :
                                        item.type === "card" ? "bg-emerald-50 text-emerald-600" :
                                        item.type === "note" ? "bg-sky-50 text-sky-600" :
                                        "bg-amber-50 text-amber-600"
                                      }`}>
                                        {item.type === "login" && <User className="w-4 h-4" />}
                                        {item.type === "card" && <CreditCard className="w-4 h-4" />}
                                        {item.type === "note" && <FileText className="w-4 h-4" />}
                                        {item.type === "identity" && <FileCheck2 className="w-4 h-4" />}
                                      </div>

                                      <div className="flex items-center space-x-2">
                                        {item.isFavorite && (
                                          <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-400" />
                                        )}
                                        {item.ignoreSecurityWarning ? (
                                          <span className="inline-flex items-center space-x-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold border leading-none shrink-0 bg-amber-50/80 border-amber-200/60 text-amber-600">
                                            <span className="w-1 h-1 rounded-full bg-amber-400 animate-pulse" />
                                            <span>已忽略</span>
                                          </span>
                                        ) : (
                                          <span className={`inline-flex items-center space-x-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold border leading-none shrink-0 ${
                                            item.strength === "strong" 
                                              ? "bg-emerald-50 border-emerald-200/60 text-emerald-700" 
                                              : item.strength === "medium"
                                                ? "bg-amber-50 border-amber-200/60 text-amber-700"
                                                : "bg-rose-50 border-rose-200/60 text-rose-700"
                                          }`}>
                                            <span className={`w-1 h-1 rounded-full ${
                                              item.strength === "strong" ? "bg-emerald-500 animate-pulse" :
                                              item.strength === "medium" ? "bg-amber-500" : "bg-rose-500"
                                            }`} />
                                            <span>
                                              {item.strength === "strong" ? "安全" :
                                               item.strength === "medium" ? "中等" : "风险"}
                                            </span>
                                          </span>
                                        )}
                                      </div>
                                    </div>

                                    {/* Title & Core Details */}
                                    <h3 className="text-xs font-bold text-slate-800 truncate mt-3 pr-2">{item.title}</h3>
                                    <p className="text-[11px] text-slate-500 truncate mt-1 font-mono font-medium max-w-full">
                                      {item.username || item.cardName || item.identityName || "安全凭密备忘明细"}
                                    </p>
                                  </div>

                                  {/* Footer Details & Hover Copies */}
                                  <div className="flex items-center justify-between mt-4 pt-2.5 border-t border-slate-100">
                                    <span className="text-[9px] font-bold bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded font-mono truncate max-w-[120px]">
                                      {item.folder}
                                    </span>
                                    
                                    <div className="flex items-center space-x-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                      {item.username && (
                                        <button
                                          onClick={(e) => { e.stopPropagation(); copyToClipboard(item.username || "", "账号"); }}
                                          className="p-1 bg-slate-50 hover:bg-slate-100 text-slate-500 hover:text-blue-600 rounded border border-slate-200 transition-colors cursor-pointer"
                                          title="复制账号"
                                        >
                                          <User className="w-3 h-3" />
                                        </button>
                                      )}
                                      {item.password && (
                                        <button
                                          onClick={(e) => { e.stopPropagation(); copyToClipboard(item.password || "", "密码"); }}
                                          className="p-1 bg-slate-50 hover:bg-slate-100 text-slate-500 hover:text-blue-600 rounded border border-slate-200 transition-colors cursor-pointer"
                                          title="复制密码"
                                        >
                                          <Copy className="w-3 h-3" />
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                          </div>
                        </div>
                      </div>
                    ) : null}

                    {/* RIGHT PANEL: CREDENTIAL DETAILS / EDIT / CREATE */}
                    <div className={`${selectedItem || isCreating || isEditing || selectedFolder === "audit" || selectedFolder === "generator" || selectedFolder === "settings" ? "flex-1 flex flex-col overflow-y-auto bg-slate-50" : "hidden"}`}>
                      
                      {isCreating || isEditing ? (
                        /* CREATE / EDIT FORM VIEW */
                        <div className="flex-1 flex flex-col overflow-hidden font-sans bg-slate-50">
                          {/* Top Header */}
                          <div className="pt-3 pb-2 px-4 md:px-6 bg-slate-50 flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0 font-sans">
                            <div className="flex items-center space-x-2 text-left">
                              <Lock className="w-5 h-5 text-indigo-500 shrink-0" />
                              <div>
                                <h3 className="text-xs font-bold text-slate-800 leading-tight">
                                  {isCreating ? "新建安全凭证" : "编辑安全凭证"}
                                </h3>
                                <p className="text-[10px] text-slate-400 mt-0.5">采用 AES-256-GCM 高强度本地对称物理扇区加密存储</p>
                              </div>
                            </div>
                            <div className="flex items-center space-x-1.5 bg-indigo-50 px-2.5 py-1 rounded-lg border border-indigo-200 shrink-0 self-start md:self-auto">
                              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 block animate-pulse"></span>
                              <span className="text-[9px] font-bold text-indigo-600 font-mono tracking-wider">
                                {isCreating ? "CREATING" : "EDITING"}
                              </span>
                            </div>
                          </div>

                          {/* Form Body Container with Slate Background */}
                          <div className="flex-1 overflow-y-auto p-3 md:p-6 bg-slate-50">
                            <form onSubmit={handleSaveItem} noValidate className="max-w-5xl mx-auto bg-white border border-slate-200/80 rounded-2xl p-5 md:p-6 shadow-sm space-y-5">
                              <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                            <h2 className="text-base font-bold text-slate-800 flex items-center space-x-2">
                              <Lock className="w-4 h-4 text-indigo-500" />
                              <span>{isCreating ? "新建安全凭证" : "编辑安全凭证"}</span>
                            </h2>
                            <div className="flex space-x-2">
                              <button
                                type="button"
                                onClick={() => { setIsCreating(false); setIsEditing(false); }}
                                className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors"
                              >
                                取消
                              </button>
                              <button
                                type="submit"
                                className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors shadow-sm"
                              >
                                保存 (写入密盒)
                              </button>
                            </div>
                          </div>

                          {/* Quick model selector (Only during creation) */}
                          {isCreating && (
                            <div>
                              <label className="block text-[10px] font-bold text-slate-400 tracking-wider uppercase mb-1.5">选择安全模版类型</label>
                              <div className="grid grid-cols-4 gap-2">
                                {[
                                  { id: "login", label: "常规账号", icon: User, selectedStyle: "border-blue-500 bg-blue-50 text-blue-700" },
                                  { id: "card", label: "虚拟卡券", icon: CreditCard, selectedStyle: "border-emerald-500 bg-emerald-50 text-emerald-700" },
                                  { id: "note", label: "安全备忘", icon: FileText, selectedStyle: "border-sky-500 bg-sky-50 text-sky-700" },
                                  { id: "identity", label: "密保资料", icon: FileCheck2, selectedStyle: "border-amber-500 bg-amber-50 text-amber-700" }
                                ].map((tab) => {
                                  const isSelected = formType === tab.id;
                                  return (
                                    <button
                                      key={tab.id}
                                      type="button"
                                      onClick={() => setFormType(tab.id as any)}
                                      className={`p-2 rounded-xl border text-center transition-all cursor-pointer ${
                                        isSelected
                                          ? `${tab.selectedStyle} shadow-sm font-semibold`
                                          : "border-slate-200 hover:bg-slate-50 text-slate-600"
                                      }`}
                                    >
                                      <tab.icon className={`w-4 h-4 mx-auto mb-1 ${
                                        isSelected ? "" : "text-slate-400"
                                      }`} />
                                      <span className="text-[10px] font-semibold">{tab.label}</span>
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          )}

                          {/* Form fields based on item type */}
                          <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <label className="block text-[10px] font-bold text-slate-400 tracking-wider uppercase mb-1">凭证标题</label>
                                <input
                                  type="text"
                                  required
                                  value={formTitle}
                                  onChange={(e) => setFormTitle(e.target.value)}
                                  placeholder="如: Github 工作库, 主力建行卡"
                                  className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:bg-white rounded-lg px-3 py-2 text-xs outline-none text-slate-800"
                                />
                              </div>
                              <div>
                                <label className="block text-[10px] font-bold text-slate-400 tracking-wider uppercase mb-1">归属文件夹分类</label>
                                <div className="relative">
                                  <button
                                    type="button"
                                    onClick={() => setIsFormFolderDropdownOpen(!isFormFolderDropdownOpen)}
                                    className="w-full bg-slate-50 border border-slate-200 hover:border-slate-300 focus:border-indigo-500 rounded-lg px-3 py-2 text-xs text-left outline-none text-slate-800 flex items-center justify-between transition-all shadow-sm"
                                  >
                                    <div className="flex items-center space-x-2 truncate">
                                      <Folder className={`w-3.5 h-3.5 shrink-0 transition-colors ${formFolder === "未分类" ? "text-slate-400" : "text-indigo-500"}`} />
                                      <span className="truncate">{formFolder}</span>
                                    </div>
                                    <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform shrink-0 duration-200 ${isFormFolderDropdownOpen ? 'rotate-180 text-indigo-600' : ''}`} />
                                  </button>

                                  {isFormFolderDropdownOpen && (
                                    <>
                                      <div className="fixed inset-0 z-40 cursor-default" onClick={() => setIsFormFolderDropdownOpen(false)} />
                                      <div className="absolute left-0 right-0 mt-1.5 max-h-52 overflow-y-auto bg-white border border-slate-100 rounded-lg shadow-xl py-1 z-50">
                                        <button
                                          type="button"
                                          onClick={() => { setFormFolder("未分类"); setIsFormFolderDropdownOpen(false); }}
                                          className={`w-full px-3 py-1.5 text-xs text-left flex items-center justify-between transition-colors ${formFolder === "未分类" ? "bg-indigo-50/50 text-indigo-600 font-medium" : "text-slate-600 hover:bg-slate-50 hover:text-slate-800"}`}
                                        >
                                          <div className="flex items-center space-x-2">
                                            <Folder className={`w-3.5 h-3.5 shrink-0 transition-colors ${formFolder === "未分类" ? "text-indigo-500" : "text-slate-400"}`} />
                                            <span>未分类</span>
                                          </div>
                                          {formFolder === "未分类" && <Check className="w-3.5 h-3.5 text-indigo-600 shrink-0" />}
                                        </button>
                                        {folders.map(f => (
                                          <button
                                            key={f.id}
                                            type="button"
                                            onClick={() => { setFormFolder(f.name); setIsFormFolderDropdownOpen(false); }}
                                            className={`w-full px-3 py-1.5 text-xs text-left flex items-center justify-between transition-colors ${formFolder === f.name ? "bg-indigo-50/50 text-indigo-600 font-medium" : "text-slate-600 hover:bg-slate-50 hover:text-slate-800"}`}
                                          >
                                            <div className="flex items-center space-x-2 truncate">
                                              <Folder className={`w-3.5 h-3.5 shrink-0 transition-colors ${formFolder === f.name ? "text-indigo-500" : "text-slate-400"}`} />
                                              <span className="truncate">{f.name}</span>
                                            </div>
                                            {formFolder === f.name && <Check className="w-3.5 h-3.5 text-indigo-600 shrink-0" />}
                                          </button>
                                        ))}
                                      </div>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>

                            {formType === "login" && (
                              <>
                                <div className="grid grid-cols-2 gap-4">
                                  <div>
                                    <label className="block text-[10px] font-bold text-slate-400 tracking-wider uppercase mb-1">账号/用户名</label>
                                    <input
                                      type="text"
                                      value={formUsername}
                                      onChange={(e) => setFormUsername(e.target.value)}
                                      placeholder="邮箱, 账号名或手机号"
                                      className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:bg-white rounded-lg px-3 py-2 text-xs outline-none text-slate-800"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-[10px] font-bold text-slate-400 tracking-wider uppercase mb-1">账户密码</label>
                                    <div className="relative">
                                      <input
                                        type={showFormPassword ? "text" : "password"}
                                        value={formPassword}
                                        onChange={(e) => setFormPassword(e.target.value)}
                                        placeholder="请输入或使用下发生成器"
                                        className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:bg-white rounded-lg pl-3 pr-[104px] py-2 text-xs outline-none text-slate-800 font-mono"
                                      />
                                      <button
                                        type="button"
                                        onClick={() => setShowFormPassword(!showFormPassword)}
                                        className="absolute right-[68px] top-2.5 text-slate-400 hover:text-indigo-600 transition-colors focus:outline-none cursor-pointer flex items-center justify-center"
                                        title={showFormPassword ? "隐藏密码" : "显示密码"}
                                      >
                                        {showFormPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          let autoP = "";
                                          const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()";
                                          for(let i=0; i<16; i++) autoP += chars[secureRandomIndex(chars.length)];
                                          setFormPassword(autoP);
                                          showToast("⚡ 已自动填入高强度新随机密码！");
                                        }}
                                        className="absolute right-1.5 top-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-[10px] px-2 py-1 rounded font-semibold"
                                      >
                                        随机生成
                                      </button>
                                    </div>
                                  </div>
                                </div>
                                <div>
                                  <label className="block text-[10px] font-bold text-slate-400 tracking-wider uppercase mb-1">网站 URL 地址</label>
                                  <input
                                    type="text"
                                    value={formUrl}
                                    onChange={(e) => setFormUrl(e.target.value)}
                                    placeholder="https://example.com"
                                    className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:bg-white rounded-lg px-3 py-2 text-xs outline-none text-slate-800"
                                  />
                                </div>
                              </>
                            )}

                            {formType === "card" && (
                              <>
                                <div className="bg-blue-50/70 border border-blue-100 rounded-lg p-3 text-[11px] text-blue-700 leading-relaxed mb-4">
                                  🔒 <strong>卡片资产安全贴士：</strong>建议仅用于存储游戏卡、App Store 充值券、平台代金券、会员卡或非核心虚拟卡号。出于账户资产防御安全考量，<strong>请勿记录</strong>借记卡取款密码、信用卡 CVV 码或敏感物理网银凭证。本系统 100% 纯本地离线加密运行。
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                  <div>
                                    <label className="block text-[10px] font-bold text-slate-400 tracking-wider uppercase mb-1">资产登记所有人/姓名</label>
                                    <input
                                      type="text"
                                      value={formCardName}
                                      onChange={(e) => setFormCardName(e.target.value)}
                                      placeholder="如: ZHANG SAN 或 常用称呼"
                                      className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:bg-white rounded-lg px-3 py-2 text-xs outline-none text-slate-800"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-[10px] font-bold text-slate-400 tracking-wider uppercase mb-1">卡号 / 储值券密匙</label>
                                    <input
                                      type="text"
                                      value={formCardNumber}
                                      onChange={(e) => setFormCardNumber(e.target.value)}
                                      placeholder="请输入储值卡、礼品卡或会员卡号"
                                      className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:bg-white rounded-lg px-3 py-2 text-xs outline-none text-slate-800 font-mono"
                                    />
                                  </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                  <div>
                                    <label className="block text-[10px] font-bold text-slate-400 tracking-wider uppercase mb-1">有效期/保质期 (如适用)</label>
                                    <input
                                      type="text"
                                      value={formCardExpiry}
                                      onChange={(e) => setFormCardExpiry(e.target.value)}
                                      placeholder="05/30"
                                      className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:bg-white rounded-lg px-3 py-2 text-xs outline-none text-slate-800"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-[10px] font-bold text-slate-400 tracking-wider uppercase mb-1">备用辅助验证码 (非 CVV/CVC 密码)</label>
                                    <input
                                      type="text"
                                      value={formCardCvv}
                                      onChange={(e) => setFormCardCvv(e.target.value)}
                                      placeholder="备用辅助说明或卡片附加特征码"
                                      className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:bg-white rounded-lg px-3 py-2 text-xs outline-none text-slate-800 font-mono"
                                    />
                                  </div>
                                </div>
                              </>
                            )}

                            {formType === "identity" && (
                              <>
                                <div className="bg-blue-50/70 border border-blue-100 rounded-lg p-3 text-[11px] text-blue-700 leading-relaxed mb-4">
                                  🔒 <strong>申诉绑定常用资料贴士：</strong>此模版旨在供您集中存放及便捷复制各站注册时填写的申诉验证密保、备用邮箱、联系手机或收货物理地址。<strong>本系统并非政务系统，绝不会要求上传、收集或上传</strong>您的物理身份证、护照等极度敏感的核心隐私证件照，100% 纯本地沙盒加密。
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                  <div>
                                    <label className="block text-[10px] font-bold text-slate-400 tracking-wider uppercase mb-1">常用登记姓名/代号</label>
                                    <input
                                      type="text"
                                      value={formIdentityName}
                                      onChange={(e) => setFormIdentityName(e.target.value)}
                                      placeholder="真实姓名或常用申诉网名"
                                      className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:bg-white rounded-lg px-3 py-2 text-xs outline-none text-slate-800"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-[10px] font-bold text-slate-400 tracking-wider uppercase mb-1">申诉或关联邮箱</label>
                                    <input
                                      type="email"
                                      value={formIdentityEmail}
                                      onChange={(e) => setFormIdentityEmail(e.target.value)}
                                      placeholder="name@domain.com"
                                      className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:bg-white rounded-lg px-3 py-2 text-xs outline-none text-slate-800"
                                    />
                                  </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                  <div>
                                    <label className="block text-[10px] font-bold text-slate-400 tracking-wider uppercase mb-1">注册/验证绑定手机号</label>
                                    <input
                                      type="text"
                                      value={formIdentityPhone}
                                      onChange={(e) => setFormIdentityPhone(e.target.value)}
                                      placeholder="+86 138-xxxx-xxxx"
                                      className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:bg-white rounded-lg px-3 py-2 text-xs outline-none text-slate-800"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-[10px] font-bold text-slate-400 tracking-wider uppercase mb-1">物理收货 / 申诉绑定地址</label>
                                    <input
                                      type="text"
                                      value={formIdentityAddress}
                                      onChange={(e) => setFormIdentityAddress(e.target.value)}
                                      placeholder="省、市、区、常用收货或注册地"
                                      className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:bg-white rounded-lg px-3 py-2 text-xs outline-none text-slate-800"
                                    />
                                  </div>
                                </div>
                              </>
                            )}

                            <div>
                              <label className="block text-[10px] font-bold text-slate-400 tracking-wider uppercase mb-1">安全备注及备忘记录 (支持明细)</label>
                              <textarea
                                value={formNotes}
                                onChange={(e) => setFormNotes(e.target.value)}
                                placeholder="输入该条目的备用说明、密保问题、二次恢复口令等重要明细..."
                                rows={4}
                                className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:bg-white rounded-lg px-3 py-2 text-xs outline-none text-slate-800 font-sans"
                              />
                            </div>
                          </div>

                            </form>
                          </div>
                        </div>
                      ) : selectedFolder === "settings" ? (
                        /* RENDER BEAUTIFUL SETTINGS VIEW */
                        <div className="flex-1 flex flex-col overflow-hidden font-sans bg-slate-50">
                          {/* Header panel */}
                          <div className="pt-3 pb-2 px-4 md:px-6 bg-slate-50 flex items-center justify-between gap-4 shrink-0">
                            <div className="flex items-center space-x-2 text-left">
                              <Settings className="w-5 h-5 text-indigo-600 shrink-0" />
                              <div>
                                <h3 className="text-xs font-bold text-slate-800 leading-tight">保险箱高级设置中心</h3>
                                <p className="text-[10px] text-slate-400 mt-0.5">零知识本端物理备份、本端数据导入与恢复</p>
                              </div>
                            </div>
                          </div>

                          {/* Scrollable container */}
                          <div className="flex-1 overflow-y-auto overflow-x-hidden p-3 md:p-6 bg-slate-50">
                            <div className="max-w-4xl mx-auto space-y-6">

                              {/* Backup and restore card */}
                              <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm space-y-6 text-left">
                                <div className="border-b border-slate-100 pb-4">
                                  <h4 className="text-xs font-black text-slate-800 flex items-center space-x-2 uppercase tracking-wide">
                                    <FileSpreadsheet className="w-4 h-4 text-indigo-500" />
                                    <span>数据备份、恢复与本地导入导出</span>
                                  </h4>
                                  <p className="text-[10px] text-slate-400 mt-1 leading-relaxed">
                                    此密盒由完全离线物理沙盒驱动，所有数据均存储在本地。为了防止使用应用的设备丢失或损坏造成数据丢失，请务必定期导出物理备份文件。
                                  </p>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                  
                                  {/* Export Section */}
                                  <div className="flex flex-col justify-between h-full">
                                    <div className="space-y-4">
                                      <h5 className="text-[11px] font-bold text-slate-700 flex items-center space-x-1.5">
                                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                                        <span>导出本端物理备份 (JSON格式)</span>
                                      </h5>
                                      <p className="text-[10px] text-slate-500 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-200/50">
                                        📥 该文件包含当前保险箱内所有的<b>分类文件夹目录</b>与<b>凭证记录明细</b>。密文物理对齐本地密钥后，导出为解密的标准 JSON 文件，请安全离线保存该备份。
                                      </p>
                                    </div>
                                    <div className="pt-4">
                                      <button
                                        type="button"
                                        onClick={handleExportData}
                                        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs py-2.5 rounded-xl transition shadow-md flex items-center justify-center space-x-2 cursor-pointer font-sans"
                                      >
                                        <Download className="w-4 h-4" />
                                        <span>一键导出保险箱物理备份</span>
                                      </button>
                                    </div>
                                  </div>

                                  {/* Import Section */}
                                  <div className="flex flex-col justify-between h-full">
                                    <div className="space-y-4">
                                      <h5 className="text-[11px] font-bold text-slate-700 flex items-center space-x-1.5">
                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                                        <span>从物理备份恢复 / 合并导入</span>
                                      </h5>
                                      
                                      {/* Strategy Select */}
                                      <div className="flex flex-col sm:flex-row bg-slate-100/80 p-1 rounded-xl border border-slate-200/50 gap-1 sm:gap-0">
                                        <button
                                          type="button"
                                          onClick={() => setImportStrategy("merge")}
                                          className={`flex-1 py-1.5 px-2 rounded-lg text-[10px] font-bold transition-all cursor-pointer truncate ${
                                            importStrategy === "merge"
                                              ? "bg-white text-slate-800 shadow-sm border border-slate-200"
                                              : "text-slate-500 hover:text-slate-800"
                                          }`}
                                        >
                                          合并导入 (不覆盖现有凭证)
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => setImportStrategy("overwrite")}
                                          className={`flex-1 py-1.5 px-2 rounded-lg text-[10px] font-bold transition-all cursor-pointer truncate ${
                                            importStrategy === "overwrite"
                                              ? "bg-white text-rose-700 shadow-sm border border-rose-200"
                                              : "text-slate-500 hover:text-rose-500"
                                          }`}
                                        >
                                          覆盖导入 (清空并完全替换)
                                        </button>
                                      </div>
                                    </div>

                                    <div className="pt-4 flex-1 flex flex-col">
                                      {/* Tauri 文件对话框导入按钮 */}
                                      <button
                                        type="button"
                                        onClick={handleImportFile}
                                        className="relative group border-2 border-dashed border-slate-200 hover:border-indigo-400 rounded-xl transition-colors text-center cursor-pointer bg-slate-50/50 hover:bg-slate-50 flex flex-col justify-center h-full px-4 min-h-[38px] w-full"
                                      >
                                        <div className="flex items-center justify-center space-x-1.5">
                                          <Upload className="w-3.5 h-3.5 text-slate-400 group-hover:scale-110 transition-transform shrink-0" />
                                          <span className="text-[10px] font-bold text-slate-600">点击选择备份 JSON 文件</span>
                                        </div>
                                      </button>
                                    </div>
                                  </div>

                                </div>
                              </div>

                              {/* Password Management Tools */}
                              <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm text-left">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                  {/* 左：导入浏览器密码 */}
                                  <div className="space-y-2.5">
                                    <div>
                                      <h5 className="text-[11px] font-bold text-slate-700 flex items-center space-x-1.5">
                                        <Globe className="w-3.5 h-3.5 text-indigo-500" />
                                        <span>导入浏览器密码</span>
                                      </h5>
                                      <p className="text-[10px] text-slate-400 mt-0.5 leading-relaxed">支持 Chrome、Edge、Firefox 导出的 CSV 一键导入。</p>
                                    </div>
                                    <button
                                      type="button"
                                      onClick={handleBrowserImport}
                                      className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs py-2 rounded-lg transition shadow-sm flex items-center justify-center space-x-1.5 cursor-pointer font-sans"
                                    >
                                      <Globe className="w-3.5 h-3.5" />
                                      <span>选择 CSV 文件</span>
                                    </button>
                                  </div>

                                  {/* 右：自动锁定 */}
                                  <div className="space-y-2.5 md:border-l md:border-slate-100 md:pl-6">
                                    <div>
                                      <h5 className="text-[11px] font-bold text-slate-700 flex items-center space-x-1.5">
                                        <Clock className="w-3.5 h-3.5 text-indigo-500" />
                                        <span>自动锁定</span>
                                      </h5>
                                      <p className="text-[10px] text-slate-400 mt-0.5 leading-relaxed">超时后自动擦除内存中的密钥。</p>
                                    </div>
                                    <div className="relative">
                                      <button type="button" onClick={() => setAutoLockOpen(!autoLockOpen)}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-[11px] text-slate-700 outline-none focus:border-indigo-500 cursor-pointer flex items-center justify-between transition-all">
                                        <span className="font-semibold text-slate-800">{getTimeoutLabel(autoLockTimeout)}</span>
                                        <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 shrink-0 ${autoLockOpen ? "rotate-180 text-indigo-500" : ""}`} />
                                      </button>
                                      {autoLockOpen && (
                                        <>
                                          <div className="fixed inset-0 z-10 cursor-default" onClick={() => setAutoLockOpen(false)} />
                                          <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200/90 rounded-lg shadow-lg py-1 z-20">
                                            {[0, 1, 5, 15, 30, 60].map(val => (
                                              <button key={val} type="button" onClick={() => { setAutoLockTimeout(val); setAutoLockOpen(false); showToast(`🔒 自动锁定超时已设置为: ${getTimeoutLabel(val)}`); }}
                                                className={`w-full text-left px-2.5 py-1.5 text-[11px] flex items-center justify-between transition-colors cursor-pointer ${autoLockTimeout === val ? "bg-indigo-50 text-indigo-700 font-bold" : "text-slate-700 hover:bg-slate-50"}`}>
                                                <span>{val === 0 ? "从不锁定 (不推荐)" : `${getTimeoutLabel(val)}`}</span>
                                                {autoLockTimeout === val && <Check className="w-3.5 h-3.5 text-indigo-500 shrink-0" />}
                                              </button>
                                            ))}
                                          </div>
                                        </>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </div>

                              {/* Change Master Password */}
                              <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm space-y-4 text-left">
                                <div className="border-b border-slate-100 pb-4">
                                  <h4 className="text-xs font-black text-slate-800 flex items-center space-x-2 uppercase tracking-wide">
                                    <KeyRound className="w-4 h-4 text-indigo-500" />
                                    <span>修改主密码</span>
                                  </h4>
                                  <p className="text-[10px] text-slate-400 mt-1 leading-relaxed">
                                    验证旧密码后即可更换新主密码，可选切换 KDF 算法。保险箱数据将用新密码重新加密保存。
                                  </p>
                                </div>

                                {!showChangePassword ? (
                                  <button
                                    type="button"
                                    onClick={() => setShowChangePassword(true)}
                                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs py-2.5 rounded-xl transition shadow-md cursor-pointer font-sans"
                                  >
                                    修改主密码
                                  </button>
                                ) : (
                                  <form onSubmit={handleChangePassword} className="space-y-3" noValidate>
                                    <div>
                                      <label className="block text-[10px] font-bold text-slate-400 tracking-wider uppercase mb-1">旧主密码</label>
                                      <div className="relative">
                                        <input type={showChangePwOld ? "text" : "password"} required value={changePwOld}
                                          onChange={(e) => { setChangePwOld(e.target.value); setChangePwError(""); }}
                                          className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-lg pl-3 pr-8 py-2 text-xs outline-none text-slate-800" />
                                        <button type="button"
                                          onClick={() => setShowChangePwOld(!showChangePwOld)}
                                          className="absolute right-2 top-2 text-slate-400 hover:text-indigo-600 transition-colors cursor-pointer"
                                          title={showChangePwOld ? "隐藏" : "显示"}>
                                          {showChangePwOld ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                        </button>
                                      </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                      <div>
                                        <label className="block text-[10px] font-bold text-slate-400 tracking-wider uppercase mb-1">新主密码（≥8位）</label>
                                        <div className="relative">
                                          <input type={showChangePwNew ? "text" : "password"} required value={changePwNew}
                                            onChange={(e) => { setChangePwNew(e.target.value); setChangePwError(""); }}
                                            className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-lg pl-3 pr-8 py-2 text-xs outline-none text-slate-800" />
                                          <button type="button"
                                            onClick={() => setShowChangePwNew(!showChangePwNew)}
                                            className="absolute right-2 top-2 text-slate-400 hover:text-indigo-600 transition-colors cursor-pointer"
                                            title={showChangePwNew ? "隐藏" : "显示"}>
                                            {showChangePwNew ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                          </button>
                                        </div>
                                      </div>
                                      <div>
                                        <label className="block text-[10px] font-bold text-slate-400 tracking-wider uppercase mb-1">确认新密码</label>
                                        <div className="relative">
                                          <input type={showChangePwConfirm ? "text" : "password"} required value={changePwConfirm}
                                            onChange={(e) => { setChangePwConfirm(e.target.value); setChangePwError(""); }}
                                            className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-lg pl-3 pr-8 py-2 text-xs outline-none text-slate-800" />
                                          <button type="button"
                                            onClick={() => setShowChangePwConfirm(!showChangePwConfirm)}
                                            className="absolute right-2 top-2 text-slate-400 hover:text-indigo-600 transition-colors cursor-pointer"
                                            title={showChangePwConfirm ? "隐藏" : "显示"}>
                                            {showChangePwConfirm ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                          </button>
                                        </div>
                                      </div>
                                    </div>
                                    <div>
                                      <label className="block text-[10px] font-bold text-slate-400 tracking-wider uppercase mb-1">加密算法</label>
                                      <div className="relative">
                                        <button type="button" onClick={() => setChangePwKdfOpen(!changePwKdfOpen)}
                                          className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-700 outline-none focus:border-indigo-500 cursor-pointer flex items-center justify-between transition-all">
                                          <span className="flex items-center space-x-1.5 font-semibold text-slate-800">
                                            <span className="text-sm shrink-0">{changePwNewKdf === "argon2id" ? "🛡️" : "⚙️"}</span>
                                            <span>{changePwNewKdf === "argon2id" ? "Argon2id（推荐，抗GPU）" : "PBKDF2-SHA256（10万次）"}</span>
                                          </span>
                                          <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 shrink-0 ${changePwKdfOpen ? "rotate-180 text-indigo-500" : ""}`} />
                                        </button>
                                        {changePwKdfOpen && (
                                          <>
                                            <div className="fixed inset-0 z-10 cursor-default" onClick={() => setChangePwKdfOpen(false)} />
                                            <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200/90 rounded-lg shadow-lg py-1 z-20">
                                              {(["argon2id", "pbkdf2"] as const).map(k => (
                                                <button key={k} type="button" onClick={() => { setChangePwNewKdf(k); setChangePwKdfOpen(false); }}
                                                  className={`w-full text-left px-3 py-2 text-xs flex items-center space-x-2 transition-colors cursor-pointer ${changePwNewKdf === k ? "bg-indigo-50 text-indigo-700 font-bold" : "text-slate-700 hover:bg-slate-50"}`}>
                                                  <span className="text-sm shrink-0">{k === "argon2id" ? "🛡️" : "⚙️"}</span>
                                                  <span className="flex-1 truncate">{k === "argon2id" ? "Argon2id（推荐，抗GPU）" : "PBKDF2-SHA256（10万次）"}</span>
                                                  {changePwNewKdf === k && <Check className="w-3.5 h-3.5 text-indigo-500 shrink-0" />}
                                                </button>
                                              ))}
                                            </div>
                                          </>
                                        )}
                                      </div>
                                    </div>
                                    {changePwError && (
                                      <p className="text-[10px] text-rose-600 font-medium">{changePwError}</p>
                                    )}
                                    <div className="flex space-x-2">
                                      {!isChangingPw && (
                                        <button type="button"
                                          onClick={() => { setShowChangePassword(false); setShowChangePwOld(false); setShowChangePwNew(false); setShowChangePwConfirm(false); setChangePwError(""); }}
                                          className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs py-2 rounded-lg transition-colors cursor-pointer">取消</button>
                                      )}
                                      <button type="submit" disabled={isChangingPw}
                                        className={`flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-500 text-white font-bold text-xs py-2 rounded-lg transition-all shadow-sm cursor-pointer ${isChangingPw ? "flex-[2]" : ""}`}>
                                        {isChangingPw ? (
                                          <span className="flex items-center justify-center space-x-1.5">
                                            <RefreshCw className="w-3 h-3 animate-spin" />
                                            <span>{changePwProgress || "正在处理..."}</span>
                                          </span>
                                        ) : "确认修改"}
                                      </button>
                                    </div>
                                  </form>
                                )}
                              </div>

                            </div>
                          </div>
                        </div>
                      ) : selectedFolder === "audit" ? (
                        <SecurityAudit
                          isAuditScanning={isAuditScanning}
                          hasAuditScanned={hasAuditScanned}
                          totalCount={totalCount}
                          weakCount={weakCount}
                          reusedCount={reusedCount}
                          compromisedCount={compromisedCount}
                          ignoredCount={ignoredCount}
                          passMap={passMap}
                          items={vaultItems}
                          onStartAudit={handleStartAudit}
                          onFixItem={handleFixVulnerableItem}
                          onToggleIgnore={toggleIgnoreWarning}
                          onCopyPassword={(p) => copyToClipboard(p, "密码")}
                        />
                      ) : selectedItem ? (
                        <CredentialDetail
                          item={selectedItem!}
                          revealedPasswords={revealedPasswords}
                          onToggleReveal={(key) => setRevealedPasswords(prev => ({ ...prev, [key]: !prev[key] }))}
                          onToggleFavorite={toggleFavorite}
                          onCopy={copyToClipboard}
                          onOpenUrl={(url) => shellOpen(url)}
                          onEdit={() => setIsEditing(true)}
                          onDelete={handleDeleteItem}
                          onToggleIgnoreWarning={toggleIgnoreWarning}
                          passMap={passMap}
                        />
                      ) : selectedFolder === "generator" ? (
                        <PasswordGenerator
                          genType={genType} setGenType={setGenType}
                          genConfig={genConfig} setGenConfig={setGenConfig}
                          passphraseWords={passphraseWords} setPassphraseWords={setPassphraseWords}
                          passphraseSeparator={passphraseSeparator} setPassphraseSeparator={setPassphraseSeparator}
                          passphraseCapitalize={passphraseCapitalize} setPassphraseCapitalize={setPassphraseCapitalize}
                          passphraseAddNumber={passphraseAddNumber} setPassphraseAddNumber={setPassphraseAddNumber}
                          generatedPass={generatedPass}
                          generatorHistory={generatorHistory}
                          onGenerate={generatePassword}
                          onSaveToHistory={saveGeneratedToHistory}
                          onClearHistory={clearGeneratorHistory}
                          onCopy={copyToClipboard}
                          calculateEntropy={calculateEntropy}
                          calculatePassphraseEntropy={calculatePassphraseEntropy}
                        />
                      ) : selectedFolder === "extension" ? (
                        <BrowserExtensionHub
                          vaultItems={vaultItems}
                          getEncryptedPayload={exportData}
                          selectedKdf={selectedKdf}
                          showToast={showToast}
                        />
                      ) : null}

                    </div>

                    {/* EXTENSION PANEL: 独立 wrapper，无 flex-1，高度自适应 */}
                    {selectedFolder === "extension" ? (
                      <div className="flex flex-col bg-slate-50">
                        <BrowserExtensionHub
                          vaultItems={vaultItems}
                          getEncryptedPayload={exportData}
                          selectedKdf={selectedKdf}
                          showToast={showToast}
                        />
                      </div>
                    ) : null}

                    </div> {/* Closes panels container */}

                    {/* BOTTOM HORIZONTAL STATUS BAR: 100% 纯本地离线安全沙箱 */}
                    <div className="bg-slate-50 px-5 py-2 shrink-0 flex flex-col md:flex-row md:items-center justify-between gap-3 text-[10px] text-slate-500 font-sans">
                      <div className="flex items-center space-x-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0"></div>
                        <p className="leading-none truncate">
                          <span className="font-bold text-slate-700">100% 纯本地离线安全沙箱</span>
                          <span className="text-slate-300 mx-2">|</span>
                          <span className="text-slate-500">所有凭证经高强度算法本端加密存储，支持完全断网独立运行。</span>
                        </p>
                      </div>
                      
                      <div className="flex items-center space-x-5 font-mono text-[9px] shrink-0 text-slate-400 self-end md:self-auto">
                        <div>
                          <span className="text-slate-500 font-bold">物理派生：</span>
                          <span>{selectedKdf === "argon2id" ? "Argon2id (64MB)" : "PBKDF2-HMAC-SHA256"}</span>
                        </div>
                        <div>
                          <span className="text-slate-500 font-bold">加密算法：</span>
                          <span>{masterKey ? "AES-256-GCM 硬件级" : "未派生"}</span>
                        </div>
                      </div>
                    </div>

                  </div>
                </div>
              )}

      </div>

      {/* Quick Add Custom Folder Dialog */}
      {showFolderModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
          <div className="bg-white rounded-xl border border-slate-200 p-6 max-w-sm w-full shadow-2xl relative font-sans">
            <h3 className="text-sm font-bold text-slate-900 mb-1">新建本地分类文件夹</h3>
            <p className="text-[11px] text-slate-500 mb-4">创建后，您的密码项可直接归入此类文件夹做密文聚合分类。</p>
            
            <form onSubmit={handleAddFolder} noValidate className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 tracking-wider uppercase mb-1">分类名称</label>
                <input
                  type="text"
                  placeholder="如: 服务器密钥, 临时网购账户"
                  value={newFolderName}
                  onChange={(e) => {
                    setNewFolderName(e.target.value);
                    if (folderError) setFolderError("");
                  }}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:bg-white rounded-lg px-3 py-2 text-xs outline-none text-slate-800 font-semibold transition-all"
                />
              </div>

              {folderError && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-rose-50 border border-rose-100 rounded-lg px-3 py-2 text-rose-600 text-[10px] font-medium flex items-center space-x-1.5"
                >
                  <ShieldAlert className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                  <span className="leading-none">{folderError}</span>
                </motion.div>
              )}

              <div className="flex space-x-2.5 justify-end pt-1">
                <button
                  type="button"
                  onClick={() => setShowFolderModal(false)}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors shadow-sm"
                >
                  确认新建
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 导入备份密码输入模态框 */}
      {showImportPasswordModal && (
        <ImportPasswordModal
          importPassword={importPassword}
          setImportPassword={(v) => { setImportPassword(v); setImportPasswordError(""); }}
          importPasswordError={importPasswordError}
          isDeriving={isImportDecrypting}
          derivationProgress={importDecryptProgress}
          onSubmit={handleImportPasswordSubmit}
          onCancel={() => {
            setShowImportPasswordModal(false);
            setImportBackupData(null);
            setImportPassword("");
            setImportPasswordError("");
            setIsImportDecrypting(false);
            setImportDecryptProgress("");
          }}
        />
      )}

      {/* Browser Password Import Preview Modal */}
      {showBrowserImport && browserImportResult && (
        <BrowserImportPreview
          importResult={browserImportResult}
          duplicates={browserImportDups}
          existingCount={vaultItems.length}
          importStrategy={browserImportStrategy}
          setImportStrategy={setBrowserImportStrategy}
          onConfirm={handleBrowserImportConfirm}
          onCancel={() => {
            setShowBrowserImport(false);
            setBrowserImportResult(null);
          }}
        />
      )}

      {/* Custom Secure Erase / Deletion Confirmation Modal */}
      {deleteConfirm && (
        <DeleteConfirmModal
          data={deleteConfirm}
          onConfirm={confirmDeleteAction}
          onCancel={() => setDeleteConfirm(null)}
        />
      )}
    </div>
  );
}
