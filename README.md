# Vidhyalaya (Vidyal.ai)
### Adaptive Scholarly Engine for Mastery-Based Learning

**Vidhyalaya** is a premium, AI-native education platform designed to transform unstructured information into structured mastery. Built on the **Academic Modernism** design philosophy, it combines high-fidelity typography, kinetic UI, and Google's Gemini AI to create a distraction-free environment for deep learning.

## 🏛 The Philosophy
Education is often messy and fragmented. Vidhyalaya acts as a **Neural Synthesizer**, mapping concept dependencies and generating adaptive technical roadmaps that evolve with the learner's progress.

## 🚀 Core Features
- **Neural Synthesizer**: Interactive knowledge maps that visualize concept relationships and scholarly hierarchies.
- **Academic Content Renderer**: Beautifully typeset, AI-generated technical deep-dives with integrated citations and process flows.
- **SARA (Scholarly Adaptive Research Assistant)**: An always-on AI partner for real-time clarification, notes curation, and assessment.
- **Mastery Checkpoints**: Automated quiz generation and spaced-repetition logic to ensure long-term knowledge retention.
- **Glass-Morphic Design**: A premium UI system built with Tailwind CSS v4, focusing on focus, clarity, and motion.

## 🛠 Tech Stack
- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS v4, Lucide React.
- **AI Engine**: Google Gemini Pro 1.5 & Flash (Logic, TTS, and Synthesis).
- **Backend**: Node.js, Express.js.
- **Storage**: MongoDB Atlas (Vector-enabled for concept mapping).

## 🏃‍♂️ Getting Started

### Prerequisites
- Node.js (v20+)
- MongoDB Atlas Account
- Gemini API Key

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
   # Create .env with MONGODB_URI and GEMINI_API_KEY
   npm run dev
   ```

3. **Frontend Setup**
   ```bash
   cd ../frontend
   npm install
   npm run dev
   ```

## 📐 Architecture
- **State Management**: Centralized `Store.tsx` using React Context for optimistic updates and global UI state.
- **AI Service**: `geminiService.ts` handles all generative logic with built-in queueing to respect rate limits.
- **Design System**: Atomic components built with Vanilla CSS and Tailwind v4 utility tokens.

## 📄 License
MIT License. Built with ❤️ by Lead Architect.
