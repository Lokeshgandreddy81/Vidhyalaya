## 2024-05-24 - Fix SSRF Vulnerability in AI Client Router
**Vulnerability:** The application accepted custom API endpoints (e.g., via `x-byok-endpoint` headers) without properly validating the URL, potentially allowing attackers to issue HTTP requests from the server to internal addresses (SSRF).
**Learning:** By providing arbitrary endpoints, malicious actors could perform DNS rebinding or direct internal IP calls, leveraging the backend to probe internal networks or metadata services (e.g. `169.254.169.254`).
**Prevention:** Ensure that external URLs provided by users are validated for `https:`, checked against known private/loopback/link-local IPs, and further checked via `dns.lookup` to prevent domains resolving to internal IPs.
