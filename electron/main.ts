import { app, BrowserWindow, ipcMain, dialog, session } from 'electron';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { SecurityService } from '../src/security/SecurityService.ts';
import { StorageService } from '../src/storage/StorageService.ts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Switches de comando para ocultar que o navegador é automatizado e parecer um navegador real
app.commandLine.appendSwitch('disable-blink-features', 'AutomationControlled');
app.commandLine.appendSwitch('exclude-switches', 'enable-automation');
app.commandLine.appendSwitch('disable-infobars');
app.commandLine.appendSwitch('lang', 'pt-BR');

// Singleton instances
const security = SecurityService.getInstance();
let storage: StorageService | null = null;

function getStorage() {
  if (!storage) {
    storage = new StorageService();
  }
  return storage;
}

let mainWindow: BrowserWindow | null = null;
let masterPasswordHash: string | null = null; // Armazenado apenas em memória durante a sessão

/**
 * Cria a janela principal do navegador.
 */
async function createWindow() {
  const preloadPath = path.join(__dirname, 'preload.js');
  console.log('Caminho do Preload:', preloadPath);
  console.log('Preload existe?', fs.existsSync(preloadPath));

  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    show: false, // Inicia oculta para evitar flash branco/preto
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      nodeIntegration: false,
      webviewTag: true,
      webSecurity: true, // Reativar webSecurity para passar nos testes de segurança do Google
    },
  });

  // Em desenvolvimento, carrega a URL do Vite
  if (process.env.VITE_DEV_SERVER_URL) {
    console.log('Carregando URL de desenvolvimento:', process.env.VITE_DEV_SERVER_URL);
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
    mainWindow.webContents.openDevTools();
  } else {
    console.log('Carregando arquivo de produção...');
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.once('ready-to-show', () => {
    console.log('Janela pronta para exibir!');
    mainWindow?.show();
    mainWindow?.focus();
  });
}

/**
 * Configura o interceptor de cabeçalhos para uma sessão específica.
 */
function setupSessionHeaders(ses: any) {
  if (!ses) return;

  // User-Agent estável e comum (Chrome 133 no Windows)
  const userAgent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36";
  ses.setUserAgent(userAgent);

  // Interceptor para cabeçalhos de resposta (remover restrições de enquadramento)
  ses.webRequest.onHeadersReceived({ urls: ['*://*/*'] }, (details: any, callback: any) => {
    const headers = { ...details.responseHeaders };
    
    Object.keys(headers).forEach(headerKey => {
      const lowerKey = headerKey.toLowerCase();
      
      // Remover apenas o que impede o enquadramento (X-Frame-Options)
      if (lowerKey === 'x-frame-options' || lowerKey === 'frame-options' || lowerKey.startsWith('x-frame-')) {
        delete headers[headerKey];
        return;
      }

      // Modificar CSP para permitir enquadramento sem remover toda a segurança
      if (lowerKey === 'content-security-policy' || lowerKey === 'content-security-policy-report-only') {
        const csp = headers[headerKey][0];
        if (csp) {
          // Remover apenas diretivas restritivas de frame-ancestors
          headers[headerKey] = [csp.replace(/frame-ancestors\s+[^;]+(;|$)/gi, '').replace(/child-src\s+[^;]+(;|$)/gi, '')];
        }
      }
    });

    callback({
      cancel: false,
      responseHeaders: headers
    });
  });

  // Interceptor para cabeçalhos de requisição
  ses.webRequest.onBeforeSendHeaders({ urls: ['*://*/*'] }, (details: any, callback: any) => {
    const headers = { ...details.requestHeaders };
    
    // Não mexer em requisições do Google para evitar detecção
    const isGoogle = details.url.includes('google.com') || details.url.includes('gstatic.com');
    
    if (!isGoogle) {
      if (headers['Referer'] && (headers['Referer'].includes('localhost') || headers['Referer'].includes('run.app'))) {
        delete headers['Referer'];
      }
      if (headers['Origin'] && (headers['Origin'].includes('localhost') || headers['Origin'].includes('run.app'))) {
        delete headers['Origin'];
      }
    }

    callback({
      cancel: false,
      requestHeaders: headers
    });
  });
}

