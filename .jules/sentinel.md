## 2024-10-24 - VM Sandbox Escape via Host Objects

**Vulnerability:**
The `executeSanitizedUserCode` function used `runInNewContext` to execute untrusted user code, passing host objects (like an inline arrow function for `process.exit`) into the sandbox. This allowed a sandbox escape by accessing the prototype chain of the injected host function: `process.exit.constructor('return process')().env`. Since the `constructor` of the host function evaluates in the context of the host environment, it gave the sandbox access to the host's `process` object, bypassing the sandbox entirely.

**Learning:**
Initializing a `vm` sandbox with simple object literals or `Object.create(null)` is not enough if you inject *any* host-created function (or objects with a prototype chain) into it. The `constructor` property on standard functions provides a direct reference to the `Function` constructor of the outer context.

**Prevention:**
To properly secure a Node.js `vm` execution:
1. Always use `vm.createContext()` with the `codeGeneration: { strings: false, wasm: false }` option to prevent string evaluation.
2. Ensure ALL objects within the context are created using `Object.create(null)` recursively to strip prototype chains.
3. Completely avoid passing host-created functions to the sandbox context.
4. Execute code using `vm.runInContext()` rather than `runInNewContext()`.
