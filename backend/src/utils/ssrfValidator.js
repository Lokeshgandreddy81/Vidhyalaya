import dns from 'dns';

/**
 * Validates a custom endpoint URL to prevent Server-Side Request Forgery (SSRF).
 * @param {string} endpointUrl - The custom endpoint URL to validate.
 * @returns {Promise<boolean>} True if valid and safe, throws an error if unsafe.
 */
export async function validateEndpointUrl(endpointUrl) {
  if (!endpointUrl) return true;

  try {
    const url = new URL(endpointUrl);

    // 1. Enforce HTTPS
    if (url.protocol !== 'https:') {
      throw new Error(`Invalid custom endpoint protocol: ${url.protocol}. Only HTTPS is allowed.`);
    }

    // 2. Extract hostname and strip IPv6 brackets if present
    const hostname = url.hostname.replace(/\[|\]/g, '');

    // 3. Resolve DNS to check for internal/reserved IPs
    const addresses = await dns.promises.lookup(hostname, { all: true });

    for (const address of addresses) {
      const ip = address.address;

      // Basic blocklist for internal/loopback IPs
      if (
        ip === '0.0.0.0' ||
        ip.startsWith('127.') ||
        ip === '::1' ||
        ip === '::' ||
        ip.startsWith('10.') ||
        ip.startsWith('192.168.') ||
        ip.match(/^172\.(1[6-9]|2[0-9]|3[0-1])\./) || // 172.16.0.0/12
        ip.match(/^169\.254\./) // Link-local
      ) {
        throw new Error(`Custom endpoint resolves to an internal or reserved IP address (${ip}).`);
      }
    }

    return true;
  } catch (error) {
    if (error.code === 'ENOTFOUND') {
      throw new Error('Custom endpoint hostname could not be resolved.');
    }
    throw error;
  }
}
