## 2025-02-18 - [CRITICAL] Node.js VM Sandbox Escape
**Vulnerability:** The backend `executeSanitizedUserCode` function used `runInNewContext` with a sandbox object that allowed malicious code to escape the VM boundary via prototype chain manipulation. Specifically, injected host functions like `process.exit` retain `Function.prototype` and other host properties, allowing attackers to access host `process` via `process.exit.constructor('return process')()`.
**Learning:** Initializing the VM context sandbox using a standard JS object `{}` or injecting any host-created functions into the context exposes standard host objects in the execution scope. Attackers can traverse up the prototype chain of these objects to execute code outside the sandbox and gain RCE.
**Prevention:** To secure `vm` usage:
1. Always create the sandbox and *all* nested objects recursively with `Object.create(null)` to eliminate prototype inheritance.
2. Never inject host functions or classes into the sandbox context.
3. Use `vm.createContext` combined with `codeGeneration: { strings: false, wasm: false }` to prevent dynamic execution like `eval()` inside the VM.
4. Execute code using `vm.runInContext`.
