# Terminal Feel & DX Audit (TERMINAL_FEEL_AUDIT.md)

This report audits the qualitative user experience, ergonomics, trust signals, and "developer feel" of the Vidyal.ai terminal simulator. 

---

### Phase 1 — Typing Feel Audit

*   **1.1 Custom Cursor Teleport vs. Smooth Slide**
    *   *Current Behavior*: The visual block cursor jumps instantly to the character editing offset on navigation.
    *   *Why It Feels Wrong*: Professional terminals (like Cursor or Warp) use GPU sub-pixel transitions: the cursor smoothly slides between characters during arrow navigations and has a slight breath fade animation rather than an on/off state.
    *   *Expected Behavior*: Sub-pixel transitions make cursor navigation feel fluid and responsive.
    *   *Proposed Improvement*: Implement CSS transition coordinates or a slide transform class when the cursor shifts indices.
    *   *User Impact*: Enhances typing comfort.
    *   *Priority*: **P1**

*   **1.2 Sub-pixel Font Antialiasing**
    *   *Current Behavior*: Terminal monospaced characters look slightly thick or soft on dark backgrounds under standard rendering.
    *   *Why It Feels Wrong*: Native code editors utilize precise font-smoothing rules to preserve monospaced legibility at small dimensions.
    *   *Expected Behavior*: Clean, crisp monospaced code text.
    *   *Proposed Improvement*: Apply `-webkit-font-smoothing: antialiased` and `-moz-osx-font-smoothing: grayscale` to the log list.
    *   *User Impact*: Reduces eye strain during long development runs.
    *   *Priority*: **P0**

*   **1.3 Input Inactive Dimming**
    *   *Current Behavior*: When clicking out of the terminal (focus shift to editor), the visual cursor is hidden, but the prompt text and typing line remain at full contrast.
    *   *Why It Feels Wrong*: Developers rely on visual focus states to know where keystrokes will land. Without clear dimming, it looks like the terminal is still active.
    *   *Expected Behavior*: Active typing line dimming when blurred.
    *   *Proposed Improvement*: Shift prompt opacity to `opacity-60` and fade colors when `isFocused` is false.
    *   *User Impact*: Wards off accidental typing in blurred panes.
    *   *Priority*: **P0**

---

### Phase 2 — History Feel Audit

*   **2.1 Dirty Buffer Collapse on History Return**
    *   *Current Behavior*: Browsing the history stack (Arrow Up/Down) and returning to the latest line (`historyIndex === -1`) wipes out whatever uncommitted text the user was typing.
    *   *Why It Feels Wrong*: Erasing a half-written command is highly frustrating for power users.
    *   *Expected Behavior*: The dirty input buffer is fully restored when returning from history.
    *   *Proposed Improvement*: Cache uncommitted commands when Arrow Up is pressed, and restore them when returning.
    *   *User Impact*: Prevents losing work.
    *   *Priority*: **P0**

*   **2.2 History Selection Pointer Visibility**
    *   *Current Behavior*: Browsing history replaces the prompt line input value silently.
    *   *Why It Feels Wrong*: The user cannot tell *where* they are in history (e.g. "am I looking at a command from 5 minutes ago or my last run?").
    *   *Expected Behavior*: Subtle visual cues showing the history pointer depth (e.g. a small indicator like `[1/12]` next to prompt or search query).
    *   *Proposed Improvement*: Render history index ratios on navigation.
    *   *User Impact*: Predictable command recall.
    *   *Priority*: **P2**

---

### Phase 3 — Command Execution Feel

*   **3.1 Dry Process Interrupts**
    *   *Current Behavior*: Pressing `Ctrl+C` immediately appends `^C` and draws a new prompt line.
    *   *Why It Feels Wrong*: It looks like a static text replace rather than a process receiving a signal and gracefully shutting down.
    *   *Expected Behavior*: Subtle execution delay, exit indicators, and a clean shutdown message.
    *   *Proposed Improvement*: Add a 50ms terminal signal delay and display a styled interrupt banner (`✗ Process terminated via SIGINT`).
    *   *User Impact*: Builds trust in active process controls.
    *   *Priority*: **P1**

*   **3.2 Static Progress Indication**
    *   *Current Behavior*: Running a process displays a simple text string like `compiling blueprint graph...` with a blinking bar.
    *   *Why It Feels Wrong*: There is no progress feedback.
    *   *Expected Behavior*: Fluid progress lines or animated spinner indicators showing execution stages.
    *   *Proposed Improvement*: Render active progress bars or spinning trust indicators.
    *   *User Impact*: Assures the user the system hasn't frozen.
    *   *Priority*: **P1**

---

### Phase 4 — Output Feel Audit

*   **4.1 Uniform Log Line Borders**
    *   *Current Behavior*: Normal log rows, error lines, and compiler outputs look identical except for text color.
    *   *Why It Feels Wrong*: Hard to visually scan long logs to find warning blocks or compiler exit states.
    *   *Expected Behavior*: Tinted containers and icons representing line severity.
    *   *Proposed Improvement*: Render error rows with a background tint (`bg-rose-500/5`) and warning lines with amber margins.
    *   *User Impact*: High scan speed for stack traces.
    *   *Priority*: **P1**

