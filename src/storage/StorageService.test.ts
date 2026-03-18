/**
 * @vitest-environment node
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { StorageService } from './StorageService';
import fs from 'node:fs/promises';

// Mock electron
vi.mock('electron', () => ({
  app: {
    getPath: vi.fn().mockReturnValue('/tmp/user-data'),
  },
}));

// Mock fs/promises
vi.mock('node:fs/promises', () => ({
  default: {
    writeFile: vi.fn().mockResolvedValue(undefined),
    readFile: vi.fn(),
    access: vi.fn(),
  },
}));

describe('StorageService', () => {
  let storage: StorageService;

  beforeEach(() => {
    vi.clearAllMocks();
    storage = new StorageService();
  });

  it('should save data correctly', async () => {
    const data = { test: 'data' };
    await storage.save(data);
    
    expect(fs.writeFile).toHaveBeenCalledWith(
      expect.stringContaining('credentials.enc'),
      JSON.stringify(data),
      'utf8'
    );
  });

  it('should load data correctly', async () => {
    const data = { test: 'data' };
    (fs.readFile as any).mockResolvedValue(JSON.stringify(data));
    
    const loaded = await storage.load();
    expect(loaded).toEqual(data);
    expect(fs.readFile).toHaveBeenCalled();
  });

  it('should return null if file does not exist', async () => {
    (fs.readFile as any).mockRejectedValue(new Error('File not found'));
    
    const loaded = await storage.load();
    expect(loaded).toBeNull();
  });

  it('should check if file exists', async () => {
    (fs.access as any).mockResolvedValue(undefined);
    const exists = await storage.exists();
    expect(exists).toBe(true);
    
    (fs.access as any).mockRejectedValue(new Error('Not found'));
    const notExists = await storage.exists();
    expect(notExists).toBe(false);
  });
});
