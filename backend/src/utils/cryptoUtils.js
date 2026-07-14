/**
 * cryptoUtils.js — AES-256-GCM Envelope Encryption Utility
 *
 * Implements the field-level encryption layer for BYOK API keys stored in MongoDB.
 * Uses AES-256-GCM (AEAD) so both confidentiality and integrity are guaranteed.
 *
 * Key format stored in DB:  iv:authTag:encryptedText  (all hex-encoded)
 * Root secret:              process.env.DB_ENCRYPTION_KEY (must be exactly 32 bytes / 64 hex chars)
 */
import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // 96-bit IV — GCM standard

/**
 * Validates the DB_ENCRYPTION_KEY at call-time (not module-load-time) so that
 * unit tests that don't touch encryption can still import other utilities.
 */
function getEncryptionKey() {
  const rawKey = process.env.DB_ENCRYPTION_KEY || '';

  // Accept either raw 32-byte string or 64-char hex string
  if (rawKey.length === 64 && /^[0-9a-fA-F]+$/.test(rawKey)) {
    return Buffer.from(rawKey, 'hex');
  }
  if (rawKey.length === 32) {
    return Buffer.from(rawKey, 'utf8');
  }

  throw new Error(
    'DB_ENCRYPTION_KEY is invalid or missing. Must be a 32-byte UTF-8 string or a 64-char hex string. ' +
    'Generate one with: node -e "require(\'crypto\').randomBytes(32).toString(\'hex\')"'
  );
}

/**
 * Encrypts a plaintext string (e.g., an API key) using AES-256-GCM.
 * Returns a compact `iv:authTag:ciphertext` string safe to store in MongoDB.
 *
 * @param {string} text — The plaintext string to encrypt
 * @returns {string|null} — Encrypted payload string, or null if input is falsy
 */
export function encryptKey(text) {
  if (!text) return null;

  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const authTag = cipher.getAuthTag().toString('hex');

  // Compact wire format: iv:authTag:encryptedHex
  return `${iv.toString('hex')}:${authTag}:${encrypted}`;
}

/**
 * Decrypts an AES-256-GCM encrypted payload previously created by encryptKey().
 * GCM authentication tag is verified automatically — if tampered, this throws.
 *
 * @param {string} encryptedData — The `iv:authTag:ciphertext` string from MongoDB
 * @returns {string|null} — The original plaintext string, or null if input is falsy
 */
export function decryptKey(encryptedData) {
  if (!encryptedData) return null;

  // Gracefully handle legacy plain-text values (pre-encryption migration)
  // A valid encrypted payload always contains exactly 2 colons
  const colonCount = (encryptedData.match(/:/g) || []).length;
  if (colonCount !== 2) {
    // Not in our encrypted format — return as-is so existing data keeps working
    // during the transition period
    return encryptedData;
  }

  const [ivHex, authTagHex, encryptedHex] = encryptedData.split(':');
  if (!ivHex || !authTagHex || !encryptedHex) {
    throw new Error('Malformed encrypted data: expected iv:authTag:ciphertext format.');
  }

  const key = getEncryptionKey();
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}
