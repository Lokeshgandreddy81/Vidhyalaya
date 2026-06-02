<div align="center">
  <img src="https://img.shields.io/badge/Status-Active-success.svg?style=for-the-badge" alt="Status" />
  <img src="https://img.shields.io/badge/License-MIT-blue.svg?style=for-the-badge" alt="License" />
  <img src="https://img.shields.io/badge/React-19.2-61DAFB.svg?style=for-the-badge&logo=react" alt="React" />
  <img src="https://img.shields.io/badge/Gemini-AI-orange.svg?style=for-the-badge" alt="Gemini" />
  
  <h1>Vidhyalaya (Vidyal.ai) 🧠</h1>
  <p><strong>The Adaptive Scholarly Engine for Mastery-Based Learning</strong></p>
</div>

---

**Vidhyalaya** is a premium, AI-native education platform designed to transform unstructured information into structured mastery. Built on the **Academic Modernism** design philosophy, it combines high-fidelity typography, kinetic UI, Web Audio synthesis, and Google's Gemini AI to create a distraction-free environment for deep learning and cognitive enhancement.

## 📑 Table of Contents

- [🏛 The Philosophy](#-the-philosophy)
- [✨ Core Features](#-core-features)
- [🛠 Tech Stack](#-tech-stack)
- [🚀 Getting Started](#-getting-started)
- [📐 Architecture](#-architecture)
- [🤝 Contributing](#-contributing)
- [📄 License](#-license)

---

## 🏛 The Philosophy

Education is often messy and fragmented. Vidhyalaya acts as a **Neural Synthesizer**, mapping concept dependencies and generating adaptive technical roadmaps that evolve with the learner's progress. It doesn't just provide answers; it architectures custom learning paths, evaluates mastery through rigorous, spaced checkpoints, and provides sensory focus tools to optimize cognitive load.

---

## ✨ Core Features

- **🧠 Neural Synthesizer**: Interactive knowledge maps that visualize concept relationships and scholarly hierarchies using real-time generative modeling.
- **🎨 Interactive Vector Whiteboard**: A Figma-grade, vector-based sketching and canvas workspace. Features precise collision hit-testing, multi-select transforms, bounding boxes with custom resize handles, undo/redo, responsive grid modes (dots, lines), pencil, highlighters, shapes (rectangles, circles, lines, arrows), text boxes, and automatic local storage synchronization per module.
- **💻 Cortex Code Sandbox & REPL**: An immersive, in-browser playground for executing JavaScript, HTML, CSS, and Python. Includes an advanced loop-guard watchdog (preventing infinite loops), a recursive Google Chrome DevTools-style Object Inspector, real-time terminal logging, and a custom **SARA Autofix** diagnostics system that automatically debugs, corrects, and explains runtime/compilation errors.
- **🎵 Focus Soundscapes & Guided Breathing**: A custom Web Audio API-powered audio engine providing immersive background soundtracks. Induces focus using 40Hz Binaural Beats (offset oscillators), synthesized Pink/Brown noise (rain simulator), and infinite pulsing ambient note chords. Features an interactive guided Box Breathing companion that dynamically modulates audio filters to support relaxation and concentration.
- **📖 Academic Content Renderer**: Beautifully typeset, AI-generated technical deep-dives with integrated citations, process flows, and rich markdown parsing.
- **🤖 SARA (Scholarly Adaptive Research Assistant)**: An always-on AI partner for real-time clarification, semantic search across the vault, notes curation, and adaptive assessments.
- **🎯 Mastery Checkpoints**: Automated, context-aware quiz generation and spaced-repetition logic to ensure long-term knowledge retention.
- **💎 Glass-Morphic Design**: A breathtaking premium UI system built with Tailwind CSS v4, focusing on focus, clarity, fluid motion, and a cohesive "Sky-Blue Ice" aesthetic.
- **📚 Integrated Asset Vault**: Upload, index, and query vast amounts of technical PDFs effortlessly.

---

## 🛠 Tech Stack

### Frontend (Client-Side)
- **Framework**: React 19 + TypeScript + Vite
- **Styling**: Tailwind CSS v4 + Framer Motion (Kinetic Interactions)
- **UI Components**: Radix UI Primitives, Lucide React (Iconography)
- **AI Integration**: Google Gemini GenAI SDK (3-Flash for logic, 2.5-Flash for TTS)
- **Data Visualization**: Recharts, Mermaid.js
- **Document Processing**: PDF.js (`react-pdf`)
- **Audio Engine**: Web Audio API (real-time synthesizers, oscillators, filters, channel mergers)
- **Execution Engine**: Custom JS/Python interpreter with Prototype extensions & loop guards

### Backend (Server-Side)
- **Environment**: Node.js
- **Framework**: Express.js
- **Storage**: MongoDB Atlas (Vector-enabled) via Mongoose
- **Security & Ops**: JWT (Authentication), Multer (File Handling), Compression

---

## 🚀 Getting Started

Follow these steps to set up the development environment on your local machine.

### Prerequisites

- [Node.js](https://nodejs.org/en/) (v20 or higher)
- [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) Account (or a local MongoDB instance)
- [Google Gemini API Key](https://aistudio.google.com/app/apikey)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/Lokeshgandreddy81/Vidhyalaya.git
   cd Vidhyalaya
   ```

2. **Backend Setup**
   ```bash
   cd backend
   npm install
   ```
   *Create a `.env` file in the `backend` directory and configure the following variables:*
   ```env
   PORT=5000
   MONGODB_URI=your_mongodb_connection_string
   GEMINI_API_KEY=your_gemini_api_key
   JWT_SECRET=your_jwt_secret
   ```
   *Start the development server:*
   ```bash
   npm run dev
   ```

3. **Frontend Setup**
   ```bash
   cd ../frontend
   npm install
   ```
   *Start the Vite development server:*
   ```bash
   npm run dev
   ```

4. **Launch**
   Open your browser and navigate to `http://localhost:3000` to experience the platform.

---

## 📐 Architecture

Vidhyalaya follows an elite, domain-driven architecture designed for high scalability and modularity:

- **`/frontend/src/pages`**: Dedicated routing layer and root page views (Dashboard, Studio, Settings).
- **`/frontend/src/features`**: Domain-specific logic, such as `study` components (e.g., `Smartboard.tsx`, `NeuralSynthesizer.tsx`, `SARAQuizPanel.tsx`), ensuring isolation.
- **`/frontend/src/components/ui`**: Highly reusable, unopinionated core UI components (buttons, dialogues, markdown renderers) along with high-fidelity workspace tools like `InteractiveWhiteboard.tsx` and `CodeSandbox.tsx`.
- **`/frontend/src/context`**: Centralized state management utilizing React Context (`Store.tsx`) for highly performant optimistic UI updates and data synchronization.
- **`/frontend/src/services`**: API, external service gateways, and utility engines (e.g., `geminiService.ts`, `soundscapeService.ts`) isolated from view logic, implementing resilient queueing mechanisms.

---

## 🤝 Contributing

We welcome contributions from the open-source community! To contribute:

1. Fork the repository.
2. Create a new branch for your feature (`git checkout -b feature/amazing-feature`).
3. Commit your changes (`git commit -m 'feat: add amazing feature'`).
4. Push to the branch (`git push origin feature/amazing-feature`).
5. Open a Pull Request.

*Please ensure your code passes all type checks (`npm run lint` in the frontend directory) before submitting a PR.*

---

## 📄 License

This project is licensed under the **MIT License**.

<br />
<div align="center">
  <p>Built with 🩵 by the Vidhyalaya Architect Team</p>
</div>
