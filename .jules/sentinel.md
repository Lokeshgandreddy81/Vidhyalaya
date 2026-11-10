## 2024-11-10 - Sandbox Escape in CodeRunner

**Vulnerability:** Node.js VM sandbox allows sandbox escape and access to the host's `process.env` when host objects (even benign-looking ones like empty arrays or objects) are passed into the sandbox. Attackers can traverse the prototype chain via `this.process.env.constructor.constructor("return process")()` or `process.env.constructor.constructor("return process")()` to obtain arbitrary code execution in the main Node context, leaking sensitive credentials like JWT_SECRET and DB_ENCRYPTION_KEY.

**Learning:** Initializing VM execution contexts with basic Javascript objects (e.g. `{ process: ... }`) is fundamentally insecure in Node.js because properties inherently retain the prototype chain of the main Node V8 isolate context.

**Prevention:** To properly isolate VM contexts, use `vm.createContext` initialized strictly with `Object.create(null)` to eliminate prototype traversing, use `vm.runInContext` instead of `runInNewContext`, and set `codeGeneration: { strings: false, wasm: false }` to prevent dynamic function evaluation (like `Function('return process')()`). Never pass host-created objects (especially functions) into the VM.
