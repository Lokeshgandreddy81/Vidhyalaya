## 2024-05-18 - Node.js VM Sandbox Escape via Host-Injected Functions
**Vulnerability:** The Node.js VM module sandbox configuration in `executeSanitizedUserCode` allowed a sandbox escape due to the injection of a host-created function (`process.exit = () => {}`). This function retains the host `Function.prototype`, enabling malicious scripts to traverse the prototype chain and access host globals (e.g., `this.constructor.constructor('return process.env')()`).
**Learning:** Initializing the VM context with `Object.create(null)` is not sufficient if standard host objects or functions are injected into the context. The prototype chain of any host-created entity provides a vector for context breakout.
**Prevention:**
1. Avoid injecting ANY host-created functions or objects directly into the VM sandbox.
2. Initialize all nested namespace objects recursively using `Object.create(null)`.
3. Create the VM context with `vm.createContext(sandbox, { codeGeneration: { strings: false, wasm: false } })` to strictly disable runtime code evaluation.
4. Execute user code using `vm.runInContext` rather than `vm.runInNewContext` to leverage the custom hardened context configuration.
