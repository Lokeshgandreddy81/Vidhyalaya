# Walkthrough: Vidhyalaya & Cortex Documentation Portal

This walkthrough documents the creation and validation of the new Vidhyalaya & Cortex documentation portal (`#/docs`), featuring design details and interactive workflows inspired by Cursor, Antigravity, and Codex.

---

## 1. What was Completed

We designed and built a standalone public documentation portal. The portal consists of:
- **Header**: Navigation bar containing the brand branding (animated orbit logomark), theme switch, search, and exit CTAs.
- **Sidebar Navigation**: Left-hand sidebar grouping chapters by categories (Getting Started, Interactive Guides, Cortex Features, System Architecture) with real-time text-search filtering.
- **Typography & Styling**: Strictly compliant with Academic Modernism (using the global Sky-Blue Ice layout in light mode, deep focused Cinematic Zen Mode `#05070a` in dark mode, and `text-justify` / `hyphens-auto` for textbook readability).

### Interactive Modules Embedded:
1. **Antigravity Agent Simulator**: Visualizes the AI agent's logic workflow. Users can select mock scenarios (such as auditing state sync files or creating roadmaps) and watch the agent step-by-step execute thought processes, tool calls (like `list_dir` and `grep_search`), and return formatted result states.
2. **Cursor Keyboard Cheat Sheet**: Interactive cheatsheet displaying key command layouts (such as `Cmd+K` to edit and `Cmd+I` to compose). Includes instantaneous query-based shortcut filtering.
3. **Codex CLI Terminal**: Authentic dark shell terminal executing cortex CLI developer tools (supporting commands like `help`, `status`, `scout`, `run`, and `about`).
4. **Interactive Code Playground Sandbox**: A live editor permitting inline JavaScript execution (capturing console logs) and HTML rendering (using an iframe frame).

---

## 2. Integration & Mounting Points

The portal was integrated into the existing application in three places:
1. **Routing System**: Mounted public route in [App.tsx](file:///Users/lokeshgandreddy/Vidhyalaya/frontend/src/App.tsx) at `/docs`.
2. **App Navigation Sidebar**: Added a "Documentation" (`BookOpen` icon) button into the primary sidebar menu in [Layout.tsx](file:///Users/lokeshgandreddy/Vidhyalaya/frontend/src/components/layout/Layout.tsx).
3. **Landing Page Header**: Mounted a "Docs" link in the header navigation menu of [Home.jsx](file:///Users/lokeshgandreddy/Vidhyalaya/frontend/src/portfolio/pages/Home.jsx), allowing guest visitors to navigate directly to the portal.

---

## 3. Verification & Safety Checks

- **Static Type Safety**: Successfully executed the frontend compiler checks (`npm run lint` / `tsc --noEmit`) with **zero errors or warnings**.
- **Responsive Layout**: Validated that the grid systems scale seamlessly on mobile, tablet, and widescreen desktop layouts.
- **High-Resolution Graphics**: Restored the Welcome page screenshot image block and replaced the default low-resolution asset with the user's uncompressed 4K Retina screenshot copied directly from their macOS Desktop. Added high-resolution screenshots to both the Quickstart and Model & Pricing pages, all rendering with crisp contract rendering (`-webkit-optimize-contrast`) and no layout stretching.
- **Product Evolution Changelog**: Rewrote the Changelog section to document the full progression of the SARA application: SARA-AI (First Release - Firebase), Vidhyalaya (Second Release - Express migration and D3.js mapping), and Cortex (Third Release - active recall playground and sandboxes). Integrated screenshots direct from the GitHub repository (`sara-summarizer.png`, `sara-mental-health.png`, and `sara-module-viewer.png`).
- **Agent Overview Redesign**: Completely overhauled the Agent Overview page, detailing Cortex's multi-agent orchestrator system (SARA coordinator and Antigravity compiler workers). Integrated four high-resolution screenshots from Desktop (`agent-overview-1.png` to `4.png`) representing planning, resource scraping, prerequisite graphs, and sandbox compiler execution.
- **Agents Window Documentation**: Overhauled the Agents Window documentation page to detail the SARA chat sidebar drawer workspace, context file reference triggers (`@`), and execution log features. Embedded the high-resolution screenshot `agent-window.png` directly from the Desktop with contrast sharpness tweaks.
- **Agent Review Enhancements**: Revamped the Agent Review section to cover synthesis validation pipelines (YouTube and source grounding) and the interactive diff reviews console. Integrated two high-resolution screenshots from Desktop (`agent-review-1.png` and `agent-review-2.png`) showcasing verification checks and side-by-side code diffs acceptance interfaces.
- **Cortex Planning Details**: Overhauled the Planning documentation page to describe curriculum compiles, interactive guided tours, D3 force mindmaps, progress heatmaps, SARA configuration styles, and the focus sound room. Embedded the high-resolution screenshot `agent-planning.png` from Desktop under the Planning section.
- **Prompt Engineering & Configuration Settings**: Overhauled the Prompting documentation page, detailing socratic prompting best practices, system instruction overrides (`.cortexrules`), and model hyperparameters (temperature, context sizing, and Socratic rigor dials). Integrated two high-resolution screenshots from Desktop (`prompting-1.png` and `prompting-2.png`) showing the prompt template panel and model parameters console.
- **Cortex Toolkit Documentation**: Rewrote the Tools page to document the active tools inside the workspace: Code Sandbox editor & console, Smartboard collaborative drawing canvas, and D3 force-directed Neuralboard. Embedded three high-resolution screenshots from Desktop with the corrected order: Figure 10.1 Sandbox (`tools-2.png`), Figure 10.2 Smartboard (`tools-1.png`), and Figure 10.3 Neuralboard (`tools-3.png`).
- **Interactive Debugging Loop**: Overhauled the Debugging documentation page, explaining sandbox compiler exceptions, "Fix with Cortex" hooks, and SARA's on-the-spot Socratic code explanations. Integrated the high-resolution screenshot `debugging.png` under this section.
- **Security & Authorization Protocol**: Rewrote the Security page to detail JWT authorization locks, school email domain guards, database owner comparison filters (with code examples), and BYOK API credential encryption parameters. Integrated the high-resolution screenshot `security.png` from Desktop under the Security section.
