<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Vidhyalaya - Adaptive Learning Platform

Vidhyalaya is a next-generation educational engine designed to transform unstructured information into structured, mastery-based learning paths. Powered by Google's Gemini GenAI SDK and wrapped in a premium "Academic Modernism" design system, it acts as an intelligent, dynamic classroom.

## 🚀 Current Project Status & Features

The platform is currently in active development. We have successfully implemented the core architecture and a rich suite of interactive study tools:

### Core Capabilities
- **SARA AI Copilot**: A context-aware tutoring assistant powered by Gemini. SARA monitors your progress, answers queries based on highlighted text, and generates comprehensive deep-dive content.
- **Deep Content Engine**: The system generates rigorous, course-level reading material (3500-5500 words per module), including worked examples, common mistake breakdowns, and dual explanations.
- **Live Grounded Citations**: Integration with Google Search Grounding to extract live web citations, automatically injecting clickable markers (`[1]`, `[2]`) into the text and organizing them in a dedicated Sources Panel.
- **Neural Synthesizer (Mindmaps)**: Automatic generation of interactive, visual Hierarchy Maps and Process Flows based on the lesson content to aid spatial learning.
- **Dual-Board Layout**: A split-screen interface featuring the `Whiteboard` (for deep reading and interactive text) and the `Cinema Studio / Smartboard` (for video synchronization and focused visual learning).
- **Exam Mode**: A dedicated, distraction-free environment for testing knowledge retention.

### Design System: "Academic Modernism"
- **Expansive Layouts**: Full-width, panoramic reading containers (`max-w-[1200px]`) that eliminate wasted space.
- **Premium Typography**: Clean, justified text blocks designed for maximum readability.
- **Polished Terminals**: Sleek, syntax-highlighted code blocks with macOS-style window controls, auto-wrapping, and strict padding for a modern developer aesthetic.
- **Adaptive Sidebars**: Blueprint progress rails and collapsible SARA Tutor Rails that maintain context without cluttering the screen.

## 🛠 Tech Stack

- **Frontend**: React 19 + TypeScript + Vite
- **Styling**: Tailwind CSS v4 (Utility-first)
- **AI Integration**: Google Gemini SDK (Gemini 3-Flash for logic, 2.5-Flash for TTS)
- **Backend**: Express.js Node server (Port 5000)
- **Database**: MongoDB Atlas (for state persistence)

## 💻 Run Locally

**Prerequisites:** Node.js (v18+)

1. **Install Dependencies**
   Run the following from the root directory to install frontend packages:
   ```bash
   npm install
   ```
   Navigate to the server directory and install backend packages:
   ```bash
   cd server && npm install
   cd ..
   ```

2. **Environment Variables**
   Ensure you have a `.env.local` file in the root directory with your Gemini credentials:
   ```env
   VITE_GEMINI_API_KEY=your_api_key_here
   ```

3. **Start the Development Servers**
   In terminal 1 (Frontend):
   ```bash
   npm run dev
   ```
   In terminal 2 (Backend):
   ```bash
   cd server && npm run dev
   ```

4. **Access the Application**
   Open your browser and navigate to `http://localhost:3000`.

---
*Developed with the goal of keeping education fast, accessible, and deeply engaging.*
