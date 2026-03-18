import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import App from './App';

// Mock electronAPI
const mockElectronAPI = {
  unlockApp: vi.fn(),
  loadAccounts: vi.fn(),
  getTabPartition: vi.fn(),
  exportBackup: vi.fn(),
  importBackup: vi.fn(),
  deleteAccount: vi.fn(),
  saveCredentials: vi.fn(),
  isFirstRun: vi.fn().mockResolvedValue(false),
};

// @ts-ignore
window.electronAPI = mockElectronAPI;

describe('App Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render the unlock screen initially', async () => {
    render(<App />);
    expect(await screen.findByText('Multi Account Browser')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('••••••••••••')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Desbloquear Navegador/i })).toBeInTheDocument();
  });

  it('should show the setup screen on first run', async () => {
    mockElectronAPI.isFirstRun.mockResolvedValueOnce(true);
    render(<App />);
    expect(await screen.findByText('Bem-vindo!')).toBeInTheDocument();
    expect(screen.getByText(/Este é o seu primeiro acesso/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Mínimo 6 caracteres/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Repita a senha/i)).toBeInTheDocument();
    expect(screen.getByText(/Criar Cofre Seguro/i)).toBeInTheDocument();
  });

  it('should show error message on failed unlock', async () => {
    mockElectronAPI.unlockApp.mockResolvedValue({ success: false, error: 'Senha incorreta.' });
    
    render(<App />);
    
    const input = await screen.findByPlaceholderText('••••••••••••');
    const button = screen.getByRole('button', { name: /Desbloquear Navegador/i });
    
    fireEvent.change(input, { target: { value: 'wrong-password' } });
    fireEvent.click(button);
    
    await waitFor(() => {
      expect(screen.getByText('Senha incorreta.')).toBeInTheDocument();
    });
  });

  it('should unlock and show the browser on successful unlock', async () => {
    mockElectronAPI.unlockApp.mockResolvedValue({ success: true });
    mockElectronAPI.loadAccounts.mockResolvedValue([]);
    mockElectronAPI.getTabPartition.mockResolvedValue('persist:tab_123');
    
    render(<App />);
    
    const input = await screen.findByPlaceholderText('••••••••••••');
    const button = screen.getByRole('button', { name: /Desbloquear Navegador/i });
    
    fireEvent.change(input, { target: { value: 'correct-password' } });
    fireEvent.click(button);
    
    await waitFor(() => {
      // Check if sidebar or tab bar is visible
      expect(screen.getByText('Contas Salvas')).toBeInTheDocument();
      expect(screen.getByText('Nova Aba')).toBeInTheDocument();
    });
  });

  it('should create a new tab when clicking the plus button', async () => {
    mockElectronAPI.unlockApp.mockResolvedValue({ success: true });
    mockElectronAPI.loadAccounts.mockResolvedValue([]);
    mockElectronAPI.getTabPartition.mockResolvedValue('persist:tab_new');
    
    render(<App />);
    
    // Unlock first
    fireEvent.change(await screen.findByPlaceholderText('••••••••••••'), { target: { value: 'password' } });
    fireEvent.click(screen.getByRole('button', { name: /Desbloquear Navegador/i }));
    
    await waitFor(() => expect(screen.getByText('Nova Aba')).toBeInTheDocument());
    
    // Click plus button
    const plusButton = screen.getAllByRole('button').find(b => b.querySelector('svg.lucide-plus'));
    if (plusButton) fireEvent.click(plusButton);
    
    await waitFor(() => {
      const tabs = screen.getAllByText('Nova Aba');
      expect(tabs.length).toBeGreaterThan(1);
    });
  });

  it('should navigate to a new URL when submitting the address bar', async () => {
    mockElectronAPI.unlockApp.mockResolvedValue({ success: true });
    mockElectronAPI.loadAccounts.mockResolvedValue([]);
    mockElectronAPI.getTabPartition.mockResolvedValue('persist:tab_123');
    
    render(<App />);
    
    // Unlock first
    fireEvent.change(await screen.findByPlaceholderText('••••••••••••'), { target: { value: 'password' } });
    fireEvent.click(screen.getByRole('button', { name: /Desbloquear Navegador/i }));
    
    await waitFor(() => expect(screen.getByText('Nova Aba')).toBeInTheDocument());
    
    const urlInput = screen.getByDisplayValue('https://www.google.com');
    fireEvent.change(urlInput, { target: { value: 'https://www.github.com' } });
    fireEvent.submit(urlInput.closest('form')!);
    
    await waitFor(() => {
      expect(screen.getByDisplayValue('https://www.github.com')).toBeInTheDocument();
    });
  });
});
