
## 2024-08-10 - Node.js VM Sandbox Escape via Prototype Chain Traversal
**Vulnerability:** The `executeSanitizedUserCode` function in `backend/src/utils/codeRunner.js` used the Node.js `vm` module (`runInNewContext`) with a custom sandbox object. However, it injected a host function (`process.exit = () => { ... }`) into the sandbox. Malicious code could exploit this by traversing the prototype chain of the injected host function (e.g., `process.exit.constructor('return process')()`) to gain access to the host's `Function` constructor, completely escaping the sandbox and gaining access to the main Node.js process environment and global objects.
**Learning:** Initializing the `vm` context with standard objects or injecting *any* host-created functions into the sandbox is highly dangerous. Even if the context is seemingly restricted, the default prototype chains (`Function.prototype`) leak references to the outer execution context.
**Prevention:** To secure the Node.js `vm` module, you must:
1. Use `vm.createContext` combined with `vm.runInContext`.
2. Disable dynamic code generation inside the sandbox using `{ codeGeneration: { strings: false, wasm: false } }`.
3. Recursively create ALL sandbox context objects (and nested objects) using `Object.create(null)` to eliminate prototype chains.
4. **Never** inject host-created functions or objects with prototypes into the sandbox.
