import dns from 'node:dns/promises';

export async function validateEndpoint(endpointUrl) {
  if (!endpointUrl) return true;

  let urlObj;
  try {
    urlObj = new URL(endpointUrl);
  } catch (err) {
    throw new Error('Invalid endpoint URL.');
  }

  if (urlObj.protocol !== 'https:') {
    throw new Error('Endpoint must use https: protocol.');
  }

  const hostname = urlObj.hostname.replace(/^\[(.*)\]$/, '$1');

  let addresses = [];
  try {
    const records = await dns.lookup(hostname, { all: true });
    addresses = records.map(r => r.address);
  } catch (err) {
    // Domain doesn't exist, ignore and let connection fail naturally
  }

  const isInternal = (ip) => {
    const lowerIP = ip.toLowerCase();

    if (lowerIP.startsWith('127.') ||
        lowerIP === '0.0.0.0' ||
        lowerIP.startsWith('10.') ||
        lowerIP.startsWith('192.168.') ||
        lowerIP.startsWith('169.254.')) {
      return true;
    }

    if (lowerIP.startsWith('172.')) {
      const secondOctet = parseInt(lowerIP.split('.')[1], 10);
      if (secondOctet >= 16 && secondOctet <= 31) return true;
    }

    if (lowerIP === '::1' || lowerIP === '::' || lowerIP === '0:0:0:0:0:0:0:1' || lowerIP === '0:0:0:0:0:0:0:0') return true;
    if (lowerIP.startsWith('fc') || lowerIP.startsWith('fd') ||
        lowerIP.startsWith('fe8') || lowerIP.startsWith('fe9') ||
        lowerIP.startsWith('fea') || lowerIP.startsWith('feb')) {
      return true;
    }

    if (lowerIP.startsWith('::ffff:')) {
      const mapped = lowerIP.substring(7);
      if (mapped.startsWith('127.') || mapped.startsWith('10.') || mapped.startsWith('192.168.') || mapped.startsWith('169.254.') || mapped === '0.0.0.0') return true;
      if (mapped.startsWith('172.')) {
        const secondOctet = parseInt(mapped.split('.')[1], 10);
        if (secondOctet >= 16 && secondOctet <= 31) return true;
      }

      if (!mapped.includes('.')) {
        const parts = mapped.split(':');
        if (parts.length === 2) {
          const p1 = parts[0].padStart(4, '0');
          const p2 = parts[1].padStart(4, '0');
          const hex = p1 + p2;
          const octets = [
            parseInt(hex.substring(0,2), 16),
            parseInt(hex.substring(2,4), 16),
            parseInt(hex.substring(4,6), 16),
            parseInt(hex.substring(6,8), 16)
          ];
          const ipv4 = octets.join('.');
          if (ipv4.startsWith('127.') || ipv4 === '0.0.0.0' || ipv4.startsWith('10.') || ipv4.startsWith('192.168.') || ipv4.startsWith('169.254.')) return true;
          if (ipv4.startsWith('172.')) {
            const secondOctet = parseInt(ipv4.split('.')[1], 10);
            if (secondOctet >= 16 && secondOctet <= 31) return true;
          }
        }
      }
    }

    return false;
  };

  if (isInternal(hostname)) {
    throw new Error('Internal or reserved IP addresses are not allowed.');
  }

  for (const ip of addresses) {
    if (isInternal(ip)) {
      throw new Error('Internal or reserved IP addresses are not allowed.');
    }
  }

  return true;
}