*   **4.2 Scrollbar Interference**
    *   *Current Behavior*: The scrollbar is permanent, covering text lines on the right container margin.
    *   *Why It Feels Wrong*: Visual clutter in developer viewports.
    *   *Expected Behavior*: Overlay scrollbar style that fades in on hover/scroll and hides automatically.
    *   *Proposed Improvement*: Use webkit overlay scrollbar CSS rules.
    *   *User Impact*: Clean screen spaces.
    *   *Priority*: **P2**

---

### Phase 5 — Search Feel Audit

*   **5.1 Command Search Discoverability**
    *   *Current Behavior*: The command search triggers on autocomplete candidates.
    *   *Why It Feels Wrong*: Cannot easily search the terminal logs or previous commands lists.
    *   *Expected Behavior*: Standard `Ctrl+F` in-terminal buffer search.
    *   *Proposed Improvement*: Implement a small sliding search pane to search active history lists.
    *   *User Impact*: Effortless error retrieval.
    *   *Priority*: **P2**

---

### Phase 6 — Terminal Trust Audit

*   **6.1 Absolute Directory Prompt Contrast**
    *   *Current Behavior*: The active directory prompt is white/45.
    *   *Why It Feels Wrong*: Lack of visual identity; directory paths don't stand out from standard console texts.
    *   *Expected Behavior*: Directory prompts should utilize distinct HSL tint colors (like zsh themes) to highlight the active boundary.
    *   *Proposed Improvement*: Color directory paths in emerald/blue.
    *   *User Impact*: Clean spatial awareness.
    *   *Priority*: **P1**

---

### Phase 7 — Recovery Experience Audit

*   **7.1 Page Refresh Wipes Context**
    *   *Current Behavior*: Refreshing the page wipes all terminal sessions and histories.
    *   *Why It Feels Wrong*: High risk of data loss. Accidentally hitting CMD+R destroys all build logs.
    *   *Expected Behavior*: Terminal session state is hydrated from local cache.
    *   *Proposed Improvement*: Save/restore histories in localStorage.
    *   *User Impact*: Zero stress on reloads.
    *   *Priority*: **P0**

---

### Phase 8 — Power User Experience Audit

*   **8.1 Missing Custom Context Menus**
    *   *Current Behavior*: Right-clicking the terminal displays browser native options.
    *   *Why It Feels Wrong*: Breaks terminal workflows (users expect quick clear/copy operations on right click).
    *   *Expected Behavior*: Custom context menu with terminal quick-actions.
    *   *Proposed Improvement*: Implement custom `onContextMenu` handler.
    *   *User Impact*: Smooth secondary click menus.
    *   *Priority*: **P2**

---

### Phase 9 — Parity Review Remaining Gaps

*   **9.1 Double-Click Path Selection**
    *   *Current Behavior*: Double-clicking a path string selects only single words.
    *   *Expected Behavior*: Double-clicking `exercises/quiz.test.ts` highlights the entire path for copying.
    *   *Proposed Improvement*: Adjust path word separators in selection hooks.
    *   *User Impact*: Fast path copying.
    *   *Priority*: **P1**

---

### Parity Checklist: The First 20 Things a Senior Developer Would Notice "Feels Off"

1.  **Cursor Teleporting**: Instant block jumps without sub-pixel sliding.
2.  **No Focus Dimming**: Visual cursor disappears but prompt text remains bright.
3.  **Command History Loss**: Typing a draft, checking history, and returning to bottom wipes the draft.
4.  **Duplicates in History**: Successive duplicate executions pollute the Arrow-Up history.
5.  **Browser Context Menu**: Right-click brings up browser elements instead of Terminal options.
6.  **No Text Selection Copy Feedback**: Selection highlight doesn't brief-flash to verify clipboard capture.
7.  **Destructive Multi-line Pastes**: Pasting newline scripts runs them instantly with no warnings.
8.  **Guessing Tab Autocompletions**: Alphabetical matching instead of grid dropdown selection.
9.  **No Elastic Scrolling**: Viewport lacks rubber-band bounce when scrolling hits terminal limits.
10. **Font Antialiasing**: Text rendering can look soft/thick on dark backgrounds without OS smoothing filters.
11. **Abrupt Scrollbars**: Scrollbar bar covers terminal characters and lacks smooth fading transitions.
12. **Double-click path splits**: Path selections break on slashes `/` instead of highlighting the entire string.
13. **Instant Metrics Flipping**: CPU/RAM numbers change abruptly without smooth transitions.
14. **No Session Last-Active Indicators**: Inactive tabs lack relative timestamp tooltips.
15. **Wiped state on refresh**: All sessions are completely lost on tab reloads.
16. **No Terminal Clear Sweeper**: Running `clear` wipes the view instantly without transition animations.
17. **Lack of exit code signals**: Successful mock tasks return to prompts with no exit summary.
18. **Unannounced Screen Reader Outputs**: Missing live announcements when new logs stream.
19. **Tab Lock Escape alert**: ESC alerts the user but doesn't transition out silently.
20. **No Execution Timers**: Cannot tell how long mock compilation runs took.
