import { contextBridge, ipcRenderer } from 'electron';

/**
 * Exposição segura de APIs para o Renderer.
 * Segue o princípio de privilégio mínimo.
 */
contextBridge.exposeInMainWorld('electronAPI', {
  /**
   * Verifica se é o primeiro acesso.
   */
  isFirstRun: () => ipcRenderer.invoke('is-first-run'),

  /**
   * Tenta desbloquear o app com a senha mestre.
   */
  unlockApp: (password: string) => ipcRenderer.invoke('unlock-app', password),

  /**
   * Salva uma nova conta criptografada.
   */
  saveCredentials: (account: any) => ipcRenderer.invoke('save-credentials', account),

  /**
   * Carrega todas as contas salvas.
   */
  loadAccounts: () => ipcRenderer.invoke('load-accounts'),

  /**
   * Remove uma conta salva.
   */
  deleteAccount: (accountId: string) => ipcRenderer.invoke('delete-account', accountId),

  /**
   * Retorna o nome da partition para uma aba.
   */
  getTabPartition: (tabId: string) => ipcRenderer.invoke('get-tab-partition', tabId),

  /**
   * Exporta o backup das contas.
   */
  exportBackup: () => ipcRenderer.invoke('export-backup'),

  /**
   * Importa o backup das contas.
   */
  importBackup: () => ipcRenderer.invoke('import-backup'),

  /**
   * Listener para eventos do sistema (opcional).
   */
  on: (channel: string, callback: (...args: any[]) => void) => {
    const validChannels = ['app-event'];
    if (validChannels.includes(channel)) {
      ipcRenderer.on(channel, (_, ...args) => callback(...args));
    }
  }
});
