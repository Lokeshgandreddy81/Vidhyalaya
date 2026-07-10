## 2025-02-14 - Prevent SSRF in AI Client Router Custom Endpoints

**Vulnerability:**
The `aiClientRouter.js` accepted a user-provided `customEndpoint` header and executed raw `fetch` calls to it without validating if the hostname resolved to an internal, link-local, or loopback network address. This allowed attackers to perform Server-Side Request Forgery (SSRF) to scan internal infrastructure, access local metadata services (like 169.254.169.254 in AWS), or trigger actions on unauthenticated internal services.

**Learning:**
Regex-based URL validation is insufficient due to various obfuscation techniques (like `0x7f.0.0.1` or zero-padded IPs) and custom domains resolving to `127.0.0.1`. DNS resolution must be paired with IPv4, IPv6, and IPv4-mapped IPv6 network validation to adequately filter SSRF, alongside forcing `https:`.

**Prevention:**
Always use `URL` parser normalization in conjunction with `dns.promises.lookup({ all: true })` to iterate through all resolved A/AAAA records for a given custom URL. Explicitly block `0.0.0.0`, `[::]`, IPv4-mapped loopbacks (`::ffff:127.0.0.1`), RFC 1918 private spaces (10/8, 172.16/12, 192.168/16), ULA (fc00::/7), and link-local ranges (169.254/16, fe80::/10).
