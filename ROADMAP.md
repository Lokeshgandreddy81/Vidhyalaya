# Vidhyalaya Product Roadmap

This document outlines the strategic vision and upcoming milestones for **Vidhyalaya**. Our goal is to create the ultimate adaptive, AI-orchestrated learning environment for student agency and active recall.

---

## 🧭 Strategic Vision

Vidhyalaya aims to evolve from a single-player academic organizer into a collaborative, cross-platform knowledge network. The roadmap is divided into three major horizons:

---

## 🌅 Phase 1: Interactive Recall & Offline Zen (Short-Term)

Focus: Enhancing personal retention loops, offline stability, and active study tooling.

*   **Automated Spaced Repetition (SRS)**:
    *   Integrate SuperMemo-2 (SM-2) algorithm for system-generated flashcards.
    *   Add daily review cards panel in Dashboard with streak tracking.
*   **Offline Workspace Cache**:
    *   Transform frontend into a Progressive Web App (PWA) with complete offline asset caching.
    *   Implement client-side offline database sync using IndexedDB + Dexie.js.
*   **Cortex Sandbox Extensions**:
    *   Add native support for compiled languages (Rust, Go, C++) using WebAssembly (Wasm) runtimes directly in the browser.
    *   Support multi-file workspaces inside the simulated editor drawer.

---

## ⛰️ Phase 2: Collaborative Hub & Native Apps (Medium-Term)

Focus: Expanding the application to support team study sessions and cross-platform native bundles.

*   **P2P Collaborative Whiteboards**:
    *   Add real-time peer study groups using Yjs CRDTs and WebRTC.
    *   Implement shared neural concept maps where multiple students can connect concept nodes together.
*   **Native Desktop & Mobile Apps**:
    *   Bundle frontend client into Electron/Tauri wrappers for Mac, Windows, and Linux support.
    *   Develop React Native or Capacitor wrappers for iOS and Android tablets.
*   **Vector Database (RAG) Grounding Polish**:
    *   Provide automated citation overlays that highlight original lines inside uploaded PDF text sheets.
    *   Support scraping and parsing public research repositories (arXiv, PubMed) during web-scout operations.

---

## 🌌 Phase 3: AI Study Buddy & Agentic Voice (Long-Term)

Focus: Incorporating audio interfaces and multi-agent educational workflows.

*   **Gemini Live Voice Integration**:
    *   Integrate Gemini Multimodal Live API to enable synchronous, real-time vocal tutoring with SARA.
    *   Allow hands-free "Lecturing Mode" where SARA reads Whiteboard material, halts on user questions, and answers verbally.
*   **Automatic Syllabus Alignment**:
    *   Support uploading a course syllabus, automatically indexing all reference texts, and structuring the entire semester's study schedule.
*   **Mastery Certifications**:
    *   Implement generative, non-cheatable comprehensive exams that dynamically adapt question difficulty to the student's concept node mastery ratings, culminating in cryptography-signed mastery badges.
