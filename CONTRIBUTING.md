# Contributing to Vidhyalaya

Thank you for your interest in contributing to **Vidhyalaya**! We welcome contributions from developers, educators, and designers to help build a professional, AI-native environment for personalized education.

---

## 1. Local Development Setup

### Prerequisites
*   **Node.js**: Version 18.x or 20.x
*   **MongoDB**: A running MongoDB instance (either local or a MongoDB Atlas connection URI)
*   **Google Gemini API Key**: An API key from Google AI Studio (required for AI features)

### Installation
1.  **Clone the repository**:
    ```bash
    git clone https://github.com/Lokeshgandreddy81/Vidhyalaya.git
    cd Vidhyalaya
    ```
2.  **Install Frontend Dependencies**:
    ```bash
    cd frontend
    npm install
    ```
3.  **Install Backend Dependencies**:
    ```bash
    cd ../backend
    npm install
    ```

### Running Locally
You will need two separate terminal windows:

*   **Express Backend Server (starts on Port 5000)**:
    ```bash
    cd backend
    npm run dev
    ```
    *Note: If MongoDB is not connected, the server will automatically launch a fallback in-memory database (`mongodb-memory-server`) to let you develop locally without database setup.*
    
*   **Vite Frontend Dev Server (starts on Port 3000)**:
    ```bash
    cd frontend
    npm run dev
    ```
    Open `http://localhost:3000` in your browser.

---

## 2. Branch & Git Strategy

We enforce a strict Git workflow to keep our `main` branch clean and deployable at all times.

### Development Branches
*   **`main` (Stable/Production)**: Stable release branch. Direct commits are blocked.
*   **`dev` (Development)**: Integration branch. All features must target `dev`.
*   **`test` (Staging/QA)**: Release candidate verification branch.

### Feature Workflow
1.  Pull the latest changes from `dev`:
    ```bash
    git checkout dev
    git pull origin dev
    ```
2.  Create a feature branch using a naming convention:
    *   `feat/your-feature-name` (for new features)
    *   `fix/bug-fix-name` (for bug fixes)
    *   `docs/doc-updates` (for documentation)
    ```bash
    git checkout -b feat/add-spaced-repetition
    ```
3.  Implement changes, commit cleanly, and push:
    ```bash
    git push origin feat/add-spaced-repetition
    ```
4.  Open a Pull Request targeting the `dev` branch.

---

## 3. Engineering Guidelines & Coding Standards

We follow strict design protocols and codebase hygiene rules:

*   **State Management**:
    *   The central state of the application is managed via the Zustand store in [Store.tsx](file:///Users/lokeshgandreddy/Vidhyalaya/frontend/src/context/Store.tsx).
    *   All mutations must be made **optimistically** in the store before triggering API synchronization to guarantee zero latency.
*   **Type Safety**:
    *   No usage of `any`. Avoid implicit types.
    *   All shared models (e.g., `LearningPath`, `Resource`, `UserProfile`) must flow through [types.ts](file:///Users/lokeshgandreddy/Vidhyalaya/frontend/src/types.ts).
*   **Aesthetics (Academic Modernism)**:
    *   Respect the global Sky-Blue Ice background Aurora gradient.
    *   Use solid white cards (`#ffffff`) for layouts to pop cleanly against the background.
    *   Always justify text blocks (`text-justify` and `hyphens-auto`) for scholarly readability.
*   **Icons**:
    *   Use **Lucide React** for all interface icons.
*   **AI Safety Throttle**:
    *   All Gemini API calls must queue through `apiQueue.add()` with a 1.5s delay and 120s timeout to prevent rate limits.

---

## 4. Testing & Verification

Before submitting a pull request, you **must** verify your changes pass all lints and unit tests locally.

### Frontend Tests & Lints
```bash
cd frontend
npm run lint      # Runs tsc type-check. Zero warnings/errors allowed.
npm run test      # Runs Vitest unit tests.
npm run build     # Verifies production bundling compiles cleanly.
```

### Backend Tests
```bash
cd backend
npm test          # Runs Node.js test runner suite.
```

---

## 5. Pull Request Checklist

Before marking your PR as ready for review:
*   [ ] My branch is up to date with `dev`.
*   [ ] I have added unit tests for any new features or bug fixes.
*   [ ] `npm run lint` passes in `frontend/` with zero warnings.
*   [ ] All unit tests pass in both `frontend/` and `backend/`.
*   [ ] I have documented my code changes and updated relevant markdown guides.
