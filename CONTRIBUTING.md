# Contributing to Vidhyalaya

Thank you for your interest in contributing to Vidhyalaya! We welcome contributions from the community to help make personalized, adaptive education accessible to everyone.

To maintain a high quality of code, stability, and structure, please read and follow these guidelines.

---

## 1. Getting Started

### Prerequisites
- **Node.js**: Version 18.x or 20.x
- **MongoDB**: A running MongoDB instance (local or MongoDB Atlas connection URI)
- **Gemini API Key**: A Google Gemini API developer key

### Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/Lokeshgandreddy81/Vidhyalaya.git
   cd Vidhyalaya
   ```
2. **Install Frontend Dependencies**:
   ```bash
   cd frontend
   ```
   ```bash
   npm install
   ```
3. **Install Backend Dependencies**:
   ```bash
   cd ../backend
   ```
   ```bash
   npm install
   ```

### Running Locally

To run both services in development mode:

1. **Launch the Express Backend** (starts on Port 5000):
   ```bash
   cd backend
   ```
   ```bash
   npm run dev
   ```
2. **Launch the Vite Frontend** (starts on Port 3000):
   ```bash
   cd frontend
   ```
   ```bash
   npm run dev
   ```

---

## 2. Branch & Development Strategy

We maintain exactly three permanent branches:
- `main` (Production): Stable, deployable, and protected. Direct commits are blocked.
- `dev` (Development): Integration branch. All features must target `dev` first.
- `test` (Staging/QA): Release candidate validation.

### Workflow Steps:
1. **Branch out** from `dev` for feature work:
   ```bash
   git checkout dev
   git pull origin dev
   git checkout -b feature/your-feature-name
   ```
2. **Implement changes** following coding standards.
3. **Open a Pull Request** targeting the `dev` branch.
4. **Ensure CI checks pass** (testing and linting) and obtain at least one peer approval.

---

## 3. Coding Guidelines & Standards

- **State Management**: The central state of the application is managed via [Store.tsx](file:///Users/lokeshgandreddy/Sara/Vidhyalaya/frontend/src/context/Store.tsx). Avoid creating ad-hoc context providers or local component state states for global configurations.
- **Styling**: Styling should use **Tailwind CSS**. Avoid bloated custom CSS utility rules or inline styling declarations.
- **Types**: All data models (e.g., `LearningPath`, `Resource`, `UserProfile`) must flow through [types.ts](file:///Users/lokeshgandreddy/Sara/Vidhyalaya/frontend/src/types.ts).
- **Icons**: Use **Lucide React** for all frontend icons.
- **AI Requests**: Respect the `1.5s` request queue in `geminiService.ts` to avoid hitting rate limit quota ceilings.

---

## 4. Testing & Verification

Before submitting a pull request, run the test suites locally to ensure no regressions:

### Running Frontend Tests
```bash
cd frontend
npm run test
```

### Running Frontend Linter
```bash
cd frontend
npm run lint
```

### Running Backend Tests
```bash
cd backend
npm run test
```
