# Terminal Selection Audit (TERMINAL_SELECTION_AUDIT.md)

This audit analyzes the mouse and keyboard selection engine in the Vidyal.ai terminal, benchmarking it against Cursor and VS Code.

---

### Selection Behaviors & Mismatches

#### 1. Click Selections
- **Single Click**:
  - *Cursor*: Focusing is immediate. Caret places at closest character boundary.
  - *Vidyal.ai*: Focuses input and syncs cursor offset correctly via click boundaries.
- **Double Click (Word Selection)**:
  - *Cursor*: Selects the hovered word. In the input line, typing immediately overrides the selected word.
  - *Vidyal.ai*: **Mismatch**. In the log buffer, standard browser double-click selects words. However, on the active typing line, double-clicking highlights the visual overlay span characters, but does NOT select the hidden native input text. Typing a new character appends it at the previous cursor position instead of replacing the selected word.
- **Triple Click (Line Selection)**:
  - *Cursor*: Selects the entire row of the terminal viewport.
  - *Vidyal.ai*: **Mismatch**. Highlights the visual text nodes. On the active typing line, triple-clicking fails to sync selection boundaries to the hidden native `<input>`, breaking overwrite behavior.

#### 2. Drag Selection & Virtualization Conflicts
- **Drag Selection**:
  - *Cursor*: Smooth drag selection. Supports scrolling the terminal view while dragging selection past boundaries.
  - *Vidyal.ai*: **Critical Mismatch**. Because we use React list virtualization to render only visible lines, any log rows scrolled out of the viewport are unmounted and deleted from the DOM.
  - *The virtualization selection bug*: If a user starts drag-selecting logs and scrolls up, the items they highlighted at the bottom are unmounted. The browser's native text selection engine loses track of the unmounted DOM elements, causing the highlight block to collapse or copy corrupt/incomplete data. It is impossible to naturally drag-select more than one viewport screen of virtualized logs.

#### 3. Keyboard Selection (Shift+Arrows)
- **Keyboard Selection**:
  - *Cursor*: Pressing `Shift+Arrow` highlights text range for copying.
  - *Vidyal.ai*: **Mismatch**. Keyboard-driven selection is completely unsupported on the active typing line because selection highlighting is not mapped or styled dynamically on the visual overlay spans.

#### 4. Clipboard copy/paste
- **Copying Logs**:
  - *Cursor*: Copies raw, unformatted clean text strings.
  - *Vidyal.ai*: **Mismatch**. Drag-copying captures CSS spaces, prompt text tags, and formatting layouts, pasting them with weird spacing and line breaks.
