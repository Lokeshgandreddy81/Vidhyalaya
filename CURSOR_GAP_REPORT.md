# Cursor Gap Analysis Report (CURSOR_GAP_REPORT.md)

This report details the architectural and behavioral gaps remaining between the upgraded simulated terminal in Vidyal.ai and the industry-standard developer terminal in Cursor/VS Code.

---

### Feature Comparison Matrix

| Feature / Behavior | Cursor / VS Code Terminal | Vidyal.ai Simulated Terminal | Remaining Gap | Priority |
| :--- | :--- | :--- | :--- | :---: |
| **Grid Cell Selection** | Character-precise rectangular selection (`Option+drag`). | Row-level selection only (highlights whole lines). | Cannot select part of a line across multiple rows. | Medium |
| **Bracketed Paste** | Protects inputs. Warns on large text paste. | Splits and blindly executes multi-line inputs. | Lacks large-text paste protection warning blocks. | Medium |
| **Interactive CLI** | Emulates VT100 grids. Supports `vi`, `htop`, prompts. | hardcoded React overlay viewports (`nano`, `top` mockups). | Cannot run arbitrary interactive tools. | High |
| **Resize Reflow** | Dynamic width cell folding (`SIGWINCH` reflow). | Approximates height wrappers. Hides metrics columns. | Absolute cell alignment can drift on custom commands. | Low |
| **Keystroke Sequences** | Transmits raw hex signals (e.g. `Ctrl+R`, `Ctrl+Z`). | Listens to specific keystroke codes. | No support for search history (`Ctrl+R`) or jobs (`Ctrl+Z`). | Low |
| **State Persistence** | Session processes persist behind panel closures. | State resides in React component memory. | Browser refresh or tab closure completely wipes history. | High |

---

### Detailed Gap Explanations

#### 1. Selection & Copying Resolution
*   *Cursor*: Operates on a grid of cells. Highlighting allows character-precise coordinates.
*   *Vidyal.ai*: In our scrollback list, because elements are virtualized, dragging mouse selections across rows is simulated at the line level. While this successfully preserves highlights during fast scroll, it makes it impossible to copy a *portion* of text inside a line (e.g., copying just a SHA hash) if the selection spans more than one row.

#### 2. Paste Protection & Bracketed Paste Mode
*   *Cursor*: Supports Bracketed Paste Mode (`\x1b[200~`). If a user pastes a multi-line block, the shell wraps it to prevent immediate execution, giving the user a chance to review it.
*   *Vidyal.ai*: Pasting multi-line content splits on newlines and executes each line sequentially in `executeCommand`. If a user accidentally pastes a script containing destructive commands, they will run instantly without validation gates.

#### 3. Core Shell Emulation (VT100)
*   *Cursor*: Connected to a backend PTY shell. The rendering terminal acts as a passive viewport decoder.
*   *Vidyal.ai*: The terminal is an application emulator. It is forced to rebuild visual mockups for every CLI screen (e.g., custom textareas for `nano`, custom tables for `top`). We cannot run generic terminal-based apps (like `vim`, `less`, `pytest` progress bars, `docker compose` logs) without manually writing React mocks for each tool.

#### 4. Persistent Sessions
*   *Cursor*: Closing the terminal panel merely hides the terminal container; backend shell processes keep running.
*   *Vidyal.ai*: Since states are tied directly to the React component tree inside `sessions`, closing a tab or refreshing the browser instantly terminates all processes and wipes command histories, causing loss of developer context.
