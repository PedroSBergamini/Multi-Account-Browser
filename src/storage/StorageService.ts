import fs from 'node:fs/promises';
import path from 'node:path';
import { app } from 'electron';

/**
 * StorageService - Gerencia o salvamento e carregamento de dados criptografados.
 */
export class StorageService {
  private readonly STORAGE_PATH: string;

  constructor() {
    // No Electron, usamos o userData para salvar arquivos persistentes
    this.STORAGE_PATH = path.join(app.getPath('userData'), 'credentials.enc');
  }

  /**
   * Salva os dados criptografados no arquivo.
   */
  public async save(data: any): Promise<void> {
    const json = JSON.stringify(data);
    await fs.writeFile(this.STORAGE_PATH, json, 'utf8');
  }

  /**
   * Carrega os dados do arquivo.
   */
  public async load(): Promise<any | null> {
    try {
      const content = await fs.readFile(this.STORAGE_PATH, 'utf8');
      return JSON.parse(content);
    } catch (error) {
      return null;
    }
  }

  /**
   * Verifica se o arquivo de credenciais existe.
   */
  public async exists(): Promise<boolean> {
    try {
      await fs.access(this.STORAGE_PATH);
      return true;
    } catch {
      return false;
    }
  }
}
