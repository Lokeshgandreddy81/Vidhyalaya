## 2024-10-04 - [CRITICAL] Node.js VM Sandbox Escape via Injected Host Functions
**Vulnerability:** The backend `executeSanitizedUserCode` used `vm.runInNewContext` to isolate JavaScript execution. However, it injected host-created functions (e.g., `process.exit = () => { ... }`) into the sandbox context. These functions retain references to the outer host context (`Function.prototype`), allowing malicious code to traverse the prototype chain (`this.constructor.constructor('return process')()`) to obtain a reference to the global host `process` object. This enables sandbox escape and Remote Code Execution (RCE) via `process.mainModule.require('child_process')`.
**Learning:** Initializing the VM context with an object literal (`{}`) or even injecting isolated objects isn't secure if those objects originate from the host context. Host functions inherently carry the host's `Function` constructor, which serves as a bridge back out of the sandbox.
**Prevention:** To securely use the Node.js `vm` module:
1. Initialize the sandbox recursively with `Object.create(null)` to completely sever prototype chains.
2. Disable code generation (like `eval` and `Function` constructor) by using `vm.createContext` with `{ codeGeneration: { strings: false, wasm: false } }`.
3. Never inject host-created functions or objects with prototypes into the sandbox context.
4. Execute via `vm.runInContext` using the explicitly created, safe context.
