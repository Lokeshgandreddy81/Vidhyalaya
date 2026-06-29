import dns from 'dns';

/**
 * Validates a custom endpoint URL to prevent Server-Side Request Forgery (SSRF)
 * @param {string} endpointUrl - The URL to validate
 * @returns {Promise<boolean>} True if valid, throws Error if invalid
 */
export async function validateEndpoint(endpointUrl) {
  if (!endpointUrl) return true;

  let parsedUrl;
  try {
    parsedUrl = new URL(endpointUrl);
  } catch (err) {
    throw new Error('Invalid custom endpoint URL format.');
  }

  if (parsedUrl.protocol !== 'https:') {
    throw new Error('Custom endpoints must use HTTPS.');
  }

  const hostname = parsedUrl.hostname.replace(/\[|\]/g, '');

  if (isInternalIP(hostname)) {
    throw new Error('Custom endpoint resolves to a restricted internal IP address.');
  }

  try {
    const lookupResults = await dns.promises.lookup(hostname, { all: true });
    if (lookupResults && lookupResults.length > 0) {
      for (const result of lookupResults) {
        if (isInternalIP(result.address)) {
           throw new Error('Custom endpoint resolves to a restricted internal IP address via DNS lookup.');
        }
      }
    }
  } catch (lookupErr) {
    if (lookupErr.message.includes('Custom endpoint resolves to a restricted internal IP address via DNS lookup.')) {
      throw lookupErr;
    }
    // If it completely fails to resolve, let it proceed (fetch will fail)
  }

  return true;
}

/**
 * Checks if an IP address string is an internal/reserved IP.
 */
export function isInternalIP(ip) {
  if (ip === 'localhost' || ip === '127.0.0.1' || ip === '::1' || ip === '0.0.0.0' || ip === '::') {
    return true;
  }

  const ipv4Local = /^(127\.\d+\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2[0-9]|3[0-1])\.\d+\.\d+|192\.168\.\d+\.\d+|169\.254\.\d+\.\d+|0\.\d+\.\d+\.\d+)$/;
  if (ipv4Local.test(ip)) {
    return true;
  }

  const ipv6Local = /^([fF][cCdD][0-9a-fA-F]{2}:|[fF][eE][89aAbB][0-9a-fA-F]:|::1$|0:0:0:0:0:0:0:1$)/;
  if (ipv6Local.test(ip)) {
    return true;
  }

  if (ip.match(/^0+\.0+\.0+\.0+$/)) return true;

  return false;
}
