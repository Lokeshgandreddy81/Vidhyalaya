# Terminal Phase 2 Implementation Plan (TERMINAL_IMPLEMENTATION_PLAN.md)

This plan maps the execution paths to close the gap between the simulated Vidyal.ai terminal and elite systems (Cursor, VS Code).

---

## User Review Required

> [!IMPORTANT]
> The audits verified that while the virtualized log lists are fast, several native terminal behaviors are missing or broken, specifically:
> 1. **Visual Selection & Virtualization**: Drag-selecting virtualized rows breaks if the user scrolls, since scrolled-out DOM elements are unmounted. We will implement a custom copy listener (`onCopy` / custom drag state) to resolve this.
> 2. **Keyboard Tab Trap**: Pressing `Tab` inside the terminal input blocks browser focus changes. We will add an `Esc` shortcut to release the tab lock.
> 3. **Wrapped Row Overlaps**: Viewport virtualization desynchronizes on wrapped rows (single rows with height > 22px). We will add responsive container sizing resize observers.
> 4. **IME Composition Invisible States**: Active typing compositions are not rendered visually. We will support rendering underline text markers during IME phases.

---

## Proposed Changes

We will modify `/Users/lokeshgandreddy/Sara/Vidhyalaya/frontend/src/components/ui/ShellTerminal.tsx`.

### 1. Terminal Reliability & Scrollback
- Retain the bounded scrollback history slicing (`-50000`) across all updates.
- Refine smart scroll tracking:
  - If a user has manual scroll active (paused autoscroll), printing lines will display the bottom-right floating badge.
  - Clicking the badge shifts scroll state down smoothly.

### 2. Input Fidelity & IME
- **Active IME Compositions**: Listen to composition events and render the temporary Chinese/Japanese/Korean text inline with an underline style block before commit.
- **Delete key**: Capture `Delete` to sync caret indexes.
- **Pasting**:
  - Intercept native paste events (`onPaste`).
  - Strip excessive margins, and parse multi-line pastes. In a single-line input sandbox, if multiple lines are pasted, execute them sequentially or prompt the user.

### 3. Focus Management
- **Focus Indicators**: Add a visible neon border highlight around the terminal body container when focused.
- **Programmatic Focus Restoration**:
  - Focus the terminal input when the user switches sessions.
  - Focus the terminal input when the "Run Code" click occurs.
  - Restore focus when AI overlays or settings popups close.
  - Restore focus on window/tab activation.
- **Focus Toggle Shortcut**: Add `Ctrl+``` (Backtick) global window handler to toggle focus between code editor and terminal.

### 4. Selection System Overhaul
- **Text Selection copy**: Format copy buffers cleanly, removing prompt prefixes or extra CSS padding characters.
- **Virtualized selection drag**:
  - Track drag selection coordinates. If dragging crosses virtual boundaries, copy selected log elements directly from the `activeSession.history` state data arrays, avoiding browser DOM selection collapse.
- **Keyboard selection**: Support Shift+Arrow keys.
- **Double/triple click**: Sync selection ranges to allow replacing word/line selections on immediate typing.

### 5. Accessibility Enhancements
- **Screen Readers**: Add `role="log"`, `aria-live="polite"`, and `aria-label` tags to log containers.
- **Keyboard navigation**: Add `tabIndex={0}` to session tabs and buttons, allowing standard Tab focus shifting.
- **Tab Lock Escape**: Pressing `Esc` inside the terminal input temporarily bypasses the suggestion key-trap, allowing the user to Tab out of the pane.
- **High Contrast**: Improve contrast ratios of metrics panels and prompts.

### 6. Resize Handling & Reflows
- **Dynamic Row Heights**: Track wrapped lines inside the virtualization range using ResizeObservers or character-length estimates to update relative top offsets dynamically, resolving overlapping elements.
- **Table Columns Scaling**: Add column truncation rules to the `top` metrics table so PIDs and CPU percentages remain formatted on narrow viewports.

---

## Verification Plan

### Automated Tests
- Verify compilation is clean and type-safe via `npm run lint`.
- Test ANSI parsing and caret offset transitions.

### Manual Verification
- Test CJK IME compositions (e.g. typing Chinese characters shows underline).
- Verify copy/paste works for multi-line scripts.
- Verify tabbing out works via the `Esc` escape hook.
- Verify resize transitions do not cause line text overlaps.
