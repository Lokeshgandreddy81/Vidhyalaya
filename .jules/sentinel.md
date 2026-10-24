## 2024-05-18 - SSRF Vulnerability in AI Custom Endpoints

**Vulnerability:** The `aiClientRouter.js` accepted arbitrary custom AI endpoints via the `x-byok-endpoint` header and passed them directly to `fetch()` without internal IP validation or protocol restrictions, enabling SSRF attacks (Server-Side Request Forgery) against internal cloud metadata services, loopback addresses, and private networks.
**Learning:** Node.js URL parser normalizes IPv4-mapped IPv6 loopbacks (e.g., `::ffff:127.0.0.1`) into hexadecimal forms (e.g., `::ffff:7f00:1`) inside the `hostname` property, bypassing basic string matching or dotted quad regexes. Furthermore, DNS resolution using `dns.lookup` might resolve arbitrary domains to internal IPs, causing TOCTOU or rebinding attacks if not checked.
**Prevention:**
1. Enforce HTTPS (`parsed.protocol !== 'https:'`).
2. Resolve domain names dynamically using `dns.lookup({ all: true })`.
3. Check all returned IP addresses for private blocks (10.x, 192.168.x, 172.16-31.x), loopbacks (127.x, ::1), cloud metadata (169.254.x), and specially formatted mapped IPv6 strings (both dotted and hexadecimal formats like `7f...`, `0a...`, `c0a8`).
4. Perform these validations before making outward network requests.
