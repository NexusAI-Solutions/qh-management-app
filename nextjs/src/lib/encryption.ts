import crypto from 'crypto';

const algorithm = 'aes-256-cbc';
const key = Buffer.from(process.env.ENCRYPTION_KEY!, 'hex'); // 32 bytes key
const iv = Buffer.from(process.env.ENCRYPTION_IV!, 'hex');  // 16 bytes IV

export const encryption = {
  encrypt(data: string): string {
    const cipher = crypto.createCipheriv(algorithm, key, iv);
    const encrypted = Buffer.concat([
      cipher.update(data, 'utf8'), // Remove JSON.stringify here
      cipher.final()
    ]);
    return encrypted.toString('base64');
  },

  decrypt(encryptedData: string): string | null {
    try {
      const decipher = crypto.createDecipheriv(algorithm, key, iv);
      const decrypted = Buffer.concat([
        decipher.update(Buffer.from(encryptedData, 'base64')),
        decipher.final()
      ]);
      return decrypted.toString('utf8'); // Return string, not parsed JSON
    } catch (error) {
      console.error('Decryption failed:', error);
      return null;
    }
  }
};
