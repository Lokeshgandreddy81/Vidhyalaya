
## 2024-03-05 - Cross-Site Scripting (XSS) in CodeSandbox
**Vulnerability:** A raw string of highlighted HTML was being directly set to the DOM using React's `dangerouslySetInnerHTML` in `CodeSandbox.tsx` without sanitization.
**Learning:** React components that render dynamic user-controlled or third-party generated HTML content (like syntax highlighters) are highly susceptible to XSS if not explicitly sanitized. The `dangerouslySetInnerHTML` prop explicitly requires developers to acknowledge this risk.
**Prevention:** Always wrap variables passed to `dangerouslySetInnerHTML` with `DOMPurify.sanitize()` (e.g., `DOMPurify.sanitize(unsafeHtml)`) to neutralize malicious scripts while preserving intended formatting tags like `<span>`, `<code>`, and `<pre>`.
