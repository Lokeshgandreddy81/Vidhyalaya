import dns from 'node:dns/promises';
import { URL } from 'node:url';

export async function validateEndpointUrl(endpointUrl) {
  if (!endpointUrl) return true;

  let hostname;
  try {
    const url = new URL(endpointUrl);

    // Enforce HTTPS
    if (url.protocol !== 'https:') {
      throw new Error(`Endpoint URL must use https. (Got ${url.protocol})`);
    }

    hostname = url.hostname;

    // Explicitly reject literal internal IPs parsed by URL
    if (hostname === '0.0.0.0' || hostname === '[::]' || hostname === '::') {
      throw new Error(`Endpoint hostname resolves to a restricted internal IP.`);
    }

    // Node.js normalizes IPv4-mapped IPv6 (e.g. [::ffff:127.0.0.1] -> [::ffff:7f00:1])
    let normalizedHost = hostname.replace(/^\[|\]$/g, '').toLowerCase();

    // Catch common localized subnets before DNS
    if (
      normalizedHost.startsWith('127.') ||
      normalizedHost.startsWith('169.254.') ||
      normalizedHost.startsWith('10.') ||
      normalizedHost.match(/^172\.(1[6-9]|2[0-9]|3[0-1])\./) ||
      normalizedHost.startsWith('192.168.') ||
      normalizedHost === 'localhost' ||
      normalizedHost.startsWith('::1') ||
      normalizedHost.startsWith('fd') ||
      normalizedHost.startsWith('fc') ||
      normalizedHost.startsWith('fe8') ||
      normalizedHost.startsWith('fe9') ||
      normalizedHost.startsWith('fea') ||
      normalizedHost.startsWith('feb') ||
      normalizedHost.includes('::ffff:127.') ||
      normalizedHost.includes('::ffff:7f')
    ) {
      throw new Error(`Endpoint hostname resolves to a restricted internal IP.`);
    }

  } catch (err) {
    if (err.message.includes('restricted internal IP') || err.message.includes('must use https')) {
      throw err;
    }
    // Invalid URL format
    throw new Error(`Invalid endpoint URL provided.`);
  }

  // Perform DNS resolution to catch DNS rebinding/custom domains pointing to localhost
  try {
    const addresses = await dns.lookup(hostname, { all: true });

    for (const { address } of addresses) {
      if (
        address === '0.0.0.0' ||
        address === '::' ||
        address.startsWith('127.') ||
        address.startsWith('169.254.') ||
        address.startsWith('10.') ||
        address.match(/^172\.(1[6-9]|2[0-9]|3[0-1])\./) ||
        address.startsWith('192.168.') ||
        address === '::1' ||
        address.toLowerCase().startsWith('fd') ||
        address.toLowerCase().startsWith('fc') ||
        address.toLowerCase().startsWith('fe8') ||
        address.toLowerCase().startsWith('fe9') ||
        address.toLowerCase().startsWith('fea') ||
        address.toLowerCase().startsWith('feb') ||
        address.toLowerCase().includes('::ffff:127.') ||
        address.toLowerCase().includes('::ffff:7f')
      ) {
         throw new Error(`Endpoint hostname resolves to a restricted internal IP.`);
      }
    }
  } catch (err) {
    if (err.message.includes('restricted internal IP')) {
      throw err;
    }
    // DNS ENOTFOUND is fine, fetch will fail naturally.
    // We only throw explicitly for security violations.
  }
}
