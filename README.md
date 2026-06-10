<p align="center">
  <a href="https://vidyal.ai">
    <img src="./frontend/public/images/logo-animated.svg" alt="Vidhyalaya Logo" width="120">
  </a>
</p>

<p align="center"><strong>The open source adaptive orchestration engine for personalized education.</strong></p>

### Landing Page Hero Component

Below is the React & Tailwind CSS codebase of the animated landing page hero section (excluding the global navigation header):

```tsx
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Copy, Check, GraduationCap, Cpu, Laptop } from 'lucide-react';
import { toast } from 'sonner';

// SVG Logo Mark
const CortexLogoMark = ({ className = '' }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" className={className} aria-hidden="true">
    <circle cx="12" cy="12" r="10" strokeDasharray="3 3" className="cortex-logo-orbit" />
    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    <path d="M2 12a15.3 15.3 0 0 1 10-4 15.3 15.3 0 0 1 10 4 15.3 15.3 0 0 1-10 4 15.3 15.3 0 0 1-10-4z" />
    <circle cx="12" cy="12" r="2.2" className="cortex-logo-core" />
  </svg>
);

export const HeroSection: React.FC = () => {
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);

  const openApp = () => {
    navigate('/dashboard');
  };

  return (
    <section className="hero-shell relative overflow-hidden">
      {/* Dynamic Background Nebula & Drift Particles */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none select-none">
        <div className="cosmic-particle-drift absolute top-[15%] left-[20%] w-[12px] h-[12px] rounded-full bg-indigo-400/25 blur-[2px]" style={{ animationDelay: '0s', animationDuration: '14s' }} />
        <div className="cosmic-particle-drift absolute top-[45%] right-[15%] w-[8px] h-[8px] rounded-full bg-purple-400/20 blur-[1px]" style={{ animationDelay: '3.5s', animationDuration: '18s' }} />
        <div className="cosmic-particle-drift absolute bottom-[25%] left-[30%] w-[16px] h-[16px] rounded-full bg-blue-400/25 blur-[3px]" style={{ animationDelay: '7s', animationDuration: '16s' }} />
        
        {/* Celestial Spotlight Aura */}
        <div className="absolute top-[18%] left-1/2 -translate-x-1/2 w-[380px] h-[380px] rounded-full bg-indigo-500/10 blur-[100px] animate-pulse" style={{ animationDuration: '9s' }} />
      </div>

      <div className="hero-content relative z-10">
        {/* Logo with rotating conic gradient border */}
        <div className="relative inline-block mx-auto mb-7 group/logo">
          <div className="absolute -inset-[3px] rounded-[24px] bg-gradient-to-r from-[#4e5bff] via-[#8b5cf6] to-[#38bdf8] opacity-35 blur-sm group-hover/logo:opacity-85 transition-opacity duration-700 animate-spin" style={{ animationDuration: '9s' }} />
          
          <div className="hero-app-icon relative z-10 !mb-0" aria-hidden="true">
            <CortexLogoMark className="hero-logo-mark group-hover/logo:scale-105 transition-transform duration-500" />
          </div>
        </div>

        <h1 className="hero-title-goat">
          Cortex
        </h1>
        <p className="hero-subtitle-main">Your AI assistant for learning.</p>

        <div className="hero-actions">
          <button className="hero-primary relative group/btn overflow-hidden" onClick={openApp}>
            {/* Glossy overlay */}
            <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover/btn:translate-x-full transition-transform duration-1000" />
            <span className="relative z-10 flex items-center gap-1.5">
              Start learning <ArrowRight size={14} className="group-hover/btn:translate-x-1 transition-transform" />
            </span>
          </button>
        </div>

        <div className="trusted-section hero-trust mt-11" aria-label="Trusted learning teams">
          <p className="hero-trust-line-premium">Trusted by anyone looking to learn</p>
          <div className="trust-row flex gap-3.5 justify-center mt-6">
            {['Students', 'Builders', 'Educators', 'Campuses'].map((item) => (
              <span key={item} className="trusted-tag-porche">
                <span className="porche-bullet" />
                {item}
              </span>
            ))}
          </div>
        </div>

        {/* Ways to use Cortex — Glassmorphic Card Grid inside Hero */}
        <div id="feature-rows" className="hero-ways-to-use">
          <p className="ways-subtitle">Ways to use Cortex</p>
          <div className="ways-grid">
            {[
              { title: 'Study in your classroom', body: 'Navigate your learning context to build paths, run sessions, and generate interactive roadmaps.', Icon: GraduationCap },
              { title: 'Delegate in the background', body: 'Cortex processes learning tasks in the background, generating study guides so you can stay in flow.', Icon: Cpu },
              { title: 'Learn from anywhere', body: 'Kick off study sessions from any surface, track your academic progress, and keep learning moving.', Icon: Laptop }
            ].map((row) => (
              <div className="way-card group/card" key={row.title}>
                <div className="way-icon-container">
                  <row.Icon size={16} className="way-icon" />
                </div>
                <h3>{row.title}</h3>
                <p>{row.body}</p>
                <button className="way-card-btn" onClick={() => navigate('/docs')}>
                  Learn more
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};
```

