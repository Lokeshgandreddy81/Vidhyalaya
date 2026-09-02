# CortexChat UI Enhancements Implementation Plan

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.

**Goal:** Transform CortexChat UI with modern glassmorphism, contextual action chips, and a polished sandbox execution experience to align with Academic Modernism.

**Architecture:**
- Leverage `framer-motion` for spring-physics animations.
- Implement contextual `FloatingActionChips` component.
- Refactor `ContentRenderer` to incorporate macOS-style window headers for sandboxed code.
- Add `Accordion` reasoning drawer for swarm reasoning.

**Tech Stack:**
- React, Tailwind CSS, Framer Motion

---

### Task 1: Create Floating Action Chips Component
**Objective:** Add contextual action buttons for AI assistance.
**Files:**
- Create: `frontend/src/components/FloatingActionChips.tsx`
- Modify: `frontend/src/pages/CortexChat.tsx`

### Task 2: Refactor Code Execution Renderers
**Objective:** Add macOS window headers (Red/Yellow/Green dots) to sandboxed outputs.
**Files:**
- Modify: `frontend/src/components/ContentRenderer.tsx` (or appropriate code renderer)

### Task 3: Implement Reasoning & Swarm Drawer
**Objective:** Provide transparency for AI reasoning.
**Files:**
- Modify: `frontend/src/pages/CortexChat.tsx`

### Task 4: Integrate Framer Motion for Transitions
**Objective:** Apply smooth entrance/exit physics for messages and UI elements.
**Files:**
- Modify: `frontend/src/pages/CortexChat.tsx`

---

**Verification:**
1. Verify FloatingActionChips animate on selection.
2. Verify Code Execution blocks have window headers.
3. Verify Reasoning Drawer toggles properly.
4. Verify overall feel matches "Academic Modernism" design.
