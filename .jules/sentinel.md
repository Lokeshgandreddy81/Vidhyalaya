## 2024-05-24 - SSRF in custom endpoint for AI client router
**Vulnerability:** The AI client router accepts a user-provided `x-byok-endpoint` header and makes a fetch request directly to that endpoint without validation, leading to Server-Side Request Forgery (SSRF).
**Learning:** Custom endpoints passed from headers must be validated to ensure they use the `https:` protocol and do not resolve to internal or reserved IP addresses to prevent access to the internal network.
**Prevention:** Implement strict SSRF validation for all user-provided URLs before fetching, rejecting internal IPs, loopback, private ranges, and non-HTTPS protocols. Use `dns.lookup` for DNS rebinding protection if needed, though simple regex check after URL parse can be a start.
