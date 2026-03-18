import crypto from 'node:crypto';

/**
 * SecurityService - Singleton para operações criptográficas seguras.
 * Implementa AES-256-GCM com PBKDF2 para derivação de chave.
 */
export class SecurityService {
  private static instance: SecurityService;
  private readonly ALGORITHM = 'aes-256-gcm';
  private readonly KEY_LENGTH = 32; // 256 bits
  private readonly IV_LENGTH = 12;  // Recomendado para GCM
  private readonly SALT_LENGTH = 16;
  private readonly ITERATIONS = 100000;

  private constructor() {}

  public static getInstance(): SecurityService {
    if (!SecurityService.instance) {
      SecurityService.instance = new SecurityService();
    }
    return SecurityService.instance;
  }

  /**
   * Deriva uma chave criptográfica a partir de uma senha mestre e um salt.
   */
  public async deriveKey(password: string, salt: Buffer): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      crypto.pbkdf2(password, salt, this.ITERATIONS, this.KEY_LENGTH, 'sha256', (err, key) => {
        if (err) reject(err);
        resolve(key);
      });
    });
  }

  /**
   * Criptografa dados usando a senha mestre.
   */
  public async encrypt(data: string, masterPassword: string): Promise<{ salt: string; iv: string; encryptedData: string; authTag: string }> {
    const salt = crypto.randomBytes(this.SALT_LENGTH);
    const iv = crypto.randomBytes(this.IV_LENGTH);
    const key = await this.deriveKey(masterPassword, salt);

    const cipher = crypto.createCipheriv(this.ALGORITHM, key, iv) as crypto.CipherGCM;
    let encryptedData = cipher.update(data, 'utf8', 'hex');
    encryptedData += cipher.final('hex');
    const authTag = cipher.getAuthTag().toString('hex');

    return {
      salt: salt.toString('hex'),
      iv: iv.toString('hex'),
      encryptedData,
      authTag
    };
  }

  /**
   * Descriptografa dados usando a senha mestre.
   */
  public async decrypt(encryptedObj: { salt: string; iv: string; encryptedData: string; authTag: string }, masterPassword: string): Promise<string> {
    const salt = Buffer.from(encryptedObj.salt, 'hex');
    const iv = Buffer.from(encryptedObj.iv, 'hex');
    const authTag = Buffer.from(encryptedObj.authTag, 'hex');
    const key = await this.deriveKey(masterPassword, salt);

    const decipher = crypto.createDecipheriv(this.ALGORITHM, key, iv) as crypto.DecipherGCM;
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encryptedObj.encryptedData, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }
}
