import dns from 'node:dns/promises';

/**
 * Checks if an IP address is internal/reserved to prevent SSRF.
 * Catches IPv4, IPv4-mapped IPv6, and raw IPv6 addresses.
 */
function isInternalIP(ip) {
  // Normalize IPv4-mapped IPv6
  let normalizedIp = ip;
  if (ip.startsWith('::ffff:')) {
    normalizedIp = ip.substring(7);
  }

  // Basic IPv4 internal ranges
  if (normalizedIp === '0.0.0.0' || normalizedIp === '255.255.255.255') return true;
  if (normalizedIp.startsWith('127.')) return true; // Loopback
  if (normalizedIp.startsWith('10.')) return true; // Private
  if (normalizedIp.startsWith('192.168.')) return true; // Private
  if (normalizedIp.startsWith('169.254.')) return true; // Link-local

  // 172.16.0.0 - 172.31.255.255 (Private)
  if (normalizedIp.startsWith('172.')) {
    const secondOctet = parseInt(normalizedIp.split('.')[1], 10);
    if (secondOctet >= 16 && secondOctet <= 31) return true;
  }

  // Basic IPv6 internal ranges
  if (ip === '::1' || ip === '::') return true; // Loopback/Unspecified

  const lowerIp = ip.toLowerCase();
  // Unique local addresses (fc00::/7)
  if (lowerIp.startsWith('fc') || lowerIp.startsWith('fd')) return true;
  // Link-local addresses (fe80::/10)
  if (['fe8', 'fe9', 'fea', 'feb'].some(prefix => lowerIp.startsWith(prefix))) return true;

  return false;
}

/**
 * Validates a URL against SSRF attacks.
 * Resolves the hostname and checks if any resolved IP is internal.
 */
export async function validateSSRF(targetUrl) {
  if (!targetUrl) return true; // No URL to validate

  let parsedUrl;
  try {
    parsedUrl = new URL(targetUrl);
  } catch (err) {
    throw new Error('Invalid URL format');
  }

  // Must be HTTP or HTTPS
  if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
    throw new Error('Only HTTP/HTTPS protocols are allowed');
  }

  // Handle raw IP in hostname (URL module normalizes brackets like [::1])
  let hostname = parsedUrl.hostname;
  if (hostname.startsWith('[') && hostname.endsWith(']')) {
    hostname = hostname.slice(1, -1);
  }

  // First check if the raw hostname itself looks like an internal IP
  // (Note: The URL constructor normalizes IP formats, e.g. converting hex/octal to standard decimal,
  // making this direct check more robust against basic obfuscation).
  if (isInternalIP(hostname)) {
    throw new Error('Access to internal IP addresses is forbidden');
  }

  // Now resolve the domain to check against DNS rebinding / internal CNAMEs
  try {
    // all: true returns all addresses for the domain, preventing rebinding where
    // one address is external and another is internal
    const addresses = await dns.lookup(hostname, { all: true });

    for (const addr of addresses) {
      if (isInternalIP(addr.address)) {
        throw new Error('Domain resolves to an internal IP address');
      }
    }
  } catch (err) {
    // If it's a valid resolution error (e.g., domain doesn't exist), we can either fail strict
    // or let the subsequent fetch fail. We throw on our specific SSRF checks.
    if (err.message.includes('internal IP')) {
        throw err;
    }
    // Ignore ENOTFOUND, etc., fetch will just fail naturally
  }

  return true;
}
