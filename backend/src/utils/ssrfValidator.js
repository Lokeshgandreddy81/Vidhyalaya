import dns from 'node:dns/promises';

/**
 * Validates URLs to prevent Server-Side Request Forgery (SSRF)
 * Checks protocol, parses internal IPs, and performs DNS validation.
 * @param {string} endpointUrl
 */
export async function validateEndpointSSRF(endpointUrl) {
  if (!endpointUrl) return;

  let parsed;
  try {
    parsed = new URL(endpointUrl);
  } catch (e) {
    throw new Error('Invalid endpoint URL');
  }

  if (parsed.protocol !== 'https:') {
    throw new Error('SSRF Validation Failed: Only HTTPS is allowed');
  }

  // Node URL converts IPv4-mapped IPv6 to hex inside brackets, e.g. [::ffff:7f00:1]
  const hostname = parsed.hostname.replace(/\[|\]/g, '').toLowerCase();

  const isInternalIP = (ip) => {
    if (ip === '0.0.0.0' || ip === '::' || ip === '::1' || ip === '127.0.0.1') return true;
    if (ip.startsWith('127.')) return true;
    if (ip.startsWith('10.')) return true;
    if (ip.startsWith('192.168.')) return true;
    if (/^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(ip)) return true;
    if (ip.startsWith('169.254.')) return true;
    if (ip.startsWith('fd') || ip.startsWith('fc')) return true; // Unique Local Address
    if (ip.startsWith('fe80:')) return true; // Link-local

    if (ip.startsWith('::ffff:')) {
      const mapped = ip.substring(7);
      if (mapped.startsWith('7f') || mapped === '0:0') return true;
      if (mapped.match(/^[aA][0-f]/)) return true; // 10.x.x.x
      if (mapped.startsWith('c0a8')) return true; // 192.168.x.x
      if (mapped.startsWith('a9fe')) return true; // 169.254.x.x

      // Handle decimal mapped cases if any (e.g. from DNS lookup)
      if (mapped.startsWith('127.') || mapped.startsWith('10.') || mapped.startsWith('192.168.') || mapped.startsWith('169.254.') || mapped === '0.0.0.0') return true;
      if (/^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(mapped)) return true;
    }
    return false;
  };

  if (isInternalIP(hostname) || hostname === 'localhost') {
    throw new Error('SSRF Validation Failed: Internal IP blocked');
  }

  try {
    const addresses = await dns.lookup(hostname, { all: true });
    for (const { address } of addresses) {
      if (isInternalIP(address)) {
        throw new Error('SSRF Validation Failed: DNS resolves to internal IP');
      }
    }
  } catch (err) {
    if (err.message.includes('SSRF Validation Failed')) {
      throw err;
    }
    // ENOTFOUND or similar are fine, fetch will just fail
  }
}