---

### Installation

```bash
# YOLO
curl -fsSL https://vidyal.ai/install | bash

# Package managers
cd frontend && npm install
cd ../backend && npm install
```

---

## 📸 Product Interfaces

Here is a preview of the main interface blocks that make up the Vidhyalaya Study Session:

*   **Immersive Study Dashboard**: The launchpad showing active curriculum routes, calendar events, and study lens presets.
*   **Neural Synthesizer (Concept Map)**: Dynamic D3-powered concept dependencies. Nodes represent specific terms, linked to parent concepts to trace visual learning trees.
*   **Smartboard Guided Media**: Synchronized YouTube video playback with chapter jumps, integrated timeline notes, and grounded citations.
*   **Cortex Sandbox & Simulated Terminal**: Run code snippets from lessons inside the drawer, complete with an error coach and browser-side Git filesystem simulation.
*   **Whiteboard Scholarly Sheet**: Focus reader for AI-synthesized lesson chapters, with bibliographies referencing verified sources.
*   **SARA AI Mentor Panel**: Inline quizzes, concept chats, and study logs synced dynamically.

---

## ✨ Features

*   **Generative Roadmaps**: Dynamically partitions complex goals into structured phases and modules based on Gemini models.
*   **Resource Grounding**: Web scouts and verifies reference URLs and YouTube video IDs before compiling course roadmaps to prevent dead links.
*   **Cortex Interactive Sandbox**: A complete coding runner inside the study session for JavaScript, Python, HTML, CSS, TypeScript, Go, and Rust.
*   **Simulated Terminal HUD**: Interactive bash emulator with autocomplete, standard outputs, and an error coach guiding active recall.
*   **Zen Mode Focus**: Cinematographic distraction-free study layout (`bg-[#05070a]`) with dynamic ambient soundscapes.
*   **Scholarly Grounding & Bibliography**: Ensures every section heading has structural source tracking tied back to scouted resources.
*   **Bring-Your-Own-Key (BYOK)**: Connect your own Gemini, OpenAI, Anthropic, OpenRouter, or Groq API keys locally.

---

## 🏗️ Architecture Overview

Vidhyalaya is a modern decoupled SPA using a React client and Node/Express server.

```
                  ┌──────────────────────┐
                  │   Vite React Client  │
                  └──────────┬───────────┘
                             │ (JSON REST + BYOK Headers)
                             ▼
                  ┌──────────────────────┐
                  │  Express API Server  │
                  └──────────┬───────────┘
                             ├──────────────────────────┐
                             ▼                          ▼
                  ┌──────────────────────┐    ┌──────────────────┐
                  │     MongoDB Atlas    │    │  Google Gemini   │
                  │ (Metadata & Vectors) │    │   (AI Engine)    │
                  └──────────────────────┘    └──────────────────┘
```

