## 2024-05-18 - [Fix SSRF vulnerability in aiClientRouter]
**Vulnerability:** A Server-Side Request Forgery (SSRF) vulnerability existed in `backend/src/utils/aiClientRouter.js` where user-provided endpoints in the `x-byok-endpoint` header were directly passed to `fetch` calls without validation.
**Learning:** Custom endpoints need robust validation against internal IPs, Loopback addresses, and IPv4-mapped IPv6 obfuscation (e.g., `::ffff:7f00:1`), as well as DNS resolution to prevent custom domains pointing to internal networks.
**Prevention:** Always parse untrusted URLs, enforce HTTPS protocols, validate the extracted hostname against known internal network blocks, and use `dns.lookup` to ensure resolved IP addresses are safe.
