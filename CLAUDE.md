# Vidhyalaya - Project Status & Architecture Guide

## 🚀 High-Level Vision
Vidhyalaya is an adaptive engine for personalized education, transforming unstructured text, PDFs, and concepts into structured mastery using Gemini AI. Architected for academic modernism, high-fidelity rendering, and safe type architectures.

---

## 📊 Project Checklist (Completed vs. Pending)

### ✅ Core Interfaces & Routing
- [x] **Modern Dashboard**: Adaptive hero with real-time stats and "Active Paths" grid.
- [x] **Course Creation**: Interactive 4-step path wizard using Gemini generation.
- [x] **Roadmap Library**: Thematic categorized exploration with glass-morphic atmosphere cards.
- [x] **Course History**: Fixed filters to restore visibility of historical learning paths.
- [x] **Schedule Interface**: Google-style time-blocking architecture for active goals.

### ✅ The Study Environment (Immersive Learning)
- [x] **Architecture Framework**: Split-screen layout with Curriculum Sidebar and Assistant Panel.
- [x] **Whiteboard (ContentRenderer)**: 
  - [x] **HealTables Kernel**: Custom regex engine fixing multi-line broken AI markdown tables.
  - [x] **Comparison Upscale**: Auto-promoting standard tables to premium `GeometryTable` components.
  - [x] **Typography Suite**: Enforced `text-justify`, `hyphens-auto`, and glass-styled academic blockquotes.
  - [x] **Fixed Constraints**: Locked min-width architecture to fix `ArchitectureTree` overlapping node collisions.
- [x] **Neural Map (Synthesizer)**:
  - [x] **Collision Grid**: Upgraded radial gap algorithms (`crossGap: 320px`, `layerGap: 450px`) to eliminate visual tangles.
  - [x] **Observation Panel**: Side-loading scholarly node detail viewer.
- [x] **Smartboard**: YouTube synchronization engine with dynamic AI timeline mapping.

### ✅ Infrastructure & Data
- [x] **State Mgmt**: `useAppStore` in React context as the universal source of truth.
- [x] **Backend Server**: Node.js/Express environment stabilized on Port 5000.
- [x] **Storage Engine**: FULL MIGRATION to MongoDB Atlas (Legacy Puter.js dependencies removed).
- [x] **Authentication API**: Auth service mounted successfully in `/backend/src/index.js`.
- [ ] **Frontend Login UI**: (Pending active construction for session persistence).

---

## 🛠️ Engineering Quickstart

### Commands
- `cd frontend && npm run dev` -> Starts UI locally (Default Port: 3000)
- `cd backend && npm run dev`  -> Starts API locally (Default Port: 5000)
- `cd frontend && npm run build` -> Packages for production delivery
- `cd frontend && npm run lint`  -> Validates typescript & design system constraints

### Technologies
- **Core Stack:** React 19 / Vite / TypeScript 5
- **Styling:** Vanilla CSS modules & Tailwind CSS v4 (Modern Utility Classes)
- **AI Stack:** Google Gemini GenAI SDK (3-Flash for fast logic pipelines)
- **Visuals:** Lucide React (Icons), Mermaid.js (Flowcharts), Framer Motion (Transitions)

---

## 📋 Key Architectural Rules (Memorize)
1. **Text Rendering**: All major narrative or comparison blocks MUST inherit the `text-justify hyphens-auto` typographic classes.
2. **Data Flow**: All path entities must pipe through `/frontend/src/types.ts`. Never pass untyped state.
3. **AI Queuing**: Respect the 1.5s staggered request queue to avoid hitting free-tier Gemini rate limits (429).
4. **Aesthetics**: Follow "Academic Modernism" principles—deep blacks/indigo (`#000666`), glass surfaces, extremely high header letter-spacing (`tracking-[0.24em]`), and crisp sans-serif body text.
