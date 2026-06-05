# Terminal Focus Audit (TERMINAL_FOCUS_AUDIT.md)

This audit documents the focus states and boundary transitions of the terminal subsystem in Vidyal.ai.

---

### Focus Transitions & Failures

#### 1. Editor → Terminal Focus Transition
- **Behavior**: Clicking the terminal pane correctly triggers `onClick={focusInput}`.
- **Failure/Mismatch**:
  - When the user clicks the "Run Code" button inside the editor panel, the workspace tab switches programmatically to "Terminal", but focus is NOT shifted to the input box. The user is forced to perform an additional click to focus the shell input to continue.
  - No keyboard shortcuts (like ``Ctrl+``` or `Ctrl+\`) exist to toggle focus dynamically between the editor and the active terminal session.

#### 2. Terminal → Editor Focus Transition
- **Behavior**: Clicking the editor textarea shifts focus.
- **Failure/Mismatch**: Focus ring indicators are missing. It is visually indistinguishable whether the editor cursor is active or the terminal is focused unless characters are typed.

#### 3. Modal → Terminal Focus Transition
- **Behavior**: Opening modals (e.g. settings popups or AI overlays) shifts browser focus to the modal.
- **Failure/Mismatch**: Upon closing the modal or compilation overlay, focus is lost in the background. The terminal does not automatically capture focus back, causing keyboard inputs to be ignored until clicked again.

#### 4. Session Switch → Terminal Focus Transition
- **Behavior**: Clicking a terminal session tab switch button (e.g. switching from `bash-1` to `bash-2`) updates the active tab state.
- **Failure/Mismatch**: Focus is not automatically restored to the new session's input element. Clicking the tab button switches the view, but the input caret is lost until the user clicks inside the terminal body area.

#### 5. Browser Tab Return / Window Focus
- **Behavior**: Navigating away from the browser window and returning.
- **Failure/Mismatch**: Window focus event handlers (`window.onfocus`) are not implemented. The terminal does not remember or restore its previous active typing focus stance upon browser window refocus.
