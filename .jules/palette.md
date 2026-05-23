## 2024-05-09 - Accessibility of Rich Text Editor Controls
**Learning:** Custom implementations of rich text editors (like the one in `StudySession.tsx` using `contentEditable`) often miss standard accessibility attributes on their custom toolbar buttons since they aren't native `<button>`s with text. This makes them completely invisible or confusing to screen readers.
**Action:** Always verify that custom UI controls, especially formatting toolbars, have descriptive `aria-label` and `title` attributes, even if their visual meaning is obvious through icons like Bold or Italic.
