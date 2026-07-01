import crypto from 'crypto';
import { env } from '../config/env';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // 12 bytes standard for GCM

/**
 * Encrypts a string using AES-256-GCM.
 * Returns format "ivHex:authTagHex:ciphertextHex".
 */
export function encrypt(text: string): string {
  const key = Buffer.from(env.ENCRYPTION_KEY, 'hex');
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const authTag = cipher.getAuthTag().toString('hex');
  
  return `${iv.toString('hex')}:${authTag}:${encrypted}`;
}

/**
 * Decrypts a string formatted as "ivHex:authTagHex:ciphertextHex" using AES-256-GCM.
 */
export function decrypt(encryptedData: string): string {
  const key = Buffer.from(env.ENCRYPTION_KEY, 'hex');
  const parts = encryptedData.split(':');
  
  if (parts.length !== 3) {
    throw new Error('Invalid encrypted data format. Expected "iv:authTag:ciphertext"');
  }
  
  const [ivHex, authTagHex, encryptedHex] = parts;
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');
  const encryptedText = Buffer.from(encryptedHex, 'hex');
  
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  
  let decrypted = decipher.update(encryptedText, undefined, 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}
