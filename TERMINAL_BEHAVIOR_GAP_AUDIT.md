# Terminal Behavior Gap Audit (TERMINAL_BEHAVIOR_GAP_AUDIT.md)

This audit benchmarks the simulated terminal input and editing experience in Vidyal.ai against world-class developer terminals (Cursor, Codex, VS Code Terminal, Warp, Ghostty).

---

### 1. Cursor Movement & Caret Navigation

| Action | Elite Terminal Behavior | Vidyal.ai Behavior | Gap / Mismatch |
| :--- | :--- | :--- | :--- |
| **Arrow Left / Right** | Caret shifts character by character with zero lag. | Caret shifts character by character. Visual cursor block splits inline characters. | None. Custom text-splitting renders caret accurately. |
| **Home / End** | Instantly jumps cursor to the beginning / end of line. | Jumps native input cursor and visual cursor block instantly. | None. Synchronized in `handleKeyDown`. |
| **Ctrl+A / Ctrl+E** | Standard Emacs hotkeys to jump to start/end of line. | Intercepted in `handleKeyDown` and moves caret offset correctly. | None. |
| **Alt+ArrowLeft / Right** | Jumps cursor word-by-word (skips spaces and punctuation). | Intercepted in `handleKeyDown` using regex word matches. | Minor mismatch. Skip boundaries on complex path strings (e.g., `/usr/local/bin`) may skip paths differently. |

---

### 2. Editing Shortcuts

| Shortcut | Elite Terminal Behavior | Vidyal.ai Behavior | Gap / Mismatch |
| :--- | :--- | :--- | :--- |
| **Backspace** | Deletes character behind caret. | Deletes character behind caret. Visual block offsets update. | None. |
| **Delete** | Deletes character in front of caret. | Deletes character. Caret offset remains unchanged. | Minor mismatch. Keydown of `Delete` does not explicitly trigger keydown state synchronization immediately. |
| **Ctrl+U** | Clears the entire line before the cursor. | Clears text to the left of `cursorOffset` and adjusts offset to 0. | None. |
| **Ctrl+K** | Clears the entire line after the cursor. | Clears text to the right of `cursorOffset`. | None. |
| **Ctrl+W / Alt+Backspace** | Deletes the word behind the cursor. | Slices text to the left of `cursorOffset` using boundary regex. | None. |

---

### 3. Clipboard & Paste Experience

- **Single Line Paste**:
  - *Elite Terminals*: Pastes text instantly at the cursor location.
  - *Vidyal.ai*: Pastes correctly since the hidden native `<input>` receives the paste event and triggers `onChange`.
- **Multi-Line Paste**:
  - *Elite Terminals*: Pastes lines sequentially, executing each line if it ends with a newline, or wraps them in brackets (bracketed paste mode).
  - *Vidyal.ai*: **Mismatch**. Because the terminal input uses a native single-line `<input type="text">`, standard browser behavior strips newline characters (`\n` and `\r`) from pasted content or converts them into spaces. Pasting a multiline script block results in a single flattened line, which fails to execute sequentially.
- **Large Paste Overhead**:
  - *Elite Terminals*: Efficiently handles pasting megabytes of text with warning prompts ("Are you sure you want to paste...").
  - *Vidyal.ai*: **Mismatch**. No guard warnings are implemented. Pasting massive texts into the hidden single-line input can lag the input state thread.

---

### 4. IME Composition Support (CJK & Accents)

- **Active Composition (IME)**:
  - *Elite Terminals*: Displays the active composing characters (e.g., Pinyin inputs or accents) inline with a temporary underline decoration before commit.
  - *Vidyal.ai*: **Mismatch**. While composition events are listened to (`onCompositionStart` / `onCompositionEnd` sets `isComposing`), during active composition the visual text overlay only reflects committed state. The intermediate composing characters are invisible because the native input has `opacity-0` and the visual span is only updated on commit. This makes CJK typing feel blind and disconnected.
