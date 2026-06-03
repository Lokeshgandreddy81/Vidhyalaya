## 2024-06-03 - Missing Authentication on API Endpoints
**Vulnerability:** Several backend API endpoints in `/api/study` (`/chat`, `/generate-flashcards`, `/grade-flashcard-answer`, `/generate-quiz`) were completely unprotected and lacked `authenticateToken` middleware. This could allow unauthorized users to exploit these endpoints, bypassing JWT validation.
**Learning:** Forgetting to register authentication middleware (`router.use(authenticateToken)`) on new route groups exposes sensitive endpoints.
**Prevention:** Ensure all new route files that handle protected operations include the authentication middleware by default, and double-check frontend fetch clients to ensure they use `fetchWithAuth`.
