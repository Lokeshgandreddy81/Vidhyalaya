# Vidyal.ai - Cursor AI Handoff Document

> **Instructions for the User:**
> 1. Open this workspace (`/Users/lokeshgandreddy/Sara/Vidhyalaya`) in Cursor.
> 2. Open the Cursor Chat or Composer (`Cmd + L` or `Cmd + I`).
> 3. Type `@CURSOR_HANDOFF.md` to reference this file in your prompt.
> 4. Say: *"Read this handoff document to understand the current context, constraints, and let's continue from the Next Steps."*

---

## 1. Project Identity & Rules
You are working on **Vidyal.ai** - an adaptive engine for personalized education.
- **Strict Rule:** Always follow the guidelines in `AGENTS.md`.
- **Tech Stack:** React 19, TypeScript, Vite, Tailwind CSS v4, Zustand (Store.tsx).
- **Core Principle:** Optimize for learners, not developers. The terminal is an AI Coding Coach, not a real shell.

## 2. Current State: The Cortex AI Coding Coach
We just completed a major transformation of the terminal into an AI Coding Coach.
Here is what was successfully implemented and compiling perfectly:
1. **Types (`frontend/src/types.ts`)**: Added robust types for Skills, Memory State, Active Missions, and Scenarios.
2. **Cortex Coach Engine (`frontend/src/utils/cortexCoachEngine.ts`)**: Created the core engine for step validation, memory decay, and mistake detection. It includes default missions (e.g., `git_init_commit`).
3. **State Sync (`frontend/src/context/Store.tsx`)**: Wired the coach state (`missionState`, `memoryState`, `scenarioState`) into Zustand with LocalStorage persistence.
4. **UI Overlay (`frontend/src/components/ui/TerminalHUD.tsx`)**: A Heads-Up Display mounted over the terminal to show active mission steps.
5. **Execution Interceptors (`frontend/src/components/ui/ShellTerminal.tsx`)**: Intercepts shell commands to validate mission steps and triggers SARA interventions upon mistakes.

## 3. Critical Constraints (Do NOT Violate)
- **NO GAMIFICATION:** We have strictly decided **not** to introduce XP, levels, or gamified progress bars. Do not build them.
- **Vite Warnings:** The third-party build warnings inside `frontend/dist/assets/` (from Mermaid/Cytoscape) have been resolved by adding `.eslintignore` and a `npm run clean` script. Do not attempt to fix third-party minified RegExp warnings.
- **Maintain Speed:** Keep ruthless execution. Do not introduce unnecessary abstraction layers.

## 4. Next Immediate Steps
Start with these next goals:
1. **Verify Manual Triggers:** Test the `git_init_commit` mission inside the browser to ensure the `TerminalHUD` correctly highlights the current step when `git init` is typed.
2. **Expand Scenarios:** Add more specific isolated sandboxes (e.g., `broken_repo_sync`) to the `cortexCoachEngine`.
3. **SARA AI Integration:** Refine the prompt sent to Gemini in `StudySession.tsx` when a student makes a mistake detected by the Coach Engine.

---
*End of Handoff Context*
