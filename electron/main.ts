import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import path from 'node:path';
import fs from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { SecurityService } from '../src/security/SecurityService.ts';
import { StorageService } from '../src/storage/StorageService.ts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Singleton instances
const security = SecurityService.getInstance();
const storage = new StorageService();

let mainWindow: BrowserWindow | null = null;
let masterPasswordHash: string | null = null; // Armazenado apenas em memória durante a sessão

/**
 * Cria a janela principal do navegador.
 */
async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      webviewTag: true, // Habilita o uso de <webview> para as abas
    },
  });

  // Em desenvolvimento, carrega a URL do Vite
  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }
}

// --- IPC Handlers (Canais Seguros) ---

/**
 * Verifica se a senha mestre está correta e desbloqueia os dados.
 */
ipcMain.handle('unlock-app', async (_, password: string) => {
  const encryptedData = await storage.load();
  
  if (!encryptedData) {
    // Primeira vez: define a senha mestre
    masterPasswordHash = password;
    return { success: true, isNew: true };
  }

  try {
    // Tenta descriptografar um dado de teste para validar a senha
    await security.decrypt(encryptedData.test, password);
    masterPasswordHash = password;
    return { success: true, isNew: false };
  } catch (error) {
    return { success: false, error: 'Senha mestre incorreta.' };
  }
});

/**
 * Salva as credenciais de uma conta de forma criptografada.
 */
ipcMain.handle('save-credentials', async (_, accountData: any) => {
  if (!masterPasswordHash) return { success: false, error: 'App bloqueado.' };

  let currentData = await storage.load() || { accounts: [] };
  
  // Criptografa os dados da conta
  const encrypted = await security.encrypt(JSON.stringify(accountData), masterPasswordHash);
  
  // Se for a primeira vez, cria o dado de teste para validação futura
  if (!currentData.test) {
    currentData.test = await security.encrypt('VALID_SESSION', masterPasswordHash);
  }

  currentData.accounts.push(encrypted);
  await storage.save(currentData);
  
  return { success: true };
});

/**
 * Carrega todas as contas salvas e as descriptografa.
 */
ipcMain.handle('load-accounts', async () => {
  if (!masterPasswordHash) return [];

  const encryptedData = await storage.load();
  if (!encryptedData || !encryptedData.accounts) return [];

  const decryptedAccounts = [];
  for (const encAccount of encryptedData.accounts) {
    try {
      const decrypted = await security.decrypt(encAccount, masterPasswordHash);
      decryptedAccounts.push(JSON.parse(decrypted));
    } catch (e) {
      console.error('Erro ao descriptografar conta:', e);
    }
  }

  return decryptedAccounts;
});

/**
 * Cria uma nova aba com partition isolada.
 */
ipcMain.handle('get-tab-partition', (_, tabId: string) => {
  return `persist:tab_${tabId}`;
});

/**
 * Exporta o backup criptografado.
 */
ipcMain.handle('export-backup', async () => {
  const data = await storage.load();
  if (!data) return { success: false, error: 'Nenhum dado para exportar.' };

  const { filePath } = await dialog.showSaveDialog({
    title: 'Exportar Backup',
    defaultPath: 'browser_backup.json',
    filters: [{ name: 'JSON', extensions: ['json'] }]
  });

  if (filePath) {
    await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf8');
    return { success: true };
  }
  return { success: false };
});

/**
 * Importa um backup criptografado.
 */
ipcMain.handle('import-backup', async () => {
  const { filePaths } = await dialog.showOpenDialog({
    title: 'Importar Backup',
    filters: [{ name: 'JSON', extensions: ['json'] }],
    properties: ['openFile']
  });

  if (filePaths.length > 0) {
    try {
      const content = await fs.readFile(filePaths[0], 'utf8');
      const data = JSON.parse(content);
      
      // Validação básica
      if (!data.accounts || !data.test) {
        return { success: false, error: 'Formato de backup inválido.' };
      }

      await storage.save(data);
      return { success: true };
    } catch (e) {
      return { success: false, error: 'Erro ao ler arquivo.' };
    }
  }
  return { success: false };
});

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
