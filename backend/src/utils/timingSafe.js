import crypto from 'crypto';

/**
 * Constant-time comparison to prevent timing attacks.
 * Wraps crypto.timingSafeEqual and protects against length mismatches.
 */
export function timingSafeCompare(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const aBuf = Buffer.from(a);
  const bBuf = Buffer.from(b);
  if (aBuf.length !== bBuf.length) {
    // Perform a dummy comparison of matching lengths to mitigate length timing leak
    crypto.timingSafeEqual(aBuf, aBuf);
    return false;
  }
  return crypto.timingSafeEqual(aBuf, bBuf);
}
