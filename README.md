<div align="center">
  <img width="1200" alt="Vidhyalaya Banner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />

  # 🎓 Vidhyalaya
  ### *Transforming Unstructured Mess into Structured Mastery*

  [![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react)](https://reactjs.org/)
  [![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
  [![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4-06B6D4?style=for-the-badge&logo=tailwind-css)](https://tailwindcss.com/)
  [![Gemini AI](https://img.shields.io/badge/Google_Gemini-AI-orange?style=for-the-badge&logo=google-gemini)](https://deepmind.google/technologies/gemini/)
  [![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-47A248?style=for-the-badge&logo=mongodb)](https://www.mongodb.com/)
</div>

---

## 🌟 Overview

**Vidhyalaya** is a next-generation adaptive learning engine designed to transform any unstructured information into a comprehensive, mastery-based learning path. Powered by Google's Gemini GenAI SDK and wrapped in a premium **"Academic Modernism"** design system, it serves as a dynamic, intelligent classroom that evolves with you.

## 🚀 Key Features

### 🧠 Intelligent Tutoring & Content
- **SARA AI Copilot**: A context-aware tutor that monitors progress, explains complex concepts, and generates deep-dive content.
- **Deep Content Engine**: Generates 3500-5500 word modules with worked examples, mistake breakdowns, and dual-perspective explanations.
- **Live Grounded Citations**: Real-time integration with Google Search to provide verified, clickable source markers.

### 🎨 Visual & Spatial Learning
- **Neural Synthesizer**: Automatically generates interactive mind maps and process flows to aid spatial retention.
- **Dual-Board Layout**: A split-screen environment featuring a `Whiteboard` for interactive reading and a `Smartboard` for synchronized video learning.
- **Academic Modernism**: A refined UI system with expansive layouts, premium typography, and distraction-free "Exam Mode".

### 🛠 Technical Excellence
- **Optimistic Updates**: Seamless data persistence to MongoDB Atlas.
- **Type-Safe Architecture**: Strict TypeScript implementation across the full stack.
- **Vite-Powered Speed**: Near-instantaneous HMR and builds.

## 📂 Project Structure

```text
Vidhyalaya/
├── frontend/             # React 19 Client
│   ├── src/              # Source code
│   │   ├── components/   # UI Components
│   │   ├── context/      # State Management
│   │   ├── services/     # API & Gemini Logic
│   │   ├── types.ts      # Global Types
│   │   └── App.tsx       # Main Entry
│   ├── public/           # Static Assets
│   └── vite.config.ts    # Vite Configuration
├── backend/              # Express.js Server
│   ├── src/              # Server Logic
│   │   ├── models/       # Database Schema
│   │   ├── routes/       # API Endpoints
│   │   └── index.js      # Entry Point
│   └── .env.example      # Environment Template
├── docs/                 # Project Documentation
└── README.md             # The Manual
```

## 🛠 Tech Stack

| Layer | Technology |
| :--- | :--- |
| **Frontend** | React 19, Vite, Tailwind CSS v4 |
| **Backend** | Node.js, Express.js |
| **Database** | MongoDB Atlas |
| **AI** | Google Gemini 1.5 Flash (Logic), 2.0 Flash (TTS) |
| **Icons** | Lucide React |

## 💻 Getting Started

### Prerequisites
- **Node.js** (v18+)
- **MongoDB Atlas** account
- **Gemini API Key**

### 1. Installation
```bash
# Clone the repository
git clone https://github.com/your-repo/vidhyalaya.git

# Install dependencies
cd frontend && npm install
cd ../backend && npm install
```

### 2. Configuration
Create a `.env.local` in `frontend/` and a `.env` in `backend/`:
```env
# Frontend (.env.local)
VITE_GEMINI_API_KEY=your_gemini_key

# Backend (.env)
MONGODB_URI=your_mongodb_uri
PORT=5000
```

### 3. Run Development
```bash
# Terminal 1: Frontend
cd frontend && npm run dev

# Terminal 2: Backend
cd backend && npm run dev
```

---

<div align="center">
  <p><i>Developed with passion for the future of education.</i></p>
  <p><b>Vidyal.ai</b></p>
</div>
