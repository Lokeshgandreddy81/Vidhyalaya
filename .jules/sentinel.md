## 2025-03-09 - Fix SSRF via BYOK Endpoint
**Vulnerability:** The AI client router allowed users to pass an arbitrary URL via the `x-byok-endpoint` header, which was directly passed to `fetch()`. This exposed a critical Server-Side Request Forgery (SSRF) vulnerability.
**Learning:** Node.js native `URL` parsing and DNS resolution can be weaponized if user-supplied endpoints are blindly trusted. Simply checking the URL string is not enough due to DNS rebinding and IP obfuscation.
**Prevention:** Always validate user-provided URLs by parsing the hostname, checking against internal IP ranges (including IPv4-mapped IPv6), and performing a DNS lookup with `{ all: true }` to ensure no resolved addresses are internal.
