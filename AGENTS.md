# Vidyal.ai - CTO & Founder's Guide

## High-Level Vision
Vidyal.ai is our adaptive engine for personalized education. We transform unstructured mess into structured mastery using Gemini AI. Keep it fast, keep it accessible, and keep the types safe.

## Core Stack
- **Frontend:** React 19 + TypeScript + Vite.
- **Styling:** Tailwind CSS v4 (Utility-first, no bloat).
- **AI:** Google Gemini GenAI SDK (3-Flash for logic, 2.5-Flash for TTS).
- **Storage:** MongoDB Atlas (via Express.js backend on Port 5000).

## Engineering Commands
- `npm install` - Get the ship ready (run in root and `server/`).
- `npm run dev` - Launch frontend dev server (Port 3000).
- `cd server && npm run dev` - Launch Express backend (Port 5000).
- `npm run build` - Production-ready assets.
- `npm run lint` - Enforce code quality.

## Architecture & Rules
- **State Management:** `context/Store.tsx` is the source of truth. Use `useAppStore`. Data is persisted to MongoDB Atlas via `services/api.ts` (optimistic updates).
- **AI Service:** `services/geminiService.ts` handles the heavy lifting. **Important:** Respect the 1.5s request queue to avoid quota bottlenecks.
- **Data Integrity:** All models must flow through `types.ts`. Module dependencies are tracked via `dependsOnModuleIds`.
- **UI:** Lucide React for all iconography. Use the `rich-editor` classes for content rendering.
- **PDF Handling:** 10-page context limit for initial parsing to keep latency low.

## Routing Map
- `/`: The High-Level Dashboard.
- `/create`: The 4-step Path Wizard.
- `/path/:id`: Deep dive into specific goals.
- `/study/...`: The immersive learning environment.
