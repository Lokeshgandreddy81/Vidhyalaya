## 2024-05-24 - [CRITICAL] Node.js VM Sandbox Escape via Prototype Pollution
**Vulnerability:** The `executeSanitizedUserCode` function used `vm.runInNewContext` to run untrusted user code. It injected a host object (`{ process: { env: { NODE_ENV: 'production' }, exit: ... }, global: {}, require: null }`) directly into the sandbox. Attackers could walk the prototype chain of these injected standard JavaScript objects (e.g., `process.env.constructor.constructor('return process')()`) to bypass the VM boundary, achieve RCE, and access sensitive host variables like API keys and database credentials.
**Learning:** Initializing the Node.js `vm` sandbox context with standard objects (which inherit from `Object.prototype`) leaves the prototype chain exposed. `vm.runInNewContext` alone is insufficient if the context object itself allows escaping to the host's `Function` constructor.
**Prevention:**
1. Use `vm.createContext` combined with `vm.runInContext`.
2. Disable runtime code evaluation inside the VM by passing `codeGeneration: { strings: false, wasm: false }` to `vm.createContext`.
3. Ensure ALL injected nested objects into the sandbox (like `process`, `process.env`, etc.) are created recursively using `Object.create(null)` to completely sever the prototype chain to the host environment.
4. DO NOT inject any host functions (like closures or helper functions) into the VM context, as they leak the host `Function.prototype` and allow sandbox escape via `injectedFunction.constructor('return process')()`.
