# Vidhyalaya - Technical Matrix & Verification Protocol

## 🎯 System Mission
Adaptive orchestration layer transforming unstructured cognitive payloads into high-fidelity academic schemas. Powered by Gemini AI (Google GenAI SDK), rendered via standard-locked Academic Modernism UI system, persisted across distributed MongoDB Atlas cluster.

---

## 📊 System Status Checklist (Verify with Highest Precision)

### 🏛️ Foundational Architecture
- [x] **Framework Engine**: React v19.2.6 running on Vite v6.2.0.
- [x] **Styling Fabric**: Tailwind CSS v4.2.2 with full vanilla CSS orchestration (no component bloating).
- [x] **Global State Ledger**: Standard `React.Context` / `useAppStore` architecture in `/frontend/src/context/Store.tsx`.
- [x] **Focus Engine**: Dynamic view layering managed via `/frontend/src/context/FocusContext.tsx`.
- [x] **Persistence**: 100% Node.js/Express (v4.18.2) on MongoDB Atlas. **(DEPRECATION NOTICE: Puter.js / LocalStorage fallback fully detached.)**

### ✅ Core Interface Clusters
- [x] **Dashboard Overview**: Dynamic Hero statistics + `/frontend/src/components/Courses.tsx` (Fixed historical archive filters).
- [x] **Roadmap Library**: `PathExplorer.tsx` categorized grid with glass-morphic atmospheric cards.
- [x] **Path Genesis**: 4-step automated curriculum wizard via Gemini 3 Flash (`CreatePath.tsx`).
- [x] **Visual Orchestrator**: `Schedule.tsx` grid-based temporal mapping for learning goals.
- [x] **Retention Core**: `ExamMode.tsx` gamified terminal recall module.

### ✅ Immersive Environment (The Whiteboard Stack)
- [x] **Primary Controller**: `StudySession.tsx` (Absolute synchronization across Video, Content, and Sidebar).
- [x] **ContentRenderer Engine**: 
  - ✅ **Multi-Line Table Healer**: Injected look-ahead heuristic regex welding AI line-break contamination.
  - ✅ **Comparison Upgrades**: Native promotion rules converting MD tables to rich `GeometryTable`.
  - ✅ **Text Constraint**: Hardlocked `text-justify` + `hyphens-auto` enforcement across all rendering.
  - ✅ **Node Protection**: Static container lock (`min-w-[900px]`) on `ArchitectureTree` ensuring zero-collision nodes.
- [x] **Neural Map**: D3-based hierarchical canvas (`NeuralSynthesizer.tsx`) using locked radial resolution gaps (`crossGap: 320px`).
- [x] **Smartboard Integration**: Dynamic `react-youtube` (v10.1.0) timeline synchronizer with seamless crossfade logic.

---

## 🛠️ Critical Engineering Operations

### Execution Directives
| Environment | Directory | Launch Command | Network Target |
| :--- | :--- | :--- | :--- |
| **Client Node** | `./frontend` | `npm run dev` | `http://localhost:3000` |
| **Server Node** | `./backend` | `npm run dev` | `http://localhost:5000` |
| **Client Compile** | `./frontend` | `npm run build` | Production Assets to `dist/` |
| **System Audit** | `./frontend` | `npm run lint` | `tsc --noEmit` (Zero tolerance) |

### Verified API Routing Mesh (Server Side)
- `GET/POST` `/api/paths` - Primary module registry (Mongoose schema validation enforced).
- `GET/POST` `/api/users` - System profile serialization.
- `GET/POST` `/api/videos` - YouTube asset & metadata caching.
- `POST` `/api/auth` - JWT issuing endpoint (Verified: checks `process.env.JWT_SECRET` on container start).
- `GET` `/api/health` - Uptime assurance beacon.

---

## ⚖️ Immutable Architecture Constraints (Law)

1. **The AI Safety Lag**: All upstream Gemini requests via `geminiService.ts` MUST tolerate/preserve the 1.5s throttle bottleneck to evade recursive HTTP 429 Rate Exceeded loops.
2. **The Prototyping Type Rule**: Absolute ban on passing implicit objects into states. Every curriculum node, video segment, and exam query MUST conform to types registered in `/frontend/src/types.ts`.
3. **Academic Modernism Invariants**: 
   - **Color Hierarchy**: Primary Accent `#000666`, Surface Invert `#05070a`.
   - **Type Rules**: All content cards MUST carry `text-justify hyphens-auto`.
   - **Visual Flow**: Glass containers derived from `styles/AssistantGlass.css` only.
4. **PDF Guardrail**: Mandatory hard cutoff of 10 pages on initial vectorization to prevent parser-lock API saturation.
