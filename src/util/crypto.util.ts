import * as crypto from 'crypto';

export class Crypto {
  private algorithm = 'aes-256-cbc';
  private key: Buffer;
  private iv: Buffer;

  constructor() {
    const keyBase64 = process.env.CRYPTO_KEY;
    const ivBase64 = process.env.CRYPTO_IV;

    if (!keyBase64 || !ivBase64) {
      throw new Error('Missing encryption key or IV');
    }

    this.key = Buffer.from(keyBase64, 'base64');
    this.iv = Buffer.from(ivBase64, 'base64');
  }

  encrypt(text: string): string {
    try {
      const cipher = crypto.createCipheriv(this.algorithm, this.key, this.iv);
      let encrypted = cipher.update(text, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      return encrypted;
    } catch (error) {
      console.error('Encryption error:', error);
      return text;
    }
  }

  decrypt(encryptedText: string): string {
    try {
      const decipher = crypto.createDecipheriv(
        this.algorithm,
        this.key,
        this.iv,
      );
      let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      return decrypted;
    } catch (error) {
      console.error('Decryption error:', error);
      return encryptedText;
    }
  }
}
