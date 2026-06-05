# Terminal Release Review (TERMINAL_RELEASE_REVIEW.md)

This release review details the criteria checklist required to approve the upgraded terminal subsystem for production deployment.

---

### Production Readiness Checklist

Each criteria must be manually verified and backed by test evidence prior to merge:

#### 1. Input Engine Reliability
- [ ] Text editing behaves correctly when cursor is placed in the middle of a command (character insertions occur at cursor, visual block caret aligns perfectly).
- [ ] Arrow navigation keys (`ArrowLeft`, `ArrowRight`, `Home`, `End`) shift the visual caret correctly.
- [ ] Emacs command shortcuts (`Ctrl+A`, `Ctrl+E`, `Ctrl+U`, `Ctrl+K`, `Ctrl+W`) function as intended.
- [ ] IME characters are supported cleanly.
- [ ] Tab completions do not lag or jump focus.

#### 2. Rendering Performance
- [ ] Logging 10,000+ output lines does not freeze the browser tab.
- [ ] Typing response time is under 16ms even with a full scrollback buffer.
- [ ] Virtual list recycling renders correctly when scrolling rapidly (no flickering or white spaces).
- [ ] Output lines containing SGR ANSI escape parameters render with correct colors (bold, red, green, etc.).

#### 3. UX Authenticity & Scroll
- [ ] User manual scroll position is preserved when background tasks append new output lines (autoscroll is paused).
- [ ] Autoscroll resumes immediately when user manually scrolls back to the very bottom of the log viewport.
- [ ] Text selection allows highlight-copying text cleanly from the terminal log list.
- [ ] Metrics (CPU/RAM) animate cleanly without interrupting active typing inputs.

#### 4. Session & Process Control
- [ ] Creating new sessions initiates clean states and distinct history logs.
- [ ] Switching between sessions doesn't reset scrolling offsets or focus.
- [ ] Terminating a session deletes it from memory and properly re-focuses the adjacent active session.
- [ ] Foreground processes (`npm run dev`, `top`, `nano`) interrupt cleanly upon pressing `Ctrl+C`.

---

### Verification and Approval Sign-Off

- **Lead Engineer Signature**: ________________________
- **Product Officer Approval**: ________________________
- **Status**: **PENDING REVIEW**
