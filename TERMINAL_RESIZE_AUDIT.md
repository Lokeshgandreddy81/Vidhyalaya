# Terminal Resize Audit (TERMINAL_RESIZE_AUDIT.md)

This audit documents layout, wrapping, and table alignment failures in the terminal subsystem during viewport size changes.

---

### Layout Resizes & Failures

#### 1. Text Wrapping and Virtualization Drift
- **Test Widths**: 320px, 768px, 1024px
- **Failure**:
  - In our current virtualized list rendering, the virtual spacer height is calculated as `totalLines * ROW_HEIGHT` (where `ROW_HEIGHT = 22px`).
  - When the viewport is narrow (320px or 768px) and a log line wraps visually due to CSS `whitespace-pre-wrap`, that item's DOM height expands to 44px or 66px.
  - Because virtualization calculates positioning based on a static `22px` height, the physical heights of wrapped lines desynchronize from the offset positions. This causes subsequent terminal log rows to overlap, clip behind each other, or leave double-spaced visual gaps.

#### 2. Visual Caret Wrapping
- **Test Widths**: 320px, 768px
- **Failure**: On narrow screen spaces, if a command input approaches the right edge, the visual block cursor wraps to a new line on its own, leaving the cursor blinking on an empty line while the text remains on the line above.

#### 3. Metrics Tables Formatting (`top`)
- **Test Widths**: 320px, 768px
- **Failure**:
  - The simulated `top` utility utilizes a raw HTML table to align PIDs, command names, CPU percentages, and RAM metrics.
  - On narrow screens (320px), the columns compress and overlap, making the text columns illegible. There is no responsive column-trimming or overflow guard.

#### 4. Selection Alignment on Wrapped Rows
- **Test Widths**: Any layout width
- **Failure**: Drag-selecting text across wrapped lines selects screen-space blocks horizontally, rather than following terminal row cells, resulting in copied blocks containing layout breaks and prompt prefixes.
