<div align="center">
  <img src="https://img.shields.io/badge/Status-Active-success.svg?style=for-the-badge&color=10b981" alt="Status" />
  <img src="https://img.shields.io/badge/License-MIT-blue.svg?style=for-the-badge&color=3b82f6" alt="License" />
  <img src="https://img.shields.io/badge/React-19.2-61DAFB.svg?style=for-the-badge&logo=react" alt="React" />
  <img src="https://img.shields.io/badge/Gemini-AI-orange.svg?style=for-the-badge" alt="Gemini" />
  
  <h1>Cortex (Vidhyalaya) 🧠</h1>
  <p><strong>The Premium, AI-Native Adaptive Orchestration Engine for Personalized, Deep Learning</strong></p>
</div>

---

**Cortex** is a production-grade, AI-native personalized learning platform designed to restructure unstructured cognitive content (PDFs, YouTube videos, markdown notes) into interactive, mastery-based education paths. 

Built on the **Academic Modernism** design philosophy, it features a fluid baby-blue-ice canvas overlay, vector-based interactive whiteboard components, in-browser code compilation sandboxes, real-time command line terminal simulators, and custom Web Audio ambient sound engines, inducing deep cognitive focus.

---

## 📑 Table of Contents

- [✨ Core Features](#-core-features)
- [🛠 Tech Stack & Services](#-tech-stack--services)
- [🚀 Quick Start & Local Setup](#-quick-start--local-setup)
- [📂 Repository Directory Layout](#-repository-directory-layout)
- [📐 System Data Flow Architecture](#-system-data-flow-architecture)
- [🤝 Contributing](#-contributing)
- [📄 License](#-license)

---

## ✨ Core Features

*   **🧠 Neural Synthesizer & Knowledge Maps**: Real-time generative topic maps that parse and render concepts as interactive node trees using D3.js styling.
*   **🎨 Vector Smartboard Whiteboard**: Figma-grade drawing canvas supporting custom pencil weights, highlighters, shape insertions (circles, rects, lines, arrows), bounding boxes with resize transformations, and automatic local storage backups.
*   **💻 Code Sandbox & REPL Terminal**: A fully featured browser-based editor to compile JavaScript, HTML, CSS, and Python. Integrates an execution watchdog to block infinite loops and an interactive recursive Object Inspector, backed by a **SARA Autofix** AI debugger to analyze and fix runtime compilation errors.
*   **🎵 Web Audio Ambient Focus Engine**: Oscillates 40Hz Binaural Beats and synthesized Pink/Brown noise (rain noise simulator) alongside a pulsing Box Breathing guide to support focus.
*   **🤖 SARA AI Learning Partner**: Always-on academic assistant for text summarization, concept explanations, and vault indexing queries.
*   **🎯 Spaced-Repetition Mastery Checks**: Dynamically structures context-aware quiz blocks and flashcard checkpoints to ensure long-term retention.

---

## 🛠 Tech Stack & Services

### Frontend (Client)
- **Framework**: React v19.2 (Strict TypeScript) + Vite v6.2
- **State System**: React Context (`Store.tsx`) performing optimistic UI updates.
- **Interactions**: Framer Motion (Kinetic Physics) + Tailwind CSS v4 (Glassmorphic surfaces)
- **AI Reasoning**: Google Gemini GenAI SDK (unified new `@google/genai` API client)
- **Sensory Synthesis**: Web Audio API (oscillators, channel mergers, biquad filters)

### Backend (Server)
- **Platform**: Node.js + Express.js v4.18
- **Database**: MongoDB Atlas (Vector indexing schemas) via Mongoose v8
- **Libraries**: Multer (document ingestion), bcryptjs, jsonwebtoken, LlamaIndex (vector pipeline)

---

## 🚀 Quick Start & Local Setup

### Prerequisites
- [Node.js](https://nodejs.org/en/) (v18.x or v20.x recommended)
- [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) account or local running instance
- [Google Gemini API Key](https://aistudio.google.com/app/apikey)

### 1. Ingest Repository
```bash
git clone https://github.com/Lokeshgandreddy81/Vidhyalaya.git
cd Vidhyalaya
```

### 2. Configure Backend
```bash
cd backend
npm install
```
Create a `.env` variables file in `/backend`:
```env
PORT=5000
MONGODB_URI=your_mongodb_atlas_connection_string
GEMINI_API_KEY=your_gemini_developer_key
JWT_SECRET=your_auth_jwt_secret
```
Launch Express server:
```bash
npm run dev
```

### 3. Configure Frontend
```bash
cd ../frontend
npm install
```
Launch Vite client:
```bash
npm run dev
```
Navigate to `http://localhost:3000` to interact with the environment.

---

## 📂 Repository Directory Layout

The workspace is organized to isolate domain feature interfaces from global state layers:

```text
├── .github/                   # CI/CD pipelines, issue & PR templates
├── backend/                   # Node.js backend
│   ├── src/
│   │   ├── config/            # DB configuration & vector schemas
│   │   ├── middleware/        # Security controls & JWT auth layers
│   │   ├── models/            # Mongoose models (UserProfile, LearningPath)
│   │   ├── routes/            # REST API endpoints (auth, paths, videos)
│   │   └── services/          # Video curation logic & Gemini service
│   └── package.json
│
├── frontend/                  # React client
│   ├── src/
│   │   ├── components/        # Shell layout views and global widgets
│   │   │   ├── layout/        # Sidebar navigation frames
│   │   │   └── ui/            # Whiteboard, Terminal, CodeSandbox components
│   │   ├── context/           # React App Store context (Store.tsx)
│   │   ├── features/          # Domain-specific components
│   │   │   └── study/         # Flashcards, SARA quizzes, whiteboards
│   │   ├── hooks/             # Shared React hooks (Focus contexts)
│   │   ├── pages/             # Route views (Dashboard, Courses, StudySession)
│   │   ├── services/          # Soundscapes, Gemini AI clients, API helpers
│   │   └── utils/             # Shell parser utilities & virtual git
│   └── package.json
```

---

## 📐 System Data Flow Architecture

Cortex structures all state updates to prioritize responsive, zero-latency feedback:

```mermaid
sequenceDiagram
    participant UI as Component View
    participant Store as State Store (Store.tsx)
    participant API as API Helper (api.ts)
    participant Server as Express Server

    UI->>Store: Invoke action (e.g. saveDrawing)
    Store->>Store: Optimistically update local state immediately
    Store->>API: Dispatch background update request
    API->>Server: HTTP PUT /api/paths/:id/module
    alt API Request Success
        Server-->>API: 200 OK
        API-->>Store: Commit state update
    alt API Request Fails
        Server-->>API: Error Response (e.g. 500)
        API-->>Store: Rollback state to previous snapshot
        Store-->>UI: Display alert toast error via Sonner
    end
```

---

## 🤝 Contributing

We welcome contributions to help make Mastery-Based learning accessible to everyone. Please review our [CONTRIBUTING.md](file:///Users/lokeshgandreddy/Sara/Vidhyalaya/CONTRIBUTING.md) to understand local setup checks, testing commands, and PR conventions before committing code:

- Run frontend Vitest tests: `cd frontend && npm run test`
- Run typecheck checks: `cd frontend && npm run lint`
- Run backend tests: `cd backend && npm test`

---

## 📄 License

This repository is licensed under the terms of the **MIT License**.
