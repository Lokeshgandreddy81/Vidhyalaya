# Terminal Foundation Audit (TERMINAL_AUDIT.md)

This audit documents the current state of the terminal execution subsystem in Vidyal.ai, specifically detailing the architecture, features, constraints, technical debt, and discovered bugs of `/Users/lokeshgandreddy/Sara/Vidhyalaya/frontend/src/components/ui/ShellTerminal.tsx`.

---

### Existing Architecture

The Vidyal.ai terminal is implemented as a client-side terminal simulator within a single React functional component:
- **State Management**: Session states are managed locally inside `ShellTerminal` using a `sessions` React state array. Each session object keeps track of:
  - `id`: Unique identifier (e.g., `bash-1`)
  - `name`: Human-readable tab label (e.g., `bash (1)`)
  - `history`: An array of strings representing output lines.
  - `currentDir`: Active path context within the sandboxed project.
  - `historyStack` / `historyIndex`: List of previously entered commands for Up/Down arrow navigation.
  - `activeProcess`: Active task running in the foreground (e.g., `'none'`, `'dev'`, `'test'`, `'nano'`, `'top'`).
- **Parent Sync**: The parent `CodeSandbox` component passes state/setters (`terminalHistory`, `setTerminalHistory`, `isReadOnly`, `editorFiles`, etc.) to sync compilation states and file buffers.
- **Rendering System**: Raw list rendering is used. All output lines in the active session's `history` are mapped directly to standard DOM elements using `activeSession.history.map((log, idx) => ...)`.
- **Command Engine**: A synchronous command router stru





































4. **Missing Composition Event Handling (IME)**: The input engine does not listen to `compositionstart`/`compositionend` events, breaking text input for non-English keyboards, accents, or input method editors.
5. **No Shift+Enter Support**: Pressing `Shift+Enter` triggers immediate command execution rather than inserting a newline or behaving predictably in multiline command contexts.

---

### Existing Risks

1. **DOM Size Memory Growth**: As the `history` array grows, the DOM tree expands linearly. A command outputting thousands of lines will crash the browser tab due to memory exhaustion and layout recalculation times.
2. **Concurrent Session Desync**: Having multiple sessions active concurrently sharing the same parent file editor reference can lead to out-of-order writes or file conflicts.

---

### Existing Missing Features

1. **Scrollback Buffer Cap**: Missing a boundary configuration (e.g., maximum 50,000 lines) to discard old lines and keep memory footprint stable.
2. **Virtually Rendered Viewport**: Lack of virtual list virtualization to handle large scrollback logs smoothly.
3. **Advanced Keyboard Shortcuts**:
   - `Ctrl+A` / `Ctrl+E`: Jump to start/end of command.
   - `Ctrl+U` / `Ctrl+K`: Clear line before/after cursor.
   - `Ctrl+W` / `Alt+Backspace`: Delete word.
   - `Alt+ArrowLeft` / `Alt+ArrowRight`: Word-by-word cursor movement.
   - `Ctrl+D`: Close session / exit current process.
4. **ANSI Escapes Engine**: Support for decoding standard SGR (Select Graphic Rendition) parameters (e.g., `\x1b[31m`, `\x1b[32m`, `\x1b[1m`) to style text dynamically.

