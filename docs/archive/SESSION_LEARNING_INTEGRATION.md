# Cortex Session Learning Integration

This document specifies the layout, components, interactive state transitions, and styling parameters for integrating the Cortex Learning Terminal into the primary **Study Session workspace** (`StudySession.tsx`).

---

## 1. Split-Pane Layout Grid

To avoid cognitive overload, the terminal is positioned as a collapsible bottom drawer, leaving the main workspace clear for the code editor, instructions, and interactive neural maps.

```text
┌──────────────────────────────────────────────────────────────────┐
│  VIDYAL.AI HEADER (Learning Progress, Streak Tracker, Goal Nav)  │
├────────────────────────────────┬─────────────────────────────────┤
│                                │                                 │
│                                │                                 │
│         INSTRUCTION &          │        NEURAL MAP / CODE        │
│          CHAT WINDOW           │             EDITOR              │
│                                │                                 │
│                                │                                 │
├────────────────────────────────┴─────────────────────────────────┤
│ ⌨️ CORTEX SHELL: Mission: Git Basics | Step 1/3 (CD into repo)  ▲ │
└──────────────────────────────────────────────────────────────────┘
```

The split pane uses a fluid grid structure:
- **Default State**: Terminal collapsed, showing a **Status HUD Bar** (`height: 40px`) displaying the active mission name, current step circle indicator, and a keyboard toggle shortcut hint (`Ctrl + \``).
- **Expanded State**: Terminal drawer raises dynamically (`height: 320px` to `480px` via a resizable divider handle).

---

## 2. Interactive HUD Banner Component

When a learning mission is active, a dedicated React HUD component (`TerminalHUD.tsx`) is mounted inside the terminal layout:

```text
┌────────────────────────────────────────────────────────────────────────────┐
│ 🎯 Active Mission: Git Staging  [● ○ ○] Step 1 of 3: Stage changes          │
├────────────────────────────────────────────────────────────────────────────┤
│ 💡 HINT: Run "git add index.js" to stage your modified files. [Ask SARA]   │
└────────────────────────────────────────────────────────────────────────────┘
```

### HUD Interactive Actions
- **Mission Progress Circles**: `[● ○ ○]` reflect step completion status. Complete steps turn green (`bg-emerald-500`), active steps pulse (`animate-pulse bg-violet-500`), and incomplete steps remain hollow.
- **Contextual Hint Button**: Clicking `💡 HINT` opens an inline card displaying the Level 1 tip. If clicked again, it shows the Level 2 analogy.
- **"Ask SARA" Direct Hook**: Clicking `[Ask SARA]` triggers a side-panel drawer transition, carrying the command logs and active error context directly into SARA's conversation workspace for guided explanation.

---

## 3. Framer Motion Animations & CSS Classes

Smooth visual transitions make the terminal feel like a natural extension of the editor.

### Drawer Height Transitions

```typescript
const drawerVariants = {
  collapsed: { height: 40, transition: { duration: 0.3, ease: "easeInOut" } },
  expanded: { height: 360, transition: { duration: 0.3, ease: "easeOut" } }
};
```

### UI Style Tokens (Tailwind v4 / Custom CSS)

```css
/* Custom utility classes in frontend/src/index.css */

.cortex-terminal-container {
  background: rgba(15, 17, 26, 0.95);
  backdrop-filter: blur(12px);
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  box-shadow: 0 -10px 25px -5px rgba(0, 0, 0, 0.5);
}

.cortex-hud-banner {
  background: linear-gradient(90deg, rgba(88, 80, 236, 0.1) 0%, rgba(0, 0, 0, 0) 100%);
  border-bottom: 1px solid rgba(88, 80, 236, 0.15);
}

.cortex-drag-handle {
  height: 4px;
  background: rgba(255, 255, 255, 0.1);
  transition: background 0.2s;
}

.cortex-drag-handle:hover {
  background: rgba(88, 80, 236, 0.5);
  cursor: row-resize;
}
```

---

## 4. Lucide React Icon Mapping

We use the standardized Lucide system to signpost different console events:

| Event Type | Lucide Icon | CSS Tailoring |
| :--- | :--- | :--- |
| **Active Mission** | `Target` | `text-violet-400 size-4` |
| **Typo Recovery Hint**| `Lightbulb` | `text-amber-400 size-4 animate-bounce` |
| **Safety Shield Block**| `ShieldAlert` | `text-rose-500 size-5` |
| **Step Completed** | `CheckCircle2` | `text-emerald-400 size-4` |
| **History Log** | `Terminal` | `text-slate-500 size-4` |

---

## 5. Integration Hooks & Actions

The terminal links to `StudySession.tsx` via the following hook patterns:

```typescript
// Located inside frontend/src/pages/StudySession.tsx
import { useAppStore } from '../context/Store';
import { TerminalPanel } from '../components/TerminalPanel';

export const StudySession = () => {
  const { currentSession, updateSessionState } = useAppStore();
  const [terminalExpanded, setTerminalExpanded] = useState(false);

  const handleStepVerify = (isComplete: boolean) => {
    if (isComplete) {
      // Trigger success notifications and audio effects
      triggerStepConfetti();
    }
  };

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-slate-950 text-white">
      <div className="flex-1 flex overflow-hidden">
        {/* Main Content Area: Maps and Editors */}
      </div>

      {/* Integrated Collapsible Terminal Drawer */}
      <TerminalPanel
        isExpanded={terminalExpanded}
        onToggle={() => setTerminalExpanded(!terminalExpanded)}
        activeModule={currentSession?.activeModule}
        onStepVerify={handleStepVerify}
      />
    </div>
  );
};
```

> [!NOTE]
> The shortcut to toggle the drawer is mapped to `Ctrl + \`` (backtick). Pressing this key combo instantly focuses the terminal input line, boosting keyboard-driven usability for power users.
