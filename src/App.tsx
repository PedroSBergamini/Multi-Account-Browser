import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  X, 
  ChevronLeft, 
  ChevronRight, 
  RotateCw, 
  Settings, 
  Users, 
  ShieldCheck, 
  Lock, 
  Unlock, 
  Globe, 
  ExternalLink,
  ShieldAlert,
  Key
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// --- Types ---

interface Tab {
  id: string;
  title: string;
  url: string;
  partition: string;
  isActive: boolean;
}

interface Account {
  id: string;
  name: string;
  email: string;
  autoLogin: boolean;
}

// --- Main Component ---

export default function App() {
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [isFirstRun, setIsFirstRun] = useState<boolean | null>(null);
  const [masterPassword, setMasterPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  
  const [tabs, setTabs] = useState<Tab[]>([]);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);
  const [urlInput, setUrlInput] = useState('https://www.google.com');
  
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [autoSave, setAutoSave] = useState(true);

  // --- Initialization ---

  useEffect(() => {
    checkFirstRun();
  }, []);

  const checkFirstRun = async () => {
    try {
      // @ts-ignore
      const firstRun = await window.electronAPI.isFirstRun();
      setIsFirstRun(firstRun);
    } catch (err) {
      console.error('Erro ao verificar primeiro acesso:', err);
    }
  };

  // --- Handlers ---

  /**
   * Configura a senha mestre no primeiro acesso.
   */
  const handleSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (masterPassword.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres.');
      return;
    }

    if (masterPassword !== confirmPassword) {
      setError('As senhas não coincidem.');
      return;
    }

    try {
      // @ts-ignore
      const result = await window.electronAPI.unlockApp(masterPassword);
      if (result.success) {
        setIsUnlocked(true);
        setIsFirstRun(false);
        createNewTab();
      }
    } catch (err) {
      setError('Erro ao configurar senha.');
    }
  };

  /**
   * Desbloqueia o aplicativo.
   */
  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      // @ts-ignore
      const result = await window.electronAPI.unlockApp(masterPassword);
      
      if (result.success) {
        setIsUnlocked(true);
        loadAccounts();
        createNewTab();
      } else {
        setError(result.error || 'Senha incorreta.');
      }
    } catch (err) {
      setError('Erro ao conectar com o sistema.');
    }
  };

  /**
   * Carrega as contas salvas.
   */
  const loadAccounts = async () => {
    // @ts-ignore
    const savedAccounts = await window.electronAPI.loadAccounts();
    setAccounts(savedAccounts);
  };

  /**
   * Cria uma nova aba isolada.
   */
  const createNewTab = async (url = 'https://www.google.com') => {
    const id = Math.random().toString(36).substring(7);
    // @ts-ignore
    const partition = await window.electronAPI.getTabPartition(id);
    
    const newTab: Tab = {
      id,
      title: 'Nova Aba',
      url,
      partition,
      isActive: true
    };

    setTabs((prev: Tab[]) => prev.map((t: Tab) => ({ ...t, isActive: false })).concat(newTab));
    setActiveTabId(id);
    setUrlInput(url);
  };

  /**
   * Fecha uma aba.
   */
  const closeTab = (id: string) => {
    setTabs((prev: Tab[]) => {
      const filtered = prev.filter((t: Tab) => t.id !== id);
      if (filtered.length > 0 && id === activeTabId) {
        const last = filtered[filtered.length - 1];
        setActiveTabId(last.id);
        last.isActive = true;
      }
      return filtered;
    });
  };

  /**
   * Navega para uma URL.
   */
  const navigate = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    let targetUrl = urlInput;
    if (!targetUrl.startsWith('http')) targetUrl = `https://${targetUrl}`;
    
    setTabs((prev: Tab[]) => prev.map((t: Tab) => t.id === activeTabId ? { ...t, url: targetUrl } : t));
  };

  /**
   * Remove uma conta salva.
   */
  const deleteAccount = async (id: string) => {
    try {
      // @ts-ignore
      const result = await window.electronAPI.deleteAccount(id);
      if (result.success) {
        loadAccounts();
      }
    } catch (err) {
      console.error('Erro ao remover conta:', err);
    }
  };

  /**
   * Adiciona uma conta manualmente (para demonstração).
   */
  const addAccount = async () => {
    const name = prompt('Nome da conta:');
    const email = prompt('E-mail da conta:');
    if (!name || !email) return;

    const newAccount: Account = {
      id: Math.random().toString(36).substring(7),
      name,
      email,
      autoLogin: true
    };

    try {
      // @ts-ignore
      const result = await window.electronAPI.saveCredentials(newAccount);
      if (result.success) {
        loadAccounts();
      }
    } catch (err) {
      console.error('Erro ao salvar conta:', err);
    }
  };

  /**
   * Exporta as contas criptografadas para um arquivo JSON.
   */
  const handleExport = async () => {
    try {
      // @ts-ignore
      const result = await window.electronAPI.exportBackup();
      if (result.success) {
        alert('Backup exportado com sucesso!');
      }
    } catch (err) {
      alert('Erro ao exportar backup.');
    }
  };

  /**
   * Importa contas de um arquivo JSON.
   */
  const handleImport = async () => {
    try {
      // @ts-ignore
      const result = await window.electronAPI.importBackup();
      if (result.success) {
        alert('Contas importadas com sucesso!');
        loadAccounts();
      } else if (result.error) {
        alert(`Erro: ${result.error}`);
      }
    } catch (err) {
      alert('Erro ao importar backup.');
    }
  };

  // --- UI Components ---

  if (isFirstRun === null) {
    return <div className="min-h-screen bg-neutral-900" />;
  }

  if (isFirstRun && !isUnlocked) {
    return (
      <div className="min-h-screen bg-neutral-900 flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-neutral-800 p-8 rounded-3xl shadow-2xl w-full max-w-lg border border-neutral-700"
        >
          <div className="flex justify-center mb-6">
            <div className="bg-emerald-500/10 p-4 rounded-full">
              <Key className="w-12 h-12 text-emerald-500" />
            </div>
          </div>
          
          <h1 className="text-3xl font-bold text-white text-center mb-2">Bem-vindo!</h1>
          <p className="text-neutral-400 text-center mb-8">
            Este é o seu primeiro acesso. Configure uma <span className="text-white font-semibold">Senha Mestre</span> para proteger seus dados e sessões.
          </p>
          
          <div className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-xl mb-8 flex gap-3">
            <ShieldAlert className="w-6 h-6 text-amber-500 shrink-0" />
            <p className="text-xs text-amber-200/80 leading-relaxed">
              <span className="text-amber-500 font-bold">Aviso Importante:</span> Esta senha é usada para criptografar seus dados localmente. Se você a perder, não será possível recuperar suas contas salvas.
            </p>
          </div>
          
          <form onSubmit={handleSetup} className="space-y-6">
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-2">Nova Senha Mestre</label>
                <div className="relative">
                  <input 
                    type="password" 
                    value={masterPassword}
                    onChange={(e) => setMasterPassword(e.target.value)}
                    className="w-full bg-neutral-900 border border-neutral-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
                    placeholder="Mínimo 6 caracteres"
                    autoFocus
                  />
                  <Lock className="absolute right-4 top-3.5 w-5 h-5 text-neutral-600" />
                </div>
              </div>
              
              <div>
                <label className="block text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-2">Confirmar Senha</label>
                <div className="relative">
                  <input 
                    type="password" 
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full bg-neutral-900 border border-neutral-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
                    placeholder="Repita a senha"
                  />
                  <ShieldCheck className="absolute right-4 top-3.5 w-5 h-5 text-neutral-600" />
                </div>
              </div>
            </div>
            
            {error && <p className="text-red-400 text-sm text-center font-medium">{error}</p>}
            
            <button 
              type="submit"
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-4 rounded-xl transition-all shadow-lg shadow-emerald-900/20 flex items-center justify-center gap-2 text-lg"
            >
              Criar Cofre Seguro
            </button>
          </form>
        </motion.div>
      </div>
    );
  }

  if (!isUnlocked) {
    return (
      <div className="min-h-screen bg-neutral-900 flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-neutral-800 p-8 rounded-2xl shadow-2xl w-full max-w-md border border-neutral-700"
        >
          <div className="flex justify-center mb-6">
            <div className="bg-emerald-500/10 p-4 rounded-full">
              <ShieldCheck className="w-12 h-12 text-emerald-500" />
            </div>
          </div>
          
          <h1 className="text-2xl font-bold text-white text-center mb-2">Multi Account Browser</h1>
          <p className="text-neutral-400 text-center mb-8">Insira sua senha mestre para desbloquear suas sessões seguras.</p>
          
          <form onSubmit={handleUnlock} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-2">Senha Mestre</label>
              <div className="relative">
                <input 
                  type="password" 
                  value={masterPassword}
                  onChange={(e) => setMasterPassword(e.target.value)}
                  className="w-full bg-neutral-900 border border-neutral-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
                  placeholder="••••••••••••"
                  autoFocus
                />
                <Lock className="absolute right-4 top-3.5 w-5 h-5 text-neutral-600" />
              </div>
            </div>
            
            {error && <p className="text-red-400 text-sm text-center">{error}</p>}
            
            <button 
              type="submit"
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-xl transition-all shadow-lg shadow-emerald-900/20 flex items-center justify-center gap-2"
            >
              <Unlock className="w-5 h-5" />
              Desbloquear Navegador
            </button>
          </form>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-neutral-950 flex flex-col text-neutral-200 overflow-hidden">
      {/* Tab Bar */}
      <div className="bg-neutral-900 flex items-center px-4 pt-2 gap-1 border-b border-neutral-800">
        <div className="flex-1 flex items-center gap-1 overflow-x-auto no-scrollbar">
          {tabs.map((tab: Tab) => (
            <div 
              key={tab.id}
              onClick={() => setActiveTabId(tab.id)}
              className={`
                group relative flex items-center gap-2 px-4 py-2 rounded-t-lg cursor-pointer transition-all min-w-[120px] max-w-[200px]
                ${tab.id === activeTabId ? 'bg-neutral-800 text-white' : 'hover:bg-neutral-800/50 text-neutral-500'}
              `}
            >
              <Globe className={`w-4 h-4 ${tab.id === activeTabId ? 'text-emerald-500' : 'text-neutral-600'}`} />
              <span className="text-xs font-medium truncate flex-1">{tab.title}</span>
              <button 
                onClick={(e: React.MouseEvent) => { e.stopPropagation(); closeTab(tab.id); }}
                className="opacity-0 group-hover:opacity-100 hover:bg-neutral-700 p-0.5 rounded transition-all"
              >
                <X className="w-3 h-3" />
              </button>
              {tab.id === activeTabId && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-500" />
              )}
            </div>
          ))}
          <button 
            onClick={() => createNewTab()}
            className="p-2 hover:bg-neutral-800 rounded-lg text-neutral-500 transition-all"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
        
        <div className="flex items-center gap-2 pb-2">
          <button 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className={`p-2 rounded-lg transition-all ${isSidebarOpen ? 'bg-emerald-500/10 text-emerald-500' : 'text-neutral-500 hover:bg-neutral-800'}`}
          >
            <Users className="w-4 h-4" />
          </button>
          <button 
            onClick={() => setIsSettingsOpen(!isSettingsOpen)}
            className={`p-2 rounded-lg transition-all ${isSettingsOpen ? 'bg-emerald-500/10 text-emerald-500' : 'text-neutral-500 hover:bg-neutral-800'}`}
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Navigation Bar */}
      <div className="bg-neutral-800 p-2 flex items-center gap-3 border-b border-neutral-900">
        <div className="flex items-center gap-1">
          <button className="p-2 hover:bg-neutral-700 rounded-lg text-neutral-400 transition-all"><ChevronLeft className="w-4 h-4" /></button>
          <button className="p-2 hover:bg-neutral-700 rounded-lg text-neutral-400 transition-all"><ChevronRight className="w-4 h-4" /></button>
          <button className="p-2 hover:bg-neutral-700 rounded-lg text-neutral-400 transition-all"><RotateCw className="w-4 h-4" /></button>
        </div>
        
        <form onSubmit={navigate} className="flex-1">
          <div className="relative group">
            <input 
              type="text" 
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-4 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-all"
            />
            <div className="absolute right-3 top-2 flex items-center gap-2">
              <ShieldCheck className="w-3 h-3 text-emerald-500 opacity-50" />
            </div>
          </div>
        </form>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar: Accounts */}
        <AnimatePresence>
          {isSidebarOpen && (
            <motion.div 
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 280, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              className="bg-neutral-900 border-r border-neutral-800 flex flex-col"
            >
              <div className="p-4 border-b border-neutral-800 flex justify-between items-center">
                <h2 className="font-bold text-sm uppercase tracking-widest text-neutral-500">Contas Salvas</h2>
                <button 
                  onClick={addAccount}
                  className="text-emerald-500 hover:text-emerald-400 p-1 hover:bg-neutral-800 rounded transition-all"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              
              <div className="flex-1 overflow-y-auto p-2 space-y-1">
                {accounts.length === 0 ? (
                  <div className="p-8 text-center">
                    <Users className="w-12 h-12 text-neutral-800 mx-auto mb-4" />
                    <p className="text-xs text-neutral-600 italic">Nenhuma conta salva ainda. Adicione uma conta para começar.</p>
                  </div>
                ) : (
                  accounts.map((acc: Account) => (
                    <div 
                      key={acc.id} 
                      onClick={() => createNewTab()}
                      className="group p-3 hover:bg-neutral-800 rounded-xl transition-all cursor-pointer border border-transparent hover:border-neutral-700"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-emerald-500/20 rounded-full flex items-center justify-center text-emerald-500 font-bold text-xs">
                          {acc.name[0]}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{acc.name}</p>
                          <p className="text-xs text-neutral-500 truncate">{acc.email}</p>
                        </div>
                        <div className="flex items-center gap-1">
                          <button 
                            onClick={(e) => { e.stopPropagation(); createNewTab(); }}
                            className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-neutral-700 rounded-lg text-neutral-500 transition-all"
                            title="Abrir em nova aba"
                          >
                            <ExternalLink className="w-3 h-3" />
                          </button>
                          <button 
                            onClick={(e) => { e.stopPropagation(); deleteAccount(acc.id); }}
                            className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-red-500/20 rounded-lg text-neutral-500 hover:text-red-400 transition-all"
                            title="Remover conta"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
              
              <div className="p-4 bg-neutral-950/50 border-t border-neutral-800">
                <div className="flex items-center gap-2 text-xs text-neutral-500">
                  <ShieldCheck className="w-3 h-3 text-emerald-500" />
                  <span>Sessões Isoladas Ativas</span>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Browser View Area */}
        <div className="flex-1 bg-white relative">
          {tabs.map((tab: Tab) => (
            <div 
              key={tab.id}
              className={`absolute inset-0 transition-opacity duration-200 ${tab.id === activeTabId ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'}`}
            >
              {/* No Electron real, usaríamos a tag <webview> */}
              {/* Aqui simulamos com um iframe para demonstração visual */}
              <iframe 
                src={tab.url}
                className="w-full h-full border-none"
                title={tab.title}
              />
              
              {/* Overlay informativo sobre isolamento */}
              <div className="absolute bottom-4 right-4 bg-neutral-900/90 backdrop-blur border border-neutral-700 px-3 py-1.5 rounded-full flex items-center gap-2 shadow-xl pointer-events-none">
                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                <span className="text-[10px] font-mono text-neutral-400 uppercase tracking-tighter">Session: {tab.partition}</span>
              </div>
            </div>
          ))}
          
          {tabs.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center bg-neutral-950 text-neutral-500">
              <Globe className="w-16 h-16 mb-4 opacity-20" />
              <p>Abra uma nova aba para começar a navegar.</p>
              <button 
                onClick={() => createNewTab()}
                className="mt-4 bg-neutral-800 hover:bg-neutral-700 px-6 py-2 rounded-xl transition-all"
              >
                Nova Aba
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Settings Modal */}
      <AnimatePresence>
        {isSettingsOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsSettingsOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-neutral-900 border border-neutral-800 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden relative z-10"
            >
              <div className="p-6 border-b border-neutral-800 flex justify-between items-center">
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <Settings className="w-5 h-5 text-emerald-500" />
                  Configurações do Navegador
                </h2>
                <button onClick={() => setIsSettingsOpen(false)} className="p-2 hover:bg-neutral-800 rounded-full transition-all">
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="p-6 space-y-8">
                <section>
                  <h3 className="text-xs font-bold text-neutral-500 uppercase tracking-widest mb-4">Segurança e Privacidade</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-neutral-800/50 rounded-xl border border-neutral-800">
                      <div>
                        <p className="font-medium">Salvar senhas automaticamente</p>
                        <p className="text-xs text-neutral-500">Detecta logins e solicita salvamento criptografado.</p>
                      </div>
                      <button 
                        onClick={() => setAutoSave(!autoSave)}
                        className={`w-12 h-6 rounded-full transition-all relative ${autoSave ? 'bg-emerald-600' : 'bg-neutral-700'}`}
                      >
                        <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${autoSave ? 'left-7' : 'left-1'}`} />
                      </button>
                    </div>
                    
                    <div className="flex items-center justify-between p-4 bg-neutral-800/50 rounded-xl border border-neutral-800">
                      <div>
                        <p className="font-medium">Isolamento de Sessão</p>
                        <p className="text-xs text-neutral-500">Cada aba utiliza um container de cookies único.</p>
                      </div>
                      <span className="text-[10px] bg-emerald-500/10 text-emerald-500 px-2 py-1 rounded font-bold uppercase">Sempre Ativo</span>
                    </div>
                  </div>
                </section>

                <section>
                  <h3 className="text-xs font-bold text-neutral-500 uppercase tracking-widest mb-4">Dados</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <button 
                      onClick={handleImport}
                      className="flex items-center justify-center gap-2 p-3 bg-neutral-800 hover:bg-neutral-700 rounded-xl transition-all border border-neutral-700"
                    >
                      Importar JSON
                    </button>
                    <button 
                      onClick={handleExport}
                      className="flex items-center justify-center gap-2 p-3 bg-neutral-800 hover:bg-neutral-700 rounded-xl transition-all border border-neutral-700"
                    >
                      Exportar Backup
                    </button>
                  </div>
                </section>
              </div>
              
              <div className="p-6 bg-neutral-950/50 flex justify-end gap-3">
                <button 
                  onClick={() => setIsSettingsOpen(false)}
                  className="px-6 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl transition-all"
                >
                  Salvar Alterações
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
