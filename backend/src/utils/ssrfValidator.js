import dns from 'node:dns/promises';
import { URL } from 'node:url';

// Helper to check if an IP address is internal/private/loopback
export function isInternalIP(ip) {
  // Check loopback (127.0.0.0/8)
  if (/^127\./.test(ip)) return true;

  // Check private IPv4 ranges (10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16)
  if (/^10\./.test(ip)) return true;
  if (/^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(ip)) return true;
  if (/^192\.168\./.test(ip)) return true;

  // Check special/reserved (0.0.0.0/8, 169.254.0.0/16)
  if (/^0\./.test(ip)) return true;
  if (/^169\.254\./.test(ip)) return true;

  // Check IPv6 loopback and unspecified
  if (ip === '::1' || ip === '::' || ip === '0:0:0:0:0:0:0:0' || ip === '0:0:0:0:0:0:0:1') return true;

  // Check IPv4-mapped IPv6 loopback and private
  if (ip.toLowerCase().startsWith('::ffff:')) {
    const ipv4 = ip.substring(7);
    return isInternalIP(ipv4);
  }

  // Check standard local names
  if (ip === 'localhost' || ip.endsWith('.local') || ip.endsWith('.internal')) return true;

  return false;
}

/**
 * Validates a URL against SSRF attacks.
 * Enforces HTTPS, checks for internal IPs, and performs DNS resolution to block domains that resolve to internal IPs.
 *
 * @param {string} endpointUrl - The URL to validate
 * @throws {Error} If the URL is invalid or points to an internal network
 */
export async function validateEndpointForSSRF(endpointUrl) {
  if (!endpointUrl) return;

  let parsedUrl;
  try {
    parsedUrl = new URL(endpointUrl);
  } catch (err) {
    throw new Error('Invalid endpoint URL format');
  }

  if (parsedUrl.protocol !== 'https:') {
    throw new Error('Only HTTPS endpoints are allowed');
  }

  let hostname = parsedUrl.hostname;

  // Strip brackets from IPv6 hostnames
  if (hostname.startsWith('[') && hostname.endsWith(']')) {
    hostname = hostname.slice(1, -1);
  }

  // Initial check on the hostname itself (in case it's an IP or localhost)
  if (isInternalIP(hostname)) {
    throw new Error('Target endpoint resolves to an internal or reserved IP address');
  }

  // DNS Resolution check to catch rebinding/custom domains pointing to internal IPs
  try {
    const addresses = await dns.lookup(hostname, { all: true });
    for (const record of addresses) {
      if (isInternalIP(record.address)) {
        throw new Error('Target endpoint resolves to an internal or reserved IP address');
      }
    }
  } catch (err) {
    // If it's a validation error we threw, rethrow it
    if (err.message === 'Target endpoint resolves to an internal or reserved IP address') {
      throw err;
    }
    // ENOTFOUND or other DNS errors are passed through, fetch will fail naturally
    // Do not throw strict SSRF error here, let the HTTP client handle connection failure
  }
}
