## 2024-07-26 - [CRITICAL] Node.js vm Sandbox Escape

**Vulnerability:** The `executeSanitizedUserCode` function in `backend/src/utils/codeRunner.js` used a standard object literal `{}` as the context for `vm.runInNewContext`. This allowed attackers to escape the VM sandbox by walking the prototype chain (`this.constructor.constructor('return process')()`) to gain access to the main Node.js process.

**Learning:** When using Node.js `vm.runInNewContext`, initializing the sandbox context with a standard object literal `{}` or passing host objects/functions is unsafe. The prototype chain is shared with the main context.

**Prevention:** Always use `Object.create(null)` to initialize the context object for `vm.runInNewContext` to strip the prototype chain, and do not inject host properties.