// Configura o interceptor para a sessão padrão
app.whenReady().then(() => {
  setupSessionHeaders(session.defaultSession);
  
  // Garantir que todas as sessões criadas (incluindo partitions de webviews) recebam os interceptores
  app.on('session-created', (ses) => {
    setupSessionHeaders(ses);
  });

  // Configurar webviews quando forem criados
  app.on('web-contents-created', (_, webContents) => {
    // Aplicar interceptores à sessão de qualquer webContents (janela ou webview)
    setupSessionHeaders(webContents.session);

    if (webContents.getType() === 'webview') {
      // Desativar restrições de segurança específicas do webview que podem causar bloqueios
      webContents.setWindowOpenHandler(({ url }) => {
        mainWindow?.webContents.send('app-event', { type: 'new-window', url });
        return { action: 'deny' };
      });
    }

    // Interceptar a criação de webviews para ajustar suas webPreferences
    webContents.on('will-attach-webview', (_, webPreferences) => {
      webPreferences.webSecurity = true;
      webPreferences.nodeIntegration = false;
      webPreferences.contextIsolation = true;
      webPreferences.sandbox = false; // Desativar sandbox para evitar restrições excessivas em scripts do Google
      
      // Caminho para o preload script do webview
      const webviewPreloadPath = path.join(__dirname, 'preload-webview.js');
      console.log('Main: Aplicando preload ao webview:', webviewPreloadPath);
      webPreferences.preload = webviewPreloadPath;
    });

    // Configurar permissões para a sessão do webContents
    webContents.session.setPermissionRequestHandler((_, permission, callback) => {
      const allowedPermissions = ['notifications', 'fullscreen', 'geolocation', 'media'];
      if (allowedPermissions.includes(permission)) {
        callback(true);
      } else {
        callback(false);
      }
    });
  });

  createWindow();
});

// --- IPC Handlers (Canais Seguros) ---

/**
 * Verifica se é o primeiro acesso (sem dados salvos).
 */
ipcMain.handle('is-first-run', async () => {
  console.log('Main: Recebido is-first-run');
  try {
    const data = await getStorage().load();
    console.log('Main: Dados carregados:', !!data);
    return data === null;
  } catch (error) {
    console.error('Main: Erro em is-first-run:', error);
    throw error;
  }
});

/**
 * Verifica se a senha mestre está correta e desbloqueia os dados.
 */
ipcMain.handle('unlock-app', async (_, password: string) => {
  console.log('Main: Recebido unlock-app');
  const encryptedData = await getStorage().load();
  
  if (!encryptedData) {
    // Primeira vez: define a senha mestre e cria o dado de teste
    masterPasswordHash = password;
    const testData = await security.encrypt('VALID_SESSION', password);
    await getStorage().save({ accounts: [], test: testData });
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

  let currentData = await getStorage().load() || { accounts: [] };
  
  // Criptografa os dados da conta
  const encrypted = await security.encrypt(JSON.stringify(accountData), masterPasswordHash);
  
  // Se for a primeira vez, cria o dado de teste para validação futura
  if (!currentData.test) {
    currentData.test = await security.encrypt('VALID_SESSION', masterPasswordHash);
  }

  currentData.accounts.push(encrypted);
  await getStorage().save(currentData);
  
  return { success: true };
});

/**
 * Carrega todas as contas salvas e as descriptografa.
 */
ipcMain.handle('load-accounts', async () => {
  if (!masterPasswordHash) return [];

  const encryptedData = await getStorage().load();
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
 * Remove uma conta salva.
 */
ipcMain.handle('delete-account', async (_, accountId: string) => {
  if (!masterPasswordHash) return { success: false, error: 'App bloqueado.' };

  const encryptedData = await getStorage().load();
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
  await getStorage().save(encryptedData);
  
  return { success: true };
});

/**
 * Cria uma nova aba com partition isolada.
 */
ipcMain.handle('get-tab-partition', (_, tabId: string) => {
  const partition = `persist:tab_${tabId}`;
  // Garantir que a sessão da aba receba os interceptores assim que for solicitada
  setupSessionHeaders(session.fromPartition(partition));
  return partition;
});

/**
 * Exporta o backup criptografado.
 */
ipcMain.handle('export-backup', async () => {
  const data = await getStorage().load();
  if (!data) return { success: false, error: 'Nenhum dado para exportar.' };

  const { filePath } = await dialog.showSaveDialog({
    title: 'Exportar Backup',
    defaultPath: 'browser_backup.json',
    filters: [{ name: 'JSON', extensions: ['json'] }]
  });

  if (filePath) {
    await fs.promises.writeFile(filePath, JSON.stringify(data, null, 2), 'utf8');
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
      const content = await fs.promises.readFile(filePaths[0], 'utf8');
      const data = JSON.parse(content);
      
      // Validação básica
      if (!data.accounts || !data.test) {
        return { success: false, error: 'Formato de backup inválido.' };
      }

      await getStorage().save(data);
      return { success: true };
    } catch (e) {
      return { success: false, error: 'Erro ao ler arquivo.' };
    }
  }
  return { success: false };
});

/**
 * Limpa os dados de armazenamento de uma partition.
 */
ipcMain.handle('clear-partition-data', async (_, partition: string) => {
  try {
    const ses = session.fromPartition(partition);
    await ses.clearStorageData();
    return { success: true };
  } catch (error) {
    console.error('Main: Erro ao limpar dados da partition:', error);
    return { success: false, error: String(error) };
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
