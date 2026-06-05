# Terminal Polish & DX Audit (TERMINAL_POLISH_AUDIT.md)

This audit documents the minor ergonomics, developer experience (DX), and quality-of-life adjustments needed to bring the Vidyal.ai terminal subsystem to Cursor/VS Code parity.

---

### Audit Summary & Gaps Checklist

#### Phase 1 — Command History Experience

*   **1.1 Restore Dirty Input Buffer**
    *   *Current Behavior*: Arrow Up and Arrow Down navigate the `historyStack`. Pressing Arrow Down to return to the active line sets the input to an empty string `""`, wiping any partial command the user typed prior to history browsing.
    *   *Expected Behavior*: Navigating back to the active line (`historyIndex === -1`) should restore the user's partially typed command exactly.
    *   *Recommended Implementation*: Store the uncommitted input in `dirtyInputBuffer` when starting history traversal (first Arrow Up), and restore it when returning to the latest index.
    *   *User Impact*: Restores confidence; users can inspect history without losing typed drafts.
    *   *Priority*: **P0**

*   **1.2 Prevent History Duplicates & Corruption**
    *   *Current Behavior*: Executing the same command multiple times (e.g. running `ls` repeatedly) creates multiple consecutive duplicate entries in the history stack.
    *   *Expected Behavior*: Consecutive duplicate entries should be filtered. Running `ls` five times should append only one entry to the `historyStack`.
    *   *Recommended Implementation*: Check `if (historyStack[historyStack.length - 1] !== commandString)` before appending.
    *   *User Impact*: Keeps history navigation clean and useful.
    *   *Priority*: **P0**

*   **1.3 Reverse History Search (Ctrl+R)**
    *   *Current Behavior*: Ctrl+R triggers default browser reload behavior.
    *   *Expected Behavior*: Intercept Ctrl+R and display an inline reverse-history-search indicator: `(reverse-i-search)'':`. Typing queries matches previous command strings backwards.
    *   *Recommended Implementation*: Introduce `isSearchingHistory` and `searchQuery` states. Intercept keyboard inputs during active search and display matching suggestions inline.
    *   *User Impact*: High developer speed; matches native shell muscle memory.
    *   *Priority*: **P1**

---

#### Phase 2 — Paste Experience

*   **2.1 Multi-Line Paste Protection**
    *   *Current Behavior*: Pasting a block of code with newlines immediately splits and executes every line sequentially.
    *   *Expected Behavior*: If pasted content has newlines, display an overlay safety prompt: `"X lines pasted. Press Enter to execute."` rather than auto-executing immediately.
    *   *Recommended Implementation*: Intercept `onPaste`. If text has lines count > 1, buffer it into a multi-line confirmation state and prompt the developer before executing.
    *   *User Impact*: Protects from executing dangerous scripts accidentally.
    *   *Priority*: **P0**

---

#### Phase 3 — Command Editing Experience

*   **3.1 Ergonomic Word Skips**
    *   *Current Behavior*: Word skips (`Alt+ArrowLeft/Right`) skip entire chunks, jumping past paths or flags in single bounds.
    *   *Expected Behavior*: Skipping should stop at paths delimiters (`/`) and flags flags (`-`), allowing precise navigation of arguments.
    *   *Recommended Implementation*: Refine boundary character regex splits inside the navigation handler to treat `/`, `-`, and `.` as boundary stops.
    *   *User Impact*: Effortless command line editing.
    *   *Priority*: **P1**

---

#### Phase 4 — Command Completion Experience

*   **4.1 Multi-Match Dropdown Autocomplete**
    *   *Current Behavior*: Pressing Tab autocompletes to the first matching string candidate in alphabetical order.
    *   *Expected Behavior*: If multiple candidates match (e.g., typing `cd ex` matches both `exercises/` and `exports/`), display a small floating dropdown list showing the options instead of guessing.
    *   *Recommended Implementation*: Add a `matchesList` suggestion state. If candidates count > 1 on Tab, display a floating portal dropdown. Allow Up/Down arrow selections.
    *   *User Impact*: Eliminates autocomplete frustration.
    *   *Priority*: **P0**

