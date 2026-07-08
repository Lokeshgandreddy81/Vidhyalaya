
## 2024-07-08 - [Prevent SSRF via BYOK Custom Endpoints]
**Vulnerability:** The `aiClientRouter.js` accepted arbitrary custom endpoint URLs via `x-byok-endpoint` headers and blindly passed them into `fetch` calls, enabling Server-Side Request Forgery (SSRF). Attackers could probe internal networks or loopback addresses.
**Learning:** Even when supporting custom "Bring Your Own Key" endpoints, raw URLs must be strictly validated. Relying solely on regex for string validation is insufficient because obfuscated IP addresses or custom DNS records can resolve to internal networks (DNS Rebinding/resolution evasion).
**Prevention:** Always validate external endpoints by parsing the URL, enforcing HTTPS, and explicitly performing an async `dns.lookup` (with `all: true`) to verify the resolved IPs against a strict blocklist of reserved/internal CIDR ranges before allowing the connection.
