## 2024-08-24 - VM Sandbox Escape via Prototype Chain
**Vulnerability:** Node.js `vm` module sandbox escape using prototype chain traversal (`process.env.constructor.constructor('return process')()`).
**Learning:** Initializing the VM sandbox context with `Object.create(null)` is insufficient if standard host objects or host-created functions are injected, as their prototype chains allow malicious scripts to escape the sandbox and access the host environment.
**Prevention:** Use `vm.createContext` with `codeGeneration: { strings: false, wasm: false }`, execute via `vm.runInContext`, ensure ALL nested context objects are created recursively via `Object.create(null)`, and completely avoid injecting host-created functions (which retain `Function.prototype`).
