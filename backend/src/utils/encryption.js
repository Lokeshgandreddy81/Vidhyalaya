import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const TAG_LENGTH = 16;
const ENCODING = 'hex';

/**
 * Server-side AES-256-GCM encryption for sensitive fields (API keys, secrets).
 * 
 * Uses ENCRYPTION_KEY env var (32-byte hex string = 64 hex chars).
 * Falls back to a key derived from JWT_SECRET if ENCRYPTION_KEY is not set.
 * 
 * Encrypted format: iv:authTag:ciphertext (all hex)
 */

function getEncryptionKey() {
  if (process.env.ENCRYPTION_KEY) {
    const key = Buffer.from(process.env.ENCRYPTION_KEY, 'hex');
    if (key.length !== 32) {
      throw new Error('ENCRYPTION_KEY must be exactly 32 bytes (64 hex characters)');
    }
    return key;
  }

  // Derive a deterministic 32-byte key from JWT_SECRET
  if (!process.env.JWT_SECRET) {
    throw new Error('Neither ENCRYPTION_KEY nor JWT_SECRET is set');
  }
  return crypto.createHash('sha256').update(process.env.JWT_SECRET).digest();
}

/**
 * Encrypt a plaintext string using AES-256-GCM.
 * @param {string} plaintext - The string to encrypt
 * @returns {string} Encrypted string in format iv:authTag:ciphertext
 */
export function encrypt(plaintext) {
  if (!plaintext || typeof plaintext !== 'string') return plaintext;

  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(plaintext, 'utf8', ENCODING);
  encrypted += cipher.final(ENCODING);

  const authTag = cipher.getAuthTag().toString(ENCODING);

  return `${iv.toString(ENCODING)}:${authTag}:${encrypted}`;
}

/**
 * Decrypt an AES-256-GCM encrypted string.
 * @param {string} encryptedText - Encrypted string in format iv:authTag:ciphertext
 * @returns {string} Decrypted plaintext
 */
export function decrypt(encryptedText) {
  if (!encryptedText || typeof encryptedText !== 'string') return encryptedText;

  // If it doesn't look encrypted (no colons), return as-is (backward compat for existing plaintext keys)
  if (!encryptedText.includes(':')) return encryptedText;

  const parts = encryptedText.split(':');
  if (parts.length !== 3) return encryptedText; // Not our format, return as-is

  const key = getEncryptionKey();
  const [ivHex, authTagHex, ciphertext] = parts;

  try {
    const iv = Buffer.from(ivHex, ENCODING);
    const authTag = Buffer.from(authTagHex, ENCODING);
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(ciphertext, ENCODING, 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  } catch (err) {
    // If decryption fails, the data might be plaintext (migration period)
    return encryptedText;
  }
}

/**
 * Check if a string appears to be encrypted in our format.
 * @param {string} text
 * @returns {boolean}
 */
export function isEncrypted(text) {
  if (!text || typeof text !== 'string') return false;
  const parts = text.split(':');
  return parts.length === 3 && parts[0].length === IV_LENGTH * 2 && parts[1].length === TAG_LENGTH * 2;
}
