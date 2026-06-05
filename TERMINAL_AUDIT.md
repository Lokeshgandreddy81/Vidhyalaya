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
- **Command Engine**: A synchronous command router structured as a large `switch(mainCommand)` block inside the component. It simulates standard Unix utilities and node actions by pushing mock outputs onto the session history array.

---

### Existing Features

- **Multi-session Tabs**: Creation, switching, and closing of multiple bash shell sessions.
- **Simulated Utilities**: Emulation of `ls`, `pwd`, `whoami`, `date`, `echo`, `cat`, `nano`, `top`, `npm run dev`, `npm run test`, and `ts-node`.
- **Interactive Apps**:
  - A text-area-based mock GNU nano editor that modifies files in the simulated workspace.
  - A mock `top` processor showing running processes and updating system metrics (CPU/MEM) every 1.5 seconds.
- **Bell/Beep Alert**: Beep sound synthesis using the browser Web Audio API, triggered on empty delete/backspace and tab completion failures.
- **Command Suggestions**: Autocomplete suggestion overlay appearing inline, accepted via the Right Arrow key.

---

### Existing Constraints

- **Simulated Environment**: Completely client-side execution. There is no background PTY (Pseudo-terminal) connecting to a real OS shell. Command execution is limited to pre-defined sandboxed routes.
- **State Coupling**: History of the first session (`bash-1`) is coupled directly with parent component state `terminalHistory`, causing sync boundaries.
- **Parent Input Disabling**: During compilation/agent tasks, `isReadOnly` is passed from the parent which blocks all input, displaying a spinning lock banner.

---

### Existing Technical Debt

1. **Monolithic Component Structure**: `ShellTerminal.tsx` contains command parsing, process state management, UI rendering, keyboard input listeners, and the interactive mock editors in a single 1042-line file.
2. **Hardcoded Commands**: Emulated shell commands are tightly coupled with the UI code. Supporting a new command requires editing the `executeCommand` switch block directly.
3. **Static ANSI styling**: ANSI coloration is simulated via primitive substring checks (`log.startsWith('ERROR:')`, `log.includes('✓')`). True ANSI escape sequences outputted by build tools or npm modules are not parsed and render as garbled text.
4. **No Automated Coverage**: Zero unit tests exist for verifying terminal inputs, session closures, command execution flows, or boundary conditions.

---

### Existing Bugs

1. **Incorrect Block Cursor Positioning**: The block cursor (`animate-blink-block`) is statically rendered at the end of the input text: `{terminalInput}<cursor/>`. While the user can press the left/right arrows to move the cursor inside the hidden native `<input>`, the visual cursor remains frozen at the end. Any edits in the middle of a line are rendered at the cursor insert point but look completely disconnected.
2. **Aggressive Autoscroll Override**: The terminal scrolls to the bottom on every single history update. If a user manually scrolls up to inspect previous output logs while a background task is running or printing logs, their view is forcibly scrolled back to the bottom.
3. **Broken Text Selection / Copy-Paste**: Selecting text inside the input line selection is impossible because the real text input is invisible (opacity 0) and the overlaying span displays the visual characters. Highlighting the visual characters does not align with clipboard copy selections.
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
