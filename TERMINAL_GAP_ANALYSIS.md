# Terminal Gap Analysis (TERMINAL_GAP_ANALYSIS.md)

This analysis evaluates the gap between the simulated terminal in Vidyal.ai and world-class terminal experiences (Cursor, Codex, VS Code Terminal, Ghostty, Warp) across key performance and behavioral categories.

---

| Feature / Behavior | Elite Terminals (Cursor, VS Code, Warp, Ghostty) | Vidyal.ai Simulated Terminal | Gap / Actions Required |
| :--- | :--- | :--- | :--- |
| **Input Latency** | **Instant (< 16ms)**. Rendered via GPU Canvas/WebGL (e.g. xterm.js or custom Rust engines). Key presses show up on the next screen refresh. | **Variable (16ms to 120ms+)**. Managed via React state (`onChange`). Latency scales with log history size due to full DOM re-renders. | **Critical**. Decouple input rendering from history list re-renders. Render input cursor based on character indices. |
| **Output Latency & Throughput** | **Ultra-high**. Bounded ring-buffers, chunked parsing, and virtualization enable printing of thousands of lines/sec without UI freezes. | **Low**. Appending output lines requires pushing strings to a state array and mapping all lines to DOM elements, blocking the main thread. | **Critical**. Implement terminal scrollback virtualization (windowing/slice rendering) to limit DOM nodes. |
| **Command Execution Flow** | **Asynchronous / Streaming**. Streams real stdout/stderr chunks from PTY processes. Handles complex ANSI escape color trees. | **Synchronous / Bulk**. Pushes preset logs instantly or in mock interval chunks. Colors are statically determined via string prefix matching. | **High**. Introduce robust ANSI parser to decode SGR commands dynamically. Standardize output formatting. |
| **Scroll Behavior** | **User-Respecting**. Smooth scrolling with smart scroll lock (user scroll-up pauses auto-scroll; returning to bottom re-enables it). | **Aggressive Auto-scroll**. Always forces scroll-to-bottom on history change, interrupting manual log inspection. | **High**. Monitor scroll state (`scrollTop`, `scrollHeight`, `clientHeight`) and only autoscroll if user is already at the bottom. |
| **Selection & Clipboard** | **Native & Intuitive**. Double/triple click select words/lines. Option-drag block select. Standard clipboard actions copy raw text. | **Broken / Web-naive**. Double/triple click word editing in input is desynced. Log selection copies prompt templates and raw HTML. | **High**. Make input focusable and caret visible by syncing cursor character offsets. Clean terminal selection copying. |
| **Focus Handling** | **Highly Visual & Sticky**. Clear active outline states. Keyboard keys are captured cleanly. Editor/terminal toggling is fluid. | **Fragile**. Focus is easily lost. No visual indicator of terminal focus state vs. code editor focus state. | **Medium**. Implement a visual focus state indicator and global focus handlers so typing redirects focus back. |
| **Resize Handling** | **Dynamic Reflow**. Sends SIGWINCH signal to PTY. Reflows line wraps, recalculating width columns and row layout dynamically. | **Naive Wrapping**. Relies on browser CSS `whitespace-pre-wrap` which breaks aligned tables (like `top`) on small screens. | **Medium**. Recalculate columns based on terminal width and adapt table layouts to prevent text corruption. |

---

### Detailed Gap Summary

1. **Input caret desync**:
   In VS Code and Cursor, the terminal caret is a physical indicator of the editor's insert point. In Vidyal.ai, the input is invisible, and the caret is hardcoded at the end of the text. Pressing left/right arrows moves the input caret but leaves the visual cursor stuck, causing typing in the middle of a command to appear corrupted.
2. **Scroll hijacking**:
   Elite terminals allow you to read logs while process builds run in the background. In Vidyal.ai, any background tick or output event grabs the window scroll position and jerks it to the bottom, breaking readability.
3. **ANSI styling missing**:
   Elites support 24-bit color, bold, italics, underline, and clear screen escapes. Vidyal.ai displays plain strings or hardcoded color maps, printing raw escape codes when standard output logs contain color formatting.
4. **DOM bloat**:
   Elite terminals virtualize the rendering buffer, displaying only the ~30-50 lines visible in the viewport. Vidyal.ai renders every single line in history, leading to massive memory usage and rendering lag on long runs.
