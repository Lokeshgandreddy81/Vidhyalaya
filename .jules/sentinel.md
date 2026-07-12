## 2025-07-12 - Fix VM Sandbox Escape

**Vulnerability:** Node.js `vm.runInNewContext` allows prototype chain escapes if a host object like `process.exit` is passed to the execution context. Specifically, `process.exit.constructor.constructor('return process')()` allows attackers to break out of the sandbox and access the host environment (e.g. `process.env`).
**Learning:** Using `Object.create(null)` for the sandbox context is necessary to prevent these escapes because it creates an object with no prototype.
**Prevention:** When evaluating untrusted code with `vm`, always pass `Object.create(null)` instead of a literal object mask (`{}`), and do not pass host functions or objects as arguments.
