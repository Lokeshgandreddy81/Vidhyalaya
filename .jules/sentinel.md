## 2024-08-16 - SSRF in BYOK AI Endpoints
**Vulnerability:** The application allowed users to specify a custom endpoint for AI chat completions via the `x-byok-endpoint` header. This endpoint was passed directly to the native `fetch` command without validation.
**Learning:** This introduces a Server-Side Request Forgery (SSRF) vulnerability. Even with a Node.js `URL` object parsing, if the destination domain resolves to an internal/reserved IP, the application will connect to it, allowing access to internal networks (like AWS metadata at `169.254.169.254` or local databases). Relying on regex matches on the raw hostname string is insufficient because of IPv4-mapped IPv6 encodings (e.g. `::ffff:127.0.0.1`) and DNS rebinding attacks.
**Prevention:** Always validate custom endpoints using `dns.promises.lookup(hostname, { all: true })` to verify that no returned IP address maps to local, loopback, or internal subnets. Strictly enforce `https:` scheme and catch all exceptions during parsing or validation.

## 2024-08-16 - SSRF AWS Metadata Bypass via IPv6 Brackets
**Vulnerability:** A previous attempt to block SSRF missed the AWS metadata link-local IP range (169.254.x.x) and incorrectly stripped brackets for IPv6 literals due to a faulty regex `/^[|]$/` rather than `/^\[|\]$/`.
**Learning:** AWS metadata extraction is the highest severity impact of an SSRF and must be explicitly blocked. Additionally, `dns.lookup` system errors (e.g., EINVAL for bracketed IPv6 literals that bypass the regex check) must not be silently swallowed if they represent malformed hostnames trying to bypass validation.
**Prevention:** Explicitly include `169.254.` in regex IPv4 tests. Re-throw any `err.code !== 'ENOTFOUND'` from DNS lookups.
