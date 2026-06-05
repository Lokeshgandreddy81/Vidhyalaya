# Vidhyalaya / Vidyal.ai

Vidhyalaya is an AI-native learning operating system for turning messy goals, notes, links, and course material into structured mastery paths. The product combines roadmap generation, an immersive study session, SARA tutoring, grounded resources, concept maps, and a coding sandbox into one focused learning environment.

This repository is the release candidate for the Cortex learning experience.

## Final Product Surfaces

### Dashboard

The dashboard is the learner's launchpad. It includes developer roadmaps, active learning paths, classroom entry points, calendar surfaces, profile controls, and quick access into the current study session.

### Path Detail

Each path shows the learning roadmap, phase/module structure, progress, and the next launch action. A learner should understand where they are, what is unlocked, and what to study next without needing extra explanation.

### Study Session

The study session is the core release surface. It is organized around four primary modes:

- **Smartboard**: Video-guided study mode with curated learning resources, timeline-aware jumps, and module context.
- **Whiteboard**: The lesson reading surface for generated content, grounded sources, rich markdown, citations, notes, and code blocks.
- **Neural Map**: Concept graph and mastery visualization for understanding dependencies, relationships, and knowledge structure.
- **Sandbox**: In-browser coding workspace for running lesson snippets and experiments. Code blocks in lessons can be attached into the Sandbox for hands-on practice.

The right-side SARA panel supports chat, quiz generation, study notes, and the learner vault.

## Tech Stack

### Frontend

- React 19
- TypeScript
- Vite
- Tailwind CSS v4
- Framer Motion
- Lucide React
- React Markdown and syntax highlighting
- Mermaid and rich learning renderers

### Backend

- Node.js
- Express.js
- MongoDB Atlas via Mongoose
- JWT authentication
- Google Gemini SDK
- RAG/document services
- Smartboard/video services

## Repository Layout

```text
frontend/
  src/
    pages/                  Route-level app surfaces
    components/ui/           Shared UI, renderer, sandbox, terminal tools
    features/study/          Smartboard, Neural Map, quiz, vault, study modules
    context/                 Global app state and persistence
    services/                API, Gemini, video, and app service integrations
    utils/                   Learning engines and supporting utilities

backend/
  src/
    routes/                  Express API routes
    services/                AI, RAG, video, and study services
    models/                  MongoDB/Mongoose schemas
    config/                  Database and RAG configuration
```

## Local Development

Install dependencies for both apps:

```bash
cd backend
npm install

cd ../frontend
npm install
```

Create `backend/.env`:

```env
PORT=5001
MONGODB_URI=your_mongodb_connection_string
GEMINI_API_KEY=your_gemini_api_key
JWT_SECRET=your_jwt_secret
FRONTEND_URL=http://localhost:3000
```

If the frontend runs on another port, update `FRONTEND_URL` to match it. For example, when using `http://localhost:3001`, set:

```env
FRONTEND_URL=http://localhost:3001
```

Run the backend:

```bash
cd backend
npm run dev
```

Run the frontend:

```bash
cd frontend
npm run dev
```

Vite defaults to `http://localhost:3000`. If that port is occupied:

```bash
cd frontend
npm run dev -- --host 127.0.0.1 --port 3001
```

## Validation

Frontend type-check:

```bash
cd frontend
npm run lint
```

Frontend production build:

```bash
cd frontend
npm run build
```

Backend tests:

```bash
cd backend
npm test
```

## Release Notes

This release standardizes the learning session around a clean, intentional workflow:

```text
Smartboard  -> guided video/resource learning
Whiteboard  -> lesson reading and grounded content
Neural Map  -> concept graph and mastery structure
Sandbox     -> code execution and practice
SARA        -> tutoring, quiz, notes, and vault support
```

The intended learner experience is simple: open a roadmap, continue the next module, study in Whiteboard or Smartboard, inspect structure in Neural Map, and practice code in Sandbox.

## Environment Notes

- The frontend API fallback is `http://localhost:5001/api`.
- Backend CORS must allow the exact frontend origin.
- MongoDB Atlas must be reachable for persisted paths, user profile, notes, resources, and learning progress.
- Gemini API credentials are required for generation, chat, quiz, and resource intelligence.

## Status

Release candidate: final UI and workflow state for the current Cortex/Vidhyalaya study experience.