---

#### Phase 5 — Output Experience

*   **5.1 Visual Hierarchy & Semantic Layouts**
    *   *Current Behavior*: Output logs are rendered as flat strings. ANSI colors are mapped, but line borders and container weights are uniform.
    *   *Expected Behavior*: Visual highlights for errors (light red row tint, alert icon), success (emerald tint, check icon), and warnings.
    *   *Recommended Implementation*: Wrap render lines in structured components matching log types to render visual bullet margins and backgrounds.
    *   *User Impact*: Instant scanning of compiler and lint stutters.
    *   *Priority*: **P1**

*   **5.2 Copy Output Submenus**
    *   *Current Behavior*: No options to select distinct ranges for copying.
    *   *Expected Behavior*: Hovering over rows displays quick-copy buttons: "Copy Line", "Copy Block", "Copy All".
    *   *Recommended Implementation*: Overlay buttons on row focus.
    *   *User Impact*: Quick extraction of error stacktraces.
    *   *Priority*: **P2**

---

#### Phase 6 — Terminal Trust Signals

*   **6.1 Exit Status Codes & Timers**
    *   *Current Behavior*: When a command finishes executing, it appends standard outputs and immediately draws the prompt line.
    *   *Expected Behavior*: Display exit signals and execution timers:
      ```bash
      ✓ Process completed | Exit Code: 0 | Completed in 1.45s
      ```
    *   *Recommended Implementation*: Store timestamp on execution. Append exit banners to the history log when returning process state to idle.
    *   *User Impact*: High trust signals for compilation runs.
    *   *Priority*: **P0**

---

#### Phase 7 — Session Experience

*   **7.1 Session State Persistence**
    *   *Current Behavior*: Browser reloads reset the entire terminal sessions state.
    *   *Expected Behavior*: Terminal session tab histories, active working directory, and command stacks are persisted across reloads.
    *   *Recommended Implementation*: Hydrate and persist session state arrays to `localStorage` on component mount and update events.
    *   *User Impact*: Prevents loss of state context on network glitches.
    *   *Priority*: **P0**

*   **7.2 Session Rename, Duplicate & Activity Indicators**
    *   *Current Behavior*: Session tabs have hardcoded titles (`bash (1)`).
    *   *Expected Behavior*: Double-clicking tabs enables inline rename inputs. Hovering shows last active timestamp: `Last Active: 2m ago`.
    *   *Recommended Implementation*: Track `lastActiveTimestamp` per session. Add double-click state to session Chrome tab render.
    *   *User Impact*: Intuitive multi-task management.
    *   *Priority*: **P1**

---

#### Phase 8 — Quality of Life Features

*   **8.1 Directory Breadcrumb Display**
    *   *Current Behavior*: Working directory is shown in the prompt line (`exercises %`).
    *   *Expected Behavior*: Display active path breadcrumbs in the header bar.
    *   *Recommended Implementation*: Render the absolute sandbox path in the header chrome.
    *   *User Impact*: Permanent spatial awareness.
    *   *Priority*: **P1**

---

#### Phase 9 — Cursor & Codex Parity Analysis

| Micro-friction Category | Target Product Standard | Current Vidyal.ai Gaps | Recommendation | Priority |
| :--- | :--- | :--- | :--- | :---: |
| **Typing Feel** | Canvas WebGL zero-jank typing. | Small append lag at 500k lines. | Optimize `useMemo` caching to prevent full array iteration on appends. | P1 |
| **Search Feel** | Instant, recursive history search. | Missing reverse search history. | Implement Ctrl+R query search parser. | P1 |
| **Tab Completion** | Dropdown option list with grid navigation. | Guessing next alphabetical match. | Implement options dropdown on multi-match. | P0 |
| **Session Control** | Persistent background processes. | React-bound memory wipes. | Add LocalStorage hydration layer. | P0 |
