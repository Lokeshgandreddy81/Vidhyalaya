# Vidhyalaya - Engineering Protocol & Developer Guide

Welcome to the **Vidhyalaya** (Vidyal.ai) core developer documentation. This guide establishes the architectural boundaries, design systems, and engineering protocols required for collaborating on the platform.

---

## 1. Project Identity
Vidhyalaya is an adaptive orchestration engine for personalized education. It transforms unstructured cognitive payloads (PDFs, YouTube videos, raw notes) into high-fidelity academic schemas (curriculum roadmaps, interactive neural maps) using Google's Gemini AI. It is built to provide a seamless, distraction-free, AI-driven learning experience.

---

## 2. Technical Stack

### Frontend (Client-Side)
*   **Core**: React v19.2.6 + TypeScript v5.8.2 + Vite v6.2.0.
*   **Styling Engine**: Tailwind CSS v4.2.2 (Utility-first) + Vanilla CSS (`index.css` for complex auroras).
*   **Motion & UI**: Framer Motion, Radix UI Primitives, Lucide React (Icons).
*   **AI Integration**: Google Gemini GenAI SDK (`^1.38.0`). (1.5-Flash for logic and TTS).
*   **Media & Visualization**: `react-youtube` (synchronized video), D3.js (via `NeuralSynthesizer.tsx`), Mermaid.js.
*   **Document Processing**: `pdfjs-dist` (3.11.174) + `react-pdf`.

### Backend (Server-Side)
*   **Core**: Node.js + Express.js v4.18.2.
*   **Persistence**: MongoDB Atlas via Mongoose v8.0.0.
*   **Security**: JWT for Authentication, CORS, Compression.

*Note: We do not use LocalStorage for primary state; all critical learning data must persist to MongoDB to ensure cross-device fluidity.*

---

## 3. Design System & Aesthetics (Academic Modernism)

We adhere strictly to the "Academic Modernism" design philosophy, blending high readability with premium, Vercel-style UI components.

*   **Global Layout (Sky-Blue Ice)**: The application background utilizes a highly polished, permanent baby-blue-ice gradient (`linear-gradient(135deg, #eef5ff 0%, #e2ecfc 100%)`) defined in `index.css`.
*   **High-Contrast Surfaces**: All primary dashboard containers, library shelves, schedule grids, and cards must use permanent, pure solid white (`#ffffff`) backgrounds to stand out cleanly against the layout. Avoid translucent/transparent panels unless actively layered over media.
*   **Study Session Zen Mode**: Immersive study sessions switch to a deeply focused cinematic dark mode (`bg-[#05070a]`), dropping all borders and distractions for pure content consumption.
*   **Typography**: Mandatory `text-justify` and `hyphens-auto` on all content paragraphs for rigorous academic readability.
*   **Interactions**: Hover states should be soft, utilizing kinetic physics via Framer Motion (`type: "spring"`).

---

## 4. Development Workflow

### Initial Setup
```bash
# Install dependencies for both layers
cd backend && npm install
cd ../frontend && npm install
```

### Running Locally
You will need two separate terminal windows:
*   **Frontend Dev Server (Port 3000)**: `cd frontend && npm run dev`
*   **Backend Express Server (Port 5000)**: `cd backend && npm run dev`

### Production & Verification
*   **Build**: `cd frontend && npm run build`
*   **Strict Type-Check**: `cd frontend && npm run lint` (runs `tsc --noEmit`). **Zero warnings permitted.**
*   **Testing**: `npm run test` (Vitest on frontend).

---

## 5. Architectural Data Flow

1.  **State Management**: `frontend/src/context/Store.tsx` (`useAppStore`) is the global source of truth via Zustand/Context.
2.  **Optimistic Sync**: State mutations MUST be applied optimistically in the Store before triggering background API synchronization (`services/api.ts`). Zero-latency responsiveness is a core requirement.
3.  **View Layering**: `frontend/src/context/FocusContext.tsx` manages immersive learning layers (Zen Mode toggles).
4.  **AI Service**: `frontend/src/services/geminiService.ts` handles all prompt engineering. 
5.  **Pipeline**: Frontend (Action) → Gemini (Synthesis) → Express (Persistence) → MongoDB Atlas.

---

## 6. Critical Engineering Rules

*   **AI Safety Throttle**: All Gemini requests MUST use `apiQueue.add()` with a strict **1.5s queue delay** and a **120s per-task timeout**. This prevents HTTP 429 quota exhaustion and hung generative processes.
*   **Strict Typing**: Absolute ban on `any`. No implicit objects in state; all domain models MUST flow strictly through `frontend/src/types.ts`.
*   **Security (Owner Lock)**: Backend routes MUST verify that `req.user.id` (from the decoded JWT) matches the `userId` of the resource being accessed or mutated.
*   **Scholarly Grounding**: All AI-generated whiteboard content MUST be grounded in pre-scouted module resources. Every step heading (H2) must be followed by a `> Source: [index]` marker referencing the unified bibliography.
*   **Failsafe (Sync)**: Use a 5-second failsafe timer (`setIsCloudSynced(true)`) during the initial application load to forcefully unblock the UI if the cloud fetch hangs.
*   **Sandbox Terminal Run Button**: The floating "Run" button in the Cortex Code Sandbox drawer/terminal, as well as the "Run in Sandbox" option rendered over markdown code blocks (for JavaScript, TypeScript, HTML, CSS, Python, Go, and Rust) in `ContentRenderer.tsx`, are critical for active recall and interactive feedback. They must always remain highly visible, z-indexed above writing sheets, and never be removed, hidden, disabled, or missed under any circumstances.

---

## 7. Common Pitfalls & Solutions

*   **AI Markdown Contamination**: Generative models occasionally return malformed tables or boilerplate like "Architectural Intelligence Report". Content MUST pass through `cleanContent()` and `healTables()` sanitizers before rendering to the DOM.
*   **Video Desync**: AI-scouted YouTube IDs often point to private, age-restricted, or deleted videos. Always verify IDs via `api.verifyVideos` before promoting them to the user interface.
*   **Visual Overlap**: `ArchitectureTree` nodes must maintain a `min-w-[900px]` constraint to prevent collisions on complex generative subjects.
*   **Generic Hallucination**: Avoid requesting generic content. Always prioritize and inject the `moduleResources` found during the Web Scout phase into the synthesis prompts. 

---

## 8. Production Deployment & Routing Fallbacks

Since the application uses `BrowserRouter` for clean, professional URL paths, all deep links (e.g., `/dashboard`, `/study/:pathId/...`) will result in a standard SPA `404 Not Found` error upon page reload or direct access if the host server is not configured correctly.

### Configured Out-of-the-Box Fallbacks:
- **Vercel**: Pre-configured via [frontend/vercel.json](file:///Users/lokeshgandreddy/Vidhyalaya/frontend/vercel.json) to rewrite all requests back to `/index.html`.
- **Netlify**: Pre-configured via [frontend/public/_redirects](file:///Users/lokeshgandreddy/Vidhyalaya/frontend/public/_redirects).

### Manual Configuration Required for Other Hosts:
- **Nginx**: In your server block, add `try_files` routing:
  ```nginx
  location / {
      try_files $uri $uri/ /index.html;
  }
  ```
- **Apache**: Create a `.htaccess` file in the build root:
  ```apache
  RewriteEngine On
  RewriteBase /
  RewriteRule ^index\.html$ - [L]
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteRule . /index.html [L]
  ```
 
