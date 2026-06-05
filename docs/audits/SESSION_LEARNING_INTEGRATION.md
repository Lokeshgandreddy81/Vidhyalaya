# Cortex Session Learning Integration

This document specifies the layout, components, interactive state transitions, and styling parameters for integrating the Cortex Learning Terminal into the primary **Study Session workspace** (`StudySession.tsx`).

---

## 1. Split-Pane Layout Grid

To avoid cognitive overload, the terminal is positioned as a collapsible bottom drawer, leaving the main workspace clear for the code editor, instructions, and interactive neural maps.

```text
┌──────────────────────────────────────────────────────────────────┐
│  VIDYAL.AI HEADER (XP Progress, Streak Tracker, Goal Navigation) │
├────────────────────────────────┬─────────────────────────────────┤
│                                │                                 │
│                                │                                 │
│         INSTRUCTION &          │        NEURAL MAP / CODE        │
│          CHAT WINDOW           │             EDITOR              │
│                                │                                 │
│                                │                                 │
├───────────────────────────────















































































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

