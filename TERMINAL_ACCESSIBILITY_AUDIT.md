# Terminal Accessibility Audit (TERMINAL_ACCESSIBILITY_AUDIT.md)

This audit evaluates the accessibility of the Vidyal.ai terminal simulator under WCAG 2.1 guidelines.

---

### Accessibility Checklist & Gaps

#### 1. Screen Reader Compatibility
- **Status**: **FAILED**
- **Inspection Findings**:
  - The scrollback buffer list lacks a structural container role (e.g. `role="log"` or `aria-live="polite"`). New outputs printed in the terminal are not announced to screen readers.
  - The typing `<input>` is invisible (`opacity-0`) and lacks any `aria-label`, `aria-describedby`, or descriptive text, offering no context on what shell is active.

#### 2. Keyboard-Only Navigation & Tab Traps
- **Status**: **FAILED**
- **Inspection Findings**:
  - **Keyboard Tab Trap**: Pressing `Tab` inside the terminal text input is intercepted to autocomplete suggestions and calls `e.preventDefault()`. There is no escape sequence (like `Esc` then `Tab`) to tab out of the terminal. Keyboard-only users are trapped indefinitely inside the terminal input.
  - **Unreachable Tabs**: The terminal session tabs (such as the switch button and session close `✕` button) lack `tabIndex` attributes and cannot be reached or activated using keyboard navigation.

#### 3. Focus Indicators & Contrast
- **Status**: **FAILED**
- **Inspection Findings**:
  - **Missing Focus Outlines**: There is no visible outline or ring around the terminal viewport, the active tab, or the input line when focused.
  - **Contrast Ratios**: The dimmed text segments (such as prompt directory paths in `text-white/45` and settings labels in `text-white/20`) fail the WCAG AA minimum contrast ratio (4.5:1) against the dark background (`#161616`).

#### 4. Reduced Motion & ARIA Elements
- **Status**: **FAILED**
- **Inspection Findings**:
  - The terminal cursor block uses `animate-blink-block` and overlays use `animate-pulse` without checking `@media (prefers-reduced-motion: reduce)`.
  - There are no ARIA labels or semantic roles on the session list, metrics panel, or process termination button.
