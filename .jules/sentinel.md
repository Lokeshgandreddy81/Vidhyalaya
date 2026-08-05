## 2024-08-05 - Fix SSRF Vulnerability in AI Client Router
**Vulnerability:** The application allowed users to specify a custom AI endpoint via the `x-byok-endpoint` header, which was directly passed to `fetch` calls without validation, creating a Server-Side Request Forgery (SSRF) risk.
**Learning:** External user-supplied URLs must always be validated before being used in backend HTTP requests. Relying on default configurations or unvalidated headers can expose internal network services or cloud metadata endpoints.
**Prevention:** Always parse and validate custom endpoints. Enforce HTTPS, check against lists of blocked internal IP addresses, and ensure DNS resolution does not return local/internal addresses before making the request.