For a deep-dive, see the [Architecture Manual](file:///Users/lokeshgandreddy/Vidhyalaya/ARCHITECTURE.md).

---

## 🛠️ Tech Stack

### Frontend (Client-Side)
*   **Core**: React v19.2.6, TypeScript v5.8.2, Vite v6.2.0.
*   **State Management**: Zustand (Optimistic synchronization).
*   **Aesthetics**: Tailwind CSS v4 (Utility-first), Framer Motion (kinetic physics).
*   **Visualization & Media**: D3.js (Neural Map), React YouTube, Mermaid.js.
*   **Document Reader**: `pdfjs-dist` (3.11.174), `react-pdf`.

### Backend (Server-Side)
*   **Core**: Node.js, Express.js.
*   **RAG Engine**: LlamaIndex, LlamaParse.
*   **Database**: MongoDB Atlas via Mongoose.
*   **Security**: JSON Web Tokens (JWT), AES-256-GCM encryption, Helmet, Express Rate Limit.

---

## 🚀 Quick Start

### Prerequisites
Ensure you have the following installed:
*   [Node.js](https://nodejs.org/) (v18.x or v20.x recommended)
*   [MongoDB](https://www.mongodb.com/) (either running locally or a MongoDB Atlas connection string)
*   [Gemini API Key](https://aistudio.google.com/)

---

### Environment Setup

Create an `.env` file in the `backend/` directory:
```env
PORT=5000
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret_key
GEMINI_API_KEY=your_gemini_api_key
FRONTEND_URL=http://localhost:3000
LLAMAPARSE_API_KEY=your_llamaparse_key_here # Optional (for RAG parsing)
```

---

### Running Locally

To run both servers in development mode:

1.  **Start Express Server (starts on Port 5000)**:
    ```bash
    cd backend
    npm run dev
    ```
    *If MONGODB_URI is left blank, the backend will launch a mock `mongodb-memory-server` in the background.*

2.  **Start Vite Dev Server (starts on Port 3000)**:
    ```bash
    cd frontend
    npm run dev
    ```
    Open your browser to `http://localhost:3000`.

---

### Running with Docker

Vidhyalaya supports Docker and Docker Compose. This starts the backend, frontend, and a local MongoDB instance.

1.  Export your Gemini Key:
    ```bash
    export GEMINI_API_KEY="AIzaSy..."
    ```

2.  Run compose from the root directory:
    ```bash
    docker compose up --build
    ```
    *   Frontend is accessible at `http://localhost:3000`.
    *   Backend API is running at `http://localhost:5000`.

---

## 📂 Project Structure

```
.
├── backend/
│   ├── src/
│   │   ├── config/          # Database & Vector stores
│   │   ├── middleware/      # Guards, Lockouts & Auth
│   │   ├── models/          # Schemas (LearningPath, UserProfile, ModuleContent)
│   │   ├── routes/          # Express Controllers
│   │   └── services/        # AI Synthesis, Video scraping, Sandbox Execution
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/      # UI primitives, ShellTerminal, CodeSandbox
│   │   ├── context/         # Zustand Store & Focus state
│   │   ├── features/        # Concept Maps, Video Sync player, SARA tutor
│   │   ├── pages/           # Application views
│   │   ├── services/        # API and Gemini executors
│   │   └── utils/           # Simulated Git and terminal parsers
│   └── package.json
├── docs/                    # Historical planning logs and specs
└── docker-compose.yml       # Docker Compose setup
```

---

## 🧠 AI & Database Architecture

### AI Architecture
*   **Model Routing**: Utilizes `gemini-1.5-flash` for high-speed logical tasks, summaries, and TTS overlays.
*   **Request Queue**: Dispatches prompt streams through `apiQueue`, maintaining a **1.5s delay** between execution steps and a **120s timeout** to respect API rate limits.
*   **Sanitization**: Raw AI payloads pass through `cleanContent()` and `healTables()` sanitizers in the UI to prevent markdown errors.

### Database Architecture
*   **Document Pruning**: Storing raw generated markdown text in `LearningPath` would trigger MongoDB's 16MB document cap. Detailed section contents are isolated in `ModuleContent` schemas, fetched on-demand.
*   **Vector Search**: RAG chunks are processed via `MarkdownNodeParser` and mapped into vector search collections on MongoDB Atlas.

---

## 🔒 Security & Hardening
*   **Encrypted Secrets**: BYOK keys are encrypted at rest using AES-256-GCM.
*   **Refresh Token Rotation (RTR)**: Prevents session replay attacks by rotating tokens on every request.
*   **Lockout Limits**: Limits failed authentication logins.
*   **Sandbox Isolation**: Terminal code runner blocks filesystem read access to env keys and restricts system sockets.

---

## 🧪 Testing

### Running Frontend Tests
```bash
cd frontend
npm run test
```

### Running Backend Tests
```bash
cd backend
npm test
```

---

## 🤝 Contributing

Contributions are welcome! Please review our [Contributing Guide](file:///Users/lokeshgandreddy/Vidhyalaya/CONTRIBUTING.md) and [Code of Conduct](file:///Users/lokeshgandreddy/Vidhyalaya/CODE_OF_CONDUCT.md).

---

## 🗺️ Roadmap

See [ROADMAP.md](file:///Users/lokeshgandreddy/Vidhyalaya/ROADMAP.md) for details on upcoming features (Spaces Repetition SRS, P2P collaboration, WebAssembly, voice mode).

---

## ❓ FAQ

**Q: Can I use this without a MongoDB Atlas account?**  
A: Yes! If no URI is configured, the server starts an in-memory MongoDB server instance automatically.

**Q: What languages does the Sandbox support?**  
A: The Sandbox runs JavaScript, Python, HTML, CSS, TypeScript, Go, and Rust.

---

## 📄 License

Distributed under the MIT License. See [LICENSE](file:///Users/lokeshgandreddy/Vidhyalaya/LICENSE) for more information.

---

## 👥 Acknowledgements
*   Google Gemini API Team
*   LlamaIndex community

---

## ✉️ Contact
Vidyal.ai Team - **support@vidyal.ai**
