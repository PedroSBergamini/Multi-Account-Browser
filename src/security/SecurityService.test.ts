/**
 * @vitest-environment node
 */
import { describe, it, expect } from 'vitest';
import { SecurityService } from './SecurityService';

describe('SecurityService', () => {
  const security = SecurityService.getInstance();
  const password = 'master-password-123';
  const secretData = 'my-secret-data';

  it('should encrypt and decrypt data correctly', async () => {
    const encrypted = await security.encrypt(secretData, password);
    
    expect(encrypted).toHaveProperty('salt');
    expect(encrypted).toHaveProperty('iv');
    expect(encrypted).toHaveProperty('encryptedData');
    expect(encrypted).toHaveProperty('authTag');
    
    const decrypted = await security.decrypt(encrypted, password);
    expect(decrypted).toBe(secretData);
  });

  it('should fail to decrypt with wrong password', async () => {
    const encrypted = await security.encrypt(secretData, password);
    
    await expect(security.decrypt(encrypted, 'wrong-password'))
      .rejects.toThrow();
  });

  it('should generate different salts and IVs for same data', async () => {
    const enc1 = await security.encrypt(secretData, password);
    const enc2 = await security.encrypt(secretData, password);
    
    expect(enc1.salt).not.toBe(enc2.salt);
    expect(enc1.iv).not.toBe(enc2.iv);
    expect(enc1.encryptedData).not.toBe(enc2.encryptedData);
  });
});
