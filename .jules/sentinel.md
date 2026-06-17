## 2024-05-30 - SSRF Prevention via IPv6 Loopback Bypass

**Vulnerability:** The initial implementation of `validateCustomEndpoint` to block SSRF missed the IPv6 loopback address `[::1]`. When parsing a URL like `https://[::1]`, Node's `URL` object retains the brackets in the `hostname` property, meaning a simple `.includes('::1')` check fails to catch it, allowing the SSRF vector to bypass the blocklist.
**Learning:** URL parsing behaves differently across implementations and IP versions. Simply checking for `::1` in the parsed hostname is insufficient because the brackets remain part of the parsed string for IPv6 literals.
**Prevention:** Always normalize hostnames by removing brackets (e.g., `.replace(/^\[|\]$/g, '')`) before performing string-matching checks for blocked IP addresses, or use dedicated IP parsing libraries instead of manual string checks.
