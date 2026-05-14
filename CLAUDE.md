# Vidhyalaya - Project Matrix & Engineering Protocol

## 1. Project Identity
**Vidhyalaya** (Vidyal.ai) is an adaptive orchestration engine for personalized education. It transforms unstructured cognitive payloads (PDFs, YouTube videos, raw notes) into high-fidelity academic schemas (curriculum roadmaps, interactive neural maps) using Gemini AI. It exists to provide a seamless, AI-driven learning experience that adapts to the student's needs.

## 2. Technical Stack
*   **Frontend**: React v19.2.6 + TypeScript v5.8.2 + Vite v6.2.0.
*   **Styling**: Tailwind CSS v4.2.2 (Utility-first) + Framer Motion + Lucide React.
*   **AI Engine**: Google Gemini GenAI SDK (^1.38.0). (3-Flash for logic, 2.5-Flash for TTS).
*   **Backend**: Node.js + Express.js v4.18.2.
*   **Persistence**: MongoDB Atlas via Mongoose v8.0.0.
*   **Media**: `react-youtube` v10.1.0 for synchronized video learning.
*   **Visualization**: D3.js (via `NeuralSynthesizer.tsx`) and Mermaid.js.
*   **Deliberate Exclusions**: No Puter.js or LocalStorage for primary state; all data must persist to MongoDB. No Tailwind bloat; use vanilla CSS orchestration for complex components.

## 3. Development Commands
*   **Environment Setup**: `npm install` in both `frontend` and `backend`.
*   **Frontend Dev**: `cd frontend && npm run dev` (Port 3000).
*   **Backend Dev**: `cd backend && npm run dev` (Port 5000, falls back to 5001 if occupied).
*   **Build**: `cd frontend && npm run build`.
*   **Lint/Type-Check**: `cd frontend && npm run lint` (`tsc --noEmit`).
*   **Testing**: 
    *   Frontend: `cd frontend && npm run test` (Vitest).
    *   Backend: `cd backend && npm run test`.

## 4. Architecture
*   **State Management**: `frontend/src/context/Store.tsx` (`useAppStore`) is the global source of truth.
*   **Optimistic Sync**: State updates MUST be performed optimistically in the Store before triggering background API synchronization to ensure zero-latency responsiveness.
*   **View Layering**: `frontend/src/context/FocusContext.tsx` manages immersive learning layers.
*   **AI Service**: `frontend/services/geminiService.ts` handles all prompt engineering and 1.5s request queuing.
*   **Data Flow**: Frontend (Action) → Gemini (Synthesis) → Express (Persistence) → MongoDB Atlas.
*   **Key Directories**:
    *   `/frontend/src/components`: UI components (Courses, PathExplorer, StudySession).
    *   `/frontend/src/types.ts`: Universal type definitions (Single source of truth).
    *   `/backend/src/models`: Mongoose schemas.

## 5. Critical Rules
*   **AI Safety Throttle**: All Gemini requests MUST use `apiQueue.add()` with a 1.5s queue and 120s per-task timeout to avoid HTTP 429s and hung processes.
*   **Strict Typing**: Absolute ban on `any`. No implicit objects in state; all models MUST flow through `types.ts`.
*   **Academic Modernism UI**:
    *   **Color Palette**: Primary Accent `#000666`, Surface Invert `#05070a`.
    *   **Typography**: Mandatory `text-justify` and `hyphens-auto` on all content paragraphs for readability.
    *   **Glassmorphism**: Use `styles/AssistantGlass.css` tokens exclusively.
*   **Security (Owner Lock)**: Backend routes MUST verify that `req.user.id` (from JWT) matches the `userId` of the resource being accessed/mutated.
*   **Performance (Anchor Cap)**: Keep `geometryAnchors` capped at 32 items per module to maintain D3.js and Sidebar rendering efficiency.
*   **Scholarly Grounding**: All whiteboard content MUST be grounded in pre-scouted module resources. Every step heading (H2) must be followed by a `> Source: [index]` marker referencing the unified bibliography.
*   **Fail-safe (Sync)**: Use a 5-second failsafe timer (`setIsCloudSynced(true)`) during initial load to unblock the UI if cloud fetch hangs.

## 6. Common Mistakes
*   **AI Markdown Contamination**: AI often generates malformed tables or boilerplate like "Architectural Intelligence Report". Content MUST pass through `cleanContent` and `healTables` before rendering.
*   **Video Desync**: AI-found YouTube IDs often point to private/restricted videos. Always verify IDs via `api.verifyVideos` before promoting to the UI.
*   **Retired Patterns**: Never generate `ARCHITECTURE_TREE` (post-Step 2) or `QUICK_REVIEW_FLOW`. Use `HIERARCHY_MAP` and `Mastery Checkpoint` instead.
*   **Visual Overlap**: `ArchitectureTree` nodes must have a `min-w-[900px]` lock to prevent collision.
*   **Neural Gaps**: `NeuralSynthesizer.tsx` requires a fixed `crossGap: 320px` for radial resolution stability.
*   **Generic Hallucination**: Avoid generating generic AI content for modules. Always prioritize and cite the `moduleResources` found during the Web Scout phase. Failure to include `Source: [index]` markers is a breach of the engineering protocol.

## 7. Compact Instructions
*   **Preserve**: All `AGENTS.md` high-level vision and `types.ts` definitions.
*   **Format**: Use Lucide React for icons and `rich-editor` classes for content.
*   **Naming**: Component files should be PascalCase; utility files camelCase.
