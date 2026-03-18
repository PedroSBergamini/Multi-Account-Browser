var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
import { app, ipcMain, dialog, BrowserWindow } from "electron";
import path from "node:path";
import fs from "node:fs/promises";
import { fileURLToPath } from "node:url";
import crypto from "node:crypto";
const _SecurityService = class _SecurityService {
  constructor() {
    __publicField(this, "ALGORITHM", "aes-256-gcm");
    __publicField(this, "KEY_LENGTH", 32);
    // 256 bits
    __publicField(this, "IV_LENGTH", 12);
    // Recomendado para GCM
    __publicField(this, "SALT_LENGTH", 16);
    __publicField(this, "ITERATIONS", 1e5);
  }
  static getInstance() {
    if (!_SecurityService.instance) {
      _SecurityService.instance = new _SecurityService();
    }
    return _SecurityService.instance;
  }
  /**
   * Deriva uma chave criptográfica a partir de uma senha mestre e um salt.
   */
  async deriveKey(password, salt) {
    return new Promise((resolve, reject) => {
      crypto.pbkdf2(password, salt, this.ITERATIONS, this.KEY_LENGTH, "sha256", (err, key) => {
        if (err) reject(err);
        resolve(key);
      });
    });
  }
  /**
   * Criptografa dados usando a senha mestre.
   */
  async encrypt(data, masterPassword) {
    const salt = crypto.randomBytes(this.SALT_LENGTH);
    const iv = crypto.randomBytes(this.IV_LENGTH);
    const key = await this.deriveKey(masterPassword, salt);
    const cipher = crypto.createCipheriv(this.ALGORITHM, key, iv);
    let encryptedData = cipher.update(data, "utf8", "hex");
    encryptedData += cipher.final("hex");
    const authTag = cipher.getAuthTag().toString("hex");
    return {
      salt: salt.toString("hex"),
      iv: iv.toString("hex"),
      encryptedData,
      authTag
    };
  }
  /**
   * Descriptografa dados usando a senha mestre.
   */
  async decrypt(encryptedObj, masterPassword) {
    const salt = Buffer.from(encryptedObj.salt, "hex");
    const iv = Buffer.from(encryptedObj.iv, "hex");
    const authTag = Buffer.from(encryptedObj.authTag, "hex");
    const key = await this.deriveKey(masterPassword, salt);
    const decipher = crypto.createDecipheriv(this.ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);
    let decrypted = decipher.update(encryptedObj.encryptedData, "hex", "utf8");
    decrypted += decipher.final("utf8");
    return decrypted;
  }
};
__publicField(_SecurityService, "instance");
let SecurityService = _SecurityService;
class StorageService {
  constructor() {
    __publicField(this, "STORAGE_PATH");
    this.STORAGE_PATH = path.join(app.getPath("userData"), "credentials.enc");
  }
  /**
   * Salva os dados criptografados no arquivo.
   */
  async save(data) {
    const json = JSON.stringify(data);
    await fs.writeFile(this.STORAGE_PATH, json, "utf8");
  }
  /**
   * Carrega os dados do arquivo.
   */
  async load() {
    try {
      const content = await fs.readFile(this.STORAGE_PATH, "utf8");
      return JSON.parse(content);
    } catch (error) {
      return null;
    }
  }
  /**
   * Verifica se o arquivo de credenciais existe.
   */
  async exists() {
    try {
      await fs.access(this.STORAGE_PATH);
      return true;
    } catch {
      return false;
    }
  }
}
const __dirname$1 = path.dirname(fileURLToPath(import.meta.url));
const security = SecurityService.getInstance();
const storage = new StorageService();
let mainWindow = null;
let masterPasswordHash = null;
async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname$1, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      webviewTag: true
      // Habilita o uso de <webview> para as abas
    }
  });
  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(path.join(__dirname$1, "../dist/index.html"));
  }
}
ipcMain.handle("is-first-run", async () => {
  const data = await storage.load();
  return data === null;
});
ipcMain.handle("unlock-app", async (_, password) => {
  const encryptedData = await storage.load();
  if (!encryptedData) {
    masterPasswordHash = password;
    const testData = await security.encrypt("VALID_SESSION", password);
    await storage.save({ accounts: [], test: testData });
    return { success: true, isNew: true };
  }
  try {
    await security.decrypt(encryptedData.test, password);
    masterPasswordHash = password;
    return { success: true, isNew: false };
  } catch (error) {
    return { success: false, error: "Senha mestre incorreta." };
  }
});
ipcMain.handle("save-credentials", async (_, accountData) => {
  if (!masterPasswordHash) return { success: false, error: "App bloqueado." };
  let currentData = await storage.load() || { accounts: [] };
  const encrypted = await security.encrypt(JSON.stringify(accountData), masterPasswordHash);
  if (!currentData.test) {
    currentData.test = await security.encrypt("VALID_SESSION", masterPasswordHash);
  }
  currentData.accounts.push(encrypted);
  await storage.save(currentData);
  return { success: true };
});
ipcMain.handle("load-accounts", async () => {
  if (!masterPasswordHash) return [];
  const encryptedData = await storage.load();
  if (!encryptedData || !encryptedData.accounts) return [];
  const decryptedAccounts = [];
  for (const encAccount of encryptedData.accounts) {
    try {
      const decrypted = await security.decrypt(encAccount, masterPasswordHash);
      decryptedAccounts.push(JSON.parse(decrypted));
    } catch (e) {
      console.error("Erro ao descriptografar conta:", e);
    }
  }
  return decryptedAccounts;
});
ipcMain.handle("delete-account", async (_, accountId) => {
  if (!masterPasswordHash) return { success: false, error: "App bloqueado." };
  const encryptedData = await storage.load();
  if (!encryptedData || !encryptedData.accounts) return { success: false };
  const newAccounts = [];
  for (const encAccount of encryptedData.accounts) {
    try {
      const decrypted = await security.decrypt(encAccount, masterPasswordHash);
      const account = JSON.parse(decrypted);
      if (account.id !== accountId) {
        newAccounts.push(encAccount);
      }
    } catch (e) {
      newAccounts.push(encAccount);
    }
  }
  encryptedData.accounts = newAccounts;
  await storage.save(encryptedData);
  return { success: true };
});
ipcMain.handle("get-tab-partition", (_, tabId) => {
  return `persist:tab_${tabId}`;
});
ipcMain.handle("export-backup", async () => {
  const data = await storage.load();
  if (!data) return { success: false, error: "Nenhum dado para exportar." };
  const { filePath } = await dialog.showSaveDialog({
    title: "Exportar Backup",
    defaultPath: "browser_backup.json",
    filters: [{ name: "JSON", extensions: ["json"] }]
  });
  if (filePath) {
    await fs.writeFile(filePath, JSON.stringify(data, null, 2), "utf8");
    return { success: true };
  }
  return { success: false };
});
ipcMain.handle("import-backup", async () => {
  const { filePaths } = await dialog.showOpenDialog({
    title: "Importar Backup",
    filters: [{ name: "JSON", extensions: ["json"] }],
    properties: ["openFile"]
  });
  if (filePaths.length > 0) {
    try {
      const content = await fs.readFile(filePaths[0], "utf8");
      const data = JSON.parse(content);
      if (!data.accounts || !data.test) {
        return { success: false, error: "Formato de backup inválido." };
      }
      await storage.save(data);
      return { success: true };
    } catch (e) {
      return { success: false, error: "Erro ao ler arquivo." };
    }
  }
  return { success: false };
});
app.whenReady().then(createWindow);
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
