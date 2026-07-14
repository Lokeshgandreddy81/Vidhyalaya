/**
 * byokShield.js — Zero-Trust BYOK Middleware
 *
 * This middleware is the single interception point for all BYOK API key transit.
 * It decrypts the incoming key from the x-byok-api-key header, attaches the
 * plaintext to a non-enumerable property on the request object (invisible to
 * loggers, JSON serializers, and debugger dumps), then immediately strips
 * the header from the request so no downstream handler or proxy ever sees it.
 *
 * Flow:
 *   x-byok-api-key: [AES-256-GCM ciphertext OR plaintext]
 *     → decryptKey()
 *     → req.rawByokKey = <plaintext>   (non-enumerable, non-serializable)
 *     → delete req.headers['x-byok-api-key']
 */
import { decryptKey } from '../utils/cryptoUtils.js';

export function byokShield(req, res, next) {
  const encryptedKey = req.headers['x-byok-api-key'];

  if (encryptedKey) {
    try {
      // Decrypt in-place — decryptKey() handles both encrypted and legacy plaintext
      const decryptedKey = decryptKey(encryptedKey);

      // Attach to request as a NON-ENUMERABLE property:
      //   - Won't appear in JSON.stringify(req)
      //   - Won't appear in for...in loops
      //   - Won't appear in pino/morgan log serializers
      //   - Can only be accessed by explicit req.rawByokKey reference
      Object.defineProperty(req, 'rawByokKey', {
        value: decryptedKey,
        writable: false,
        configurable: true,
        enumerable: false,
      });
    } catch (err) {
      // Malformed or tampered encrypted payload — reject immediately
      return res.status(401).json({
        error: 'Invalid or corrupted BYOK transport payload.',
        code: 'BYOK_DECRYPT_FAILED',
      });
    }

    // Scrub the raw header instantly so no downstream logger, proxy,
    // or route handler ever touches it again
    delete req.headers['x-byok-api-key'];
  }

  next();
}
