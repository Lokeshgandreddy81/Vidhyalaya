import mongoose from 'mongoose';
import { encryptKey, decryptKey } from '../utils/cryptoUtils.js';

/**
 * UserLearningState — Persisted learning context and BYOK configuration.
 *
 * SECURITY: byokConfig.apiKey is encrypted at rest using AES-256-GCM via
 * Mongoose schema-level getters/setters. The plaintext key is never written
 * to MongoDB; only the `iv:authTag:ciphertext` payload is stored.
 *
 * The schema setter encrypts on write; the getter decrypts on read.
 * Both require process.env.DB_ENCRYPTION_KEY (32-byte root secret).
 */

/**
 * Safely encrypt a raw byokConfig object's apiKey field before MongoDB write.
 * Returns the config object with apiKey replaced by its encrypted form.
 */
function encryptByokConfig(val) {
  if (!val) return val;

  // Handle both plain objects and Mongoose Map instances
  const config = val instanceof Map ? Object.fromEntries(val) : { ...val };

  if (config.apiKey && typeof config.apiKey === 'string') {
    // Only encrypt if not already in our encrypted format (idempotent)
    const colonCount = (config.apiKey.match(/:/g) || []).length;
    if (colonCount !== 2) {
      try {
        config.apiKey = encryptKey(config.apiKey);
      } catch (err) {
        // If DB_ENCRYPTION_KEY is missing, log and skip (don't crash on startup)
        console.error('[UserLearningState] Failed to encrypt byokConfig.apiKey:', err.message);
      }
    }
  }

  return config;
}

/**
 * Safely decrypt a stored byokConfig object's apiKey field after MongoDB read.
 * Returns the config object with apiKey replaced by its plaintext form.
 */
function decryptByokConfig(val) {
  if (!val) return val;

  const config = val instanceof Map ? Object.fromEntries(val) : { ...val };

  if (config.apiKey && typeof config.apiKey === 'string') {
    try {
      config.apiKey = decryptKey(config.apiKey);
    } catch (err) {
      // If decryption fails (e.g., key rotation or corruption), return null apiKey
      // so the user is prompted to re-enter rather than getting a corrupted key
      console.error('[UserLearningState] Failed to decrypt byokConfig.apiKey — may require re-entry:', err.message);
      config.apiKey = null;
    }
  }

  return config;
}

const userLearningStateSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true, index: true },
  skills: { type: mongoose.Schema.Types.Mixed, default: {} },
  memory: { type: mongoose.Schema.Types.Mixed, default: {} },
  activeMission: { type: mongoose.Schema.Types.Mixed, default: null },
  activeScenario: { type: mongoose.Schema.Types.Mixed, default: null },

  /**
   * byokConfig — Encrypted at rest via AES-256-GCM.
   * Stored format: { provider, apiKey: "iv:authTag:cipher", preferredModel?, customEndpoint? }
   * Retrieved format: { provider, apiKey: "<plaintext>", preferredModel?, customEndpoint? }
   */
  byokConfig: {
    type: mongoose.Schema.Types.Mixed,
    default: null,
    set: encryptByokConfig,
    get: decryptByokConfig,
  },

  byokMode: { type: String, enum: ['auto', 'custom'], default: 'auto' },
  isFirstLogin: { type: Boolean, default: true },
  expiresAt: { type: Date, default: null, index: { expires: 0 } },
}, {
  timestamps: true,
  // Enable getters for both toJSON and toObject so encryption is transparent
  toJSON: { getters: true },
  toObject: { getters: true },
});

export default mongoose.model('UserLearningState', userLearningStateSchema);
