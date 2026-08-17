
## 2024-10-27 - Fix VM Sandbox Escape Vulnerability
**Vulnerability:** Remote Code Execution (RCE) via `vm` module sandbox escape in `executeSanitizedUserCode` due to the injection of host-created functions (`process.exit`) and implicitly inheriting the Object prototype chain.
**Learning:** Injecting a host function into a Node `vm` context exposes the host's `Function` constructor (`sandboxFunc.constructor("return process")()`), completely breaking isolation.
**Prevention:** Always use `vm.createContext` initialized recursively with `Object.create(null)` to sever the prototype chain, never inject functions originating from the host, and enforce `codeGeneration: { strings: false, wasm: false }` to block dynamic evaluation.
