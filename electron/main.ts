import { app, BrowserWindow, ipcMain, dialog, session } from 'electron';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { SecurityService } from '../src/security/SecurityService.ts';
import { StorageService } from '../src/storage/StorageService.ts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Desativa aceleração de hardware para evitar tela preta em algumas GPUs no Windows
app.disableHardwareAcceleration();

// Desativar isolamento de sites para permitir que o interceptor de cabeçalhos funcione sem restrições do motor Chromium
app.commandLine.appendSwitch('disable-site-isolation-trials');
app.commandLine.appendSwitch('disable-features', 'IsolateOrigins,site-per-process');

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
      webSecurity: false, // Desabilitar webSecurity para permitir manipulação de cabeçalhos
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
  const partition = ses.getStoragePath() ? 'persistente' : 'em memória';
  console.log(`>>> Aplicando interceptores à sessão (${partition})...`);

  // Interceptor para cabeçalhos de resposta (remover restrições)
  ses.webRequest.onHeadersReceived({ urls: ['*://*/*'] }, (details: any, callback: any) => {
    const headers = { ...details.responseHeaders };
    const isGoogle = details.url.includes('google.com');
    
    if (isGoogle) {
      console.log('>>> [Response] Google URL:', details.url);
      // console.log('>>> [Response] Headers originais:', JSON.stringify(headers));
    }

    // Lista exaustiva de cabeçalhos que podem bloquear o carregamento em webviews/iframes
    const keysToRemove = [
      'x-frame-options',
      'content-security-policy',
      'content-security-policy-report-only',
      'frame-options',
      'cross-origin-resource-policy',
      'cross-origin-opener-policy',
      'cross-origin-embedder-policy',
      'x-content-security-policy',
      'x-webkit-csp',
      'x-content-type-options',
      'referrer-policy',
      'permissions-policy'
    ];

    let removedCount = 0;
    const removedKeys: string[] = [];

    Object.keys(headers).forEach(headerKey => {
      const lowerKey = headerKey.toLowerCase();
      if (keysToRemove.some(k => lowerKey === k) || lowerKey.startsWith('x-frame-')) {
        delete headers[headerKey];
        removedKeys.push(headerKey);
        removedCount++;
      }
    });

    // Adicionar permissões CORS e políticas de recursos cruzados para evitar bloqueios
    headers['Access-Control-Allow-Origin'] = ['*'];
    headers['Access-Control-Allow-Methods'] = ['GET, POST, OPTIONS, PUT, PATCH, DELETE'];
    headers['Access-Control-Allow-Headers'] = ['*'];
    headers['Access-Control-Allow-Credentials'] = ['true'];
    headers['Cross-Origin-Resource-Policy'] = ['cross-origin'];
    headers['Cross-Origin-Embedder-Policy'] = ['unsafe-none'];
    headers['Cross-Origin-Opener-Policy'] = ['unsafe-none'];

    if (isGoogle && removedCount > 0) {
      console.log(`>>> [HeadersReceived] Removidos ${removedCount} cabeçalhos (${removedKeys.join(', ')}) de: ${details.url}`);
    }

    callback({
      cancel: false,
      responseHeaders: headers
    });
  });

  // Interceptor para cabeçalhos de requisição (melhorar compatibilidade)
  ses.webRequest.onBeforeSendHeaders({ urls: ['*://*/*'] }, (details: any, callback: any) => {
    const isGoogle = details.url.includes('google.com');
    if (isGoogle) {
      console.log('>>> [Request] Google URL:', details.url);
    }

    const headers = { ...details.requestHeaders };
    
    // Forçar Sec-Fetch-Dest como 'document' para evitar bloqueios de iframe
    if (headers['Sec-Fetch-Dest'] === 'iframe' || headers['Sec-Fetch-Dest'] === 'webview' || isGoogle) {
      headers['Sec-Fetch-Dest'] = 'document';
      headers['Sec-Fetch-Mode'] = 'navigate';
      headers['Sec-Fetch-Site'] = 'none';
      headers['Sec-Fetch-User'] = '?1';
    }
    
    // Remover Referer e Origin se forem de origem local/desenvolvimento para evitar bloqueios de segurança
    if (headers['Referer'] && (headers['Referer'].includes('localhost') || headers['Referer'].includes('run.app'))) {
      delete headers['Referer'];
    }
    if (headers['Origin'] && (headers['Origin'].includes('localhost') || headers['Origin'].includes('run.app'))) {
      delete headers['Origin'];
    }

    // Garantir que o User-Agent seja consistente e pareça um navegador real
    const userAgent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";
    headers['User-Agent'] = userAgent;

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
    console.log('>>> Nova sessão detectada:', ses.getStoragePath() || 'em memória');
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
      console.log('>>> Ajustando webPreferences para webview:', webPreferences.partition);
      webPreferences.webSecurity = false;
      webPreferences.nodeIntegration = false;
      webPreferences.contextIsolation = true;
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
  console.log('>>> Solicitada partition para aba:', tabId, '->', partition);
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

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
