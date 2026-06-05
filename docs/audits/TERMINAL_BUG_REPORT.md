# Terminal Bug Report (TERMINAL_BUG_REPORT.md)

This report logs the verified terminal issues discovered during the code audit of `ShellTerminal.tsx`.

---

### Bug 1: Cursor Position Desync on Line Editing

- **Symptom**: When editing a command (e.g. typing `npm run dev`, then pressing Arrow Left to change `run` to `exec`), the visual block cursor (`animate-blink-block`) remains fixed at the end of the text. Character inputs occur in the middle of the string, causing characters to jump and render out of order.
- **Root Cause**: The visual block cursor is positioned statically using `{terminalInput}<cursor/>`. The caret offset (`selectionStart`) in the invisible `<input>` is not tracked or used for rendering the visual block.
- **Steps to Reproduce**:
  1. Click in terminal to focus.
  2. Type `npm run dev`.
  3. Press Left Arrow 4 times.
  4. Type `s`. Note that the visual block cursor is still after `dev`, but the typed `s` is inserted in the middle.
- **Resolution Strategy**:
  - Implement dynamic cursor offset tracking in state: `cursorOffset`.
  - Listen to `onKeyDown`, `onKeyUp`, `onClick`, and `onFocus` on the input element to synchronize `inputRef.current.selectionStart` to `cursorOffset`.
  - Slice the input string into two parts at `cursorOffset`: `leftOfCursor` and `rightOfCursor`. Render the cursor block between them:
    `<span>{leftOfCursor}</span><span class="animate-blink-block">cursorChar</span><span>{rightOfCursor}</span>`

---

### Bug 2: Autoscroll Hijacks Manual Log I




















- **Resolution Strategy**:
  - Write an lightweight ANSI-to-HTML parser. It matches SGR parameters (`\x1b[[0-9;]*m`) and splits the line into formatted chunks using standard CSS styles (e.g. `text-red-400`, `font-bold`).

---

### Bug 4: Memory Leak & Layout Thrashing on Long Run Session

- **Symptom**: The terminal slows down, lags, and consumes massive amounts of RAM after long running sessions.
- **Root Cause**: The log history list grows unbounded. React performs full DOM diffs on thousands of mapped paragraphs (`activeSession.history.map`), causing layout engine choking.
- **Steps to Reproduce**:
  - Execute a large loop simulation or continuous script that prints thousands of lines. Observe performance drop.
- **Resolution Strategy**:
  - Implement a scrollback line limit (e.g. max 5,000 lines). When logs exceed the threshold, slice the array: `history.slice(-limit)`.
  - Implement virtual windowing (virtualization) so only lines visible within the viewport (plus a small buffer) are rendered in the DOM.

---

### Bug 5: Keyboard Shortcuts Conflict & Omission

- **Symptom**: Shell commands like `Ctrl+A`, `Ctrl+E`, `Ctrl+U`, `Ctrl+K`, `Ctrl+W`, `Alt+Backspace`, and `Alt+ArrowLeft`/`Right` behave like browser defaults or do nothing, breaking muscle memory for developers.
- **Root Cause**: The key handler `handleKeyDown` in `ShellTerminal.tsx` does not listen for or handle standard terminal control combinations.
- **Steps to Reproduce**:
  - Try to jump to the start of the line with `Ctrl+A` or delete a word with `Ctrl+W` in the terminal input.
- **Resolution Strategy**:
  - Intercept these control keys in `handleKeyDown` and execute their logical equivalents (e.g. set selection index, slice string, clear input buffer) and call `e.preventDefault()`.

