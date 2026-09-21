## 2024-05-24 - Sandbox Escape via Node VM Core Vulnerability

**Vulnerability:** The Node.js VM runtime module allows arbitrary code execution/sandbox escape when standard host objects or properties are injected directly without resetting the prototypes (`Object.create(null)`). In `backend/src/utils/codeRunner.js`, `executeSanitizedUserCode` constructs an `executionContextSandbox` containing inline Javascript objects and passes it to `runInNewContext`. This enabled sandbox escape via object prototype traversal. The vulnerability is triggered through methods like `process.env.constructor.constructor('return process')()`.

**Learning:** Injecting default JavaScript objects or literal functions like `process: { exit: () => {} }` directly into VM sandbox context allows escaping via `Function.prototype` or traversing parent prototypes up to the application's global state. The VM environment requires strictly sanitized prototypes and disabled string/Wasm eval for basic safety.

**Prevention:** Always initialize all layers of sandbox objects completely free of host prototypes (`Object.create(null)`), avoid injecting functions directly, and explicitly use `vm.createContext` combined with `codeGeneration: { strings: false, wasm: false }` to prevent dynamic code generation evaluation.
