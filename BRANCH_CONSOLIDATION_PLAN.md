# Branch Consolidation Plan

This plan details the proposed actions (Keep, Merge, Archive, Delete) for all existing branches to clean up the repository branch sprawl and target the standard state of having only `main`, `dev`, and `test` branches.

## Target Branch Strategy

The repository will be cleaned up to retain **ONLY** the following three branches:

- `main`: Production-ready, stable, and protected branch.
- `dev`: Primary integration and active development branch.
- `test`: QA, validation, and release prep branch.

## Branch Consolidation Map

| Branch Name | Action | Evidence & Rationale |
| :--- | :--- | :--- |
| `add-403-unauthorized-tests-paths-api-14921709321711517632` | **Delete** | Fully merged into `main` on 2026-05-10. Commit: `test: add tests for 403 unauthorized scenarios in paths api`. Safe to remove. |
| `add-cn-tests-10508831180812882076` | **Delete** | Fully merged into `main` on 2026-05-09. Commit: `Merge branch 'main' into add-cn-tests-10508831180812882076`. Safe to remove. |
| `add-missing-cn-test-6271570386024782652` | **Delete** | Unmerged commits (🧪 add explicit null and undefined check to cn utility tests) are redundant. Consolidated security fixes have already been merged into `main` (e.g. PR #71/72). Safe to remove. |
| `add-tests-generate-learning-plan-13966914840273788603` | **Delete** | Fully merged into `main` on 2026-05-09. Commit: `Merge branch 'main' into add-tests-generate-learning-plan-13966914840273788603`. Safe to remove. |
| `code-health-remove-console-log-5222823553987000780` | **Delete** | Fully merged into `main` on 2026-05-10. Commit: `Remove stray console.log from geminiService`. Safe to remove. |
| `cpo/codex-grade-live-sprint` | **Delete** | Fully merged into `main` on 2026-05-26. Commit: `Codex-grade landing refresh`. Safe to remove. |
| `feature/b2b-university-pivot` | **Delete** | Fully merged into `main` on 2026-05-23. Commit: `fix: restored missing AI service functions after merge`. Safe to remove. |
| `fix-cors-vulnerability-10038275496446544458` | **Delete** | Fully merged into `main` on 2026-05-09. Commit: `🔒 Fix overly permissive CORS policy by restricting allowed origins`. Safe to remove. |
| `fix-generate-concept-map-test-8137792962035765439` | **Delete** | Fully merged into `main` on 2026-05-09. Commit: `Merge branch 'main' into fix-generate-concept-map-test-8137792962035765439`. Safe to remove. |
| `fix-global-event-type-safety-4126529737398199674` | **Delete** | Fully merged into `main` on 2026-05-10. Commit: `refactor: improve type safety for smartboard-jump custom event`. Safe to remove. |
| `fix-remove-stray-console-log-geminiservice-243564611471399343` | **Delete** | Fully merged into `main` on 2026-05-09. Commit: `chore: remove stray console.log from geminiService`. Safe to remove. |
| `fix-sanitize-video-id-8182231211768747003` | **Delete** | Fully merged into `main` on 2026-05-10. Commit: `Merge branch 'main' into fix-sanitize-video-id-8182231211768747003`. Safe to remove. |
| `fix/add-usefocussession-tests-5394560638773733717` | **Delete** | Fully merged into `main` on 2026-05-09. Commit: `Merge branch 'main' into fix/add-usefocussession-tests-5394560638773733717`. Safe to remove. |
| `fix/mass-assignment-14932952586718881509` | **Delete** | Fully merged into `main` on 2026-05-09. Commit: `fix: prevent mass assignment in user update`. Safe to remove. |
| `fix/sentinel-mass-assignment-paths-4007128404728576175` | **Delete** | Unmerged commits (Fix mass assignment vulnerability in PUT /api/paths/:id) are redundant. Consolidated security fixes have already been merged into `main` (e.g. PR #71/72). Safe to remove. |
| `improve-utils-cn-coverage-12140667491858316429` | **Delete** | Fully merged into `main` on 2026-05-10. Commit: `Merge branch 'main' into improve-utils-cn-coverage-12140667491858316429`. Safe to remove. |
| `jules-11163032486520543023-72bfa6fb` | **Delete** | Fully merged into `main` on 2026-05-10. Commit: `⚡ perf(ui): benchmark and verify pre-existing timeout optimization`. Safe to remove. |
| `jules-17424614026588597303-74df290d` | **Delete** | Fully merged into `main` on 2026-05-10. Commit: `perf(frontend): Optimize async simulation loop via batched timeouts`. Safe to remove. |
| `jules-7871667434534488033-844f82fe` | **Delete** | Fully merged into `main` on 2026-05-10. Commit: `perf(frontend): replace sequential async sleeps with batched timeouts`. Safe to remove. |
| `jules-perf-opt-videos-1865029070619631398` | **Delete** | Fully merged into `main` on 2026-05-10. Commit: `Merge branch 'main' into jules-perf-opt-videos-1865029070619631398`. Safe to remove. |
| `jules-test-coverage-videolibrary-8701654121213471443` | **Delete** | Fully merged into `main` on 2026-05-10. Commit: `Add edge case tests for getVideosByTopic`. Safe to remove. |
| `jules-testing-cn-utils-7612476907222162407` | **Delete** | Fully merged into `main` on 2026-05-10. Commit: `Merge branch 'main' into jules-testing-cn-utils-7612476907222162407`. Safe to remove. |
| `jules-testing-improvements-14644136480496804571` | **Delete** | Fully merged into `main` on 2026-05-09. Commit: `Merge branch 'main' into jules-testing-improvements-14644136480496804571`. Safe to remove. |
| `jules-utils-cn-test-5932705244058842790` | **Delete** | Fully merged into `main` on 2026-05-10. Commit: `test: add comprehensive tests for utils.ts cn function`. Safe to remove. |
| `opencode/neural-map-enhancements` | **Delete** | Fully merged into `main` on 2026-06-02. Commit: `feat: add interactive vector whiteboard, cortex code sandbox playground, and web audio soundscapes service`. Safe to remove. |
| `optimize-match-chapters-scoring-6657839851045233722` | **Delete** | Fully merged into `main` on 2026-05-10. Commit: `Optimize scoring loop in match-chapters route by replacing includes with indexOf and short-circuiting logic`. Safe to remove. |
| `palette/ux-a11y-icon-buttons-18074274185278135709` | **Delete** | Unmerged commits (🎨 Palette: Add ARIA labels to icon-only buttons) are redundant. Consolidated security fixes have already been merged into `main` (e.g. PR #71/72). Safe to remove. |
| `perf-batched-timeouts-8786440109553652781` | **Delete** | Fully merged into `main` on 2026-05-10. Commit: `Merge branch 'main' into perf-batched-timeouts-8786440109553652781`. Safe to remove. |
| `perf-gemini-service-13092091177557688016` | **Delete** | Fully merged into `main` on 2026-05-09. Commit: `perf: optimize scoutResources array iteration and string matching`. Safe to remove. |
| `perf-video-library-optimization-12150062995221106277` | **Delete** | Fully merged into `main` on 2026-05-09. Commit: `perf: optimize video topic matching by using Sets for lookups`. Safe to remove. |
| `perf/gemini-service-optimization-4634587511866402547` | **Delete** | Unmerged commits (perf(geminiService): optimize scoutResources looping logic) are redundant. Consolidated security fixes have already been merged into `main` (e.g. PR #71/72). Safe to remove. |
| `perf/optimize-chapter-parsing-12839870735801131266` | **Delete** | Fully merged into `main` on 2026-05-09. Commit: `perf: optimize regex processing for youtube chapters in videos route`. Safe to remove. |
| `perf/optimize-match-chapters-13468513569535368760` | **Delete** | Fully merged into `main` on 2026-05-09. Commit: `perf(videos): optimize chapter scoring by hoisting redundant logic`. Safe to remove. |
| `performance-optimize-timeout-10228167147844161228` | **Delete** | Fully merged into `main` on 2026-05-09. Commit: `perf: optimize UI simulation loop with scheduled timeouts`. Safe to remove. |
| `performance-video-library-optimizations-5751612829702729378` | **Delete** | Fully merged into `main` on 2026-05-10. Commit: `Merge branch 'main' into performance-video-library-optimizations-5751612829702729378`. Safe to remove. |
| `performance/video-library-optimizations-692985198445789461` | **Delete** | Fully merged into `main` on 2026-05-10. Commit: `Merge branch 'main' into performance/video-library-optimizations-692985198445789461`. Safe to remove. |
| `performance/videoLibrary-optimization-1486245133550584347` | **Delete** | Fully merged into `main` on 2026-05-10. Commit: `Merge branch 'main' into performance/videoLibrary-optimization-1486245133550584347`. Safe to remove. |
| `remove-stray-console-log-geminiservice-8471902603347656220` | **Delete** | Fully merged into `main` on 2026-05-10. Commit: `chore: remove stray console.log from generateModuleContent`. Safe to remove. |
| `security-fix-auth-middleware-12189392604562181156` | **Delete** | Fully merged into `main` on 2026-05-09. Commit: `Merge branch 'main' into security-fix-auth-middleware-12189392604562181156`. Safe to remove. |
| `security-fix-mass-assignment-17217084222908592721` | **Delete** | Fully merged into `main` on 2026-05-09. Commit: `Merge branch 'main' into security-fix-mass-assignment-17217084222908592721`. Safe to remove. |
| `sentinel-fix-jwt-secret-9799369815016350574` | **Delete** | Fully merged into `main` on 2026-05-10. Commit: `🛡️ Sentinel: [CRITICAL] Fix Hardcoded JWT Secret Vulnerability`. Safe to remove. |
| `sentinel-fix-mass-assignment-12623479318160201233` | **Delete** | Unmerged commits (Fix mass assignment vulnerability in paths PUT route) are redundant. Consolidated security fixes have already been merged into `main` (e.g. PR #71/72). Safe to remove. |
| `sentinel-fix-mass-assignment-9253613687497151503` | **Delete** | Unmerged commits (🛡️ Sentinel: [CRITICAL] Fix Mass Assignment and NoSQL Injection in LearningPaths) are redundant. Consolidated security fixes have already been merged into `main` (e.g. PR #71/72). Safe to remove. |
| `sentinel-fix-mass-assignment-paths-15269822382192566560` | **Delete** | Unmerged commits (🛡️ Sentinel: [HIGH] Fix Mass Assignment Vulnerability in Learning Paths API) are redundant. Consolidated security fixes have already been merged into `main` (e.g. PR #71/72). Safe to remove. |
| `sentinel-fix-smart-study-auth-15359842298595970705` | **Delete** | Unmerged commits (🛡️ Sentinel: [CRITICAL] Add authentication to smart study endpoints) are redundant. Consolidated security fixes have already been merged into `main` (e.g. PR #71/72). Safe to remove. |
| `sentinel-fix-token-minting-7170495632667007458` | **Delete** | Unmerged commits (Fix Account Takeover via Unauthenticated Token Minting) are redundant. Consolidated security fixes have already been merged into `main` (e.g. PR #71/72). Safe to remove. |
| `sentinel-smart-study-auth-17747513168276001166` | **Delete** | Unmerged commits (🛡️ Sentinel: [CRITICAL] Fix Missing Authentication and IDOR in Smart Study API) are redundant. Consolidated security fixes have already been merged into `main` (e.g. PR #71/72). Safe to remove. |
| `sentinel-study-routes-auth-idor-2930191821843202747` | **Delete** | Unmerged commits (🛡️ Sentinel: [CRITICAL] Fix Missing Authentication & IDOR in Study API) are redundant. Consolidated security fixes have already been merged into `main` (e.g. PR #71/72). Safe to remove. |
| `sentinel/fix-mass-assignment-paths-10508196753636351757` | **Delete** | Unmerged commits (Fix mass assignment vulnerability in LearningPath update route) are redundant. Consolidated security fixes have already been merged into `main` (e.g. PR #71/72). Safe to remove. |
| `sentinel/fix-nosql-injection-mass-assignment-6782595371732854259` | **Delete** | Unmerged commits (fix: prevent NoSQL injection and mass assignment in learning paths update) are redundant. Consolidated security fixes have already been merged into `main` (e.g. PR #71/72). Safe to remove. |
| `sentinel/fix-nosql-injection-paths-8599296298397460172` | **Delete** | Fully merged into `main` on 2026-05-22. Commit: `🛡️ Sentinel: [CRITICAL] Fix mass assignment and NoSQL injection in paths API`. Safe to remove. |
| `sentinel/fix-paths-mass-assignment-6877347427159125526` | **Delete** | Unmerged commits (🛡️ Sentinel: [MEDIUM] Fix mass assignment vulnerability in LearningPath update) are redundant. Consolidated security fixes have already been merged into `main` (e.g. PR #71/72). Safe to remove. |
| `sentinel/fix-smartstudy-auth-idor-9155402510739397300` | **Delete** | Fully merged into `main` on 2026-05-23. Commit: `🛡️ Sentinel: Fix Missing Authentication & IDOR in Smart Study API`. Safe to remove. |
| `sentinel/fix-study-routes-auth-idor-11956691728126814998` | **Delete** | Unmerged commits (🛡️ Sentinel: [CRITICAL] Fix Missing Auth and IDOR in Study API) are redundant. Consolidated security fixes have already been merged into `main` (e.g. PR #71/72). Safe to remove. |
| `sentinel/fix-unprotected-study-routes-11651949529562934613` | **Delete** | Unmerged commits (🛡️ Sentinel: [CRITICAL] Add authentication to unprotected study API endpoints) are redundant. Consolidated security fixes have already been merged into `main` (e.g. PR #71/72). Safe to remove. |
| `sentinel/prevent-mass-assignment-2776045384361824879` | **Delete** | Unmerged commits (🛡️ Sentinel: [MEDIUM] Prevent mass assignment vulnerability in LearningPath update) are redundant. Consolidated security fixes have already been merged into `main` (e.g. PR #71/72). Safe to remove. |
| `sentinel/smart-study-auth-idor-14969917409299075005` | **Delete** | Unmerged commits (🛡️ Sentinel: [CRITICAL] Fix Missing Auth and IDOR in Smart Study API) are redundant. Consolidated security fixes have already been merged into `main` (e.g. PR #71/72). Safe to remove. |
| `smart-study-feature` | **Delete** | Fully merged into `main` on 2026-05-13. Commit: `fix: updated API port to 5001 and improved AI error handling`. Safe to remove. |
| `test-api-queue-gemini-4592934204624127164` | **Delete** | Fully merged into `main` on 2026-05-09. Commit: `🧪 test(frontend): Add test suite for AIRequestQueue in geminiService`. Safe to remove. |
| `test-coverage/video-curation-service-7592760416345355119` | **Delete** | Fully merged into `main` on 2026-05-10. Commit: `🧪 Add test coverage and fix bugs in sanitizeVideoId utility`. Safe to remove. |
| `test-generate-audio-overview-12208892138546124074` | **Delete** | Fully merged into `main` on 2026-05-10. Commit: `test: add generateAudioOverview tests`. Safe to remove. |
| `test-generate-audio-overview-4006232092500452863` | **Delete** | Fully merged into `main` on 2026-05-09. Commit: `Merge branch 'main' into test-generate-audio-overview-4006232092500452863`. Safe to remove. |
| `test-paths-route-9490666548990321617` | **Delete** | Fully merged into `main` on 2026-05-09. Commit: `Merge branch 'main' into test-paths-route-9490666548990321617`. Safe to remove. |
| `test/generate-concept-map-parsing-failure-14984516716826330894` | **Delete** | Fully merged into `main` on 2026-05-10. Commit: `test(frontend): centralize tests and cover parsing failure edge case in generateConceptMap`. Safe to remove. |
| `test/get-perfect-video-9993772135297550579` | **Delete** | Fully merged into `main` on 2026-05-09. Commit: `test: add getPerfectVideo service tests`. Safe to remove. |
| `test/utils-cn-coverage-697615355276329941` | **Delete** | Fully merged into `main` on 2026-05-10. Commit: `Merge branch 'main' into test/utils-cn-coverage-697615355276329941`. Safe to remove. |
| `testing-improvement-geminiservice-5655181713187022426` | **Delete** | Fully merged into `main` on 2026-05-09. Commit: `🧪 test: improve generateConceptMap parsing failure coverage`. Safe to remove. |
| `testing-improvement-paths-api-18402273260204216422` | **Delete** | Fully merged into `main` on 2026-05-09. Commit: `Add comprehensive unit tests for paths API routes using supertest and mock.method`. Safe to remove. |
| `testing-improvement-sanitize-video-id-12669161688203165414` | **Delete** | Fully merged into `main` on 2026-05-09. Commit: `🧪 Add test coverage for sanitizeVideoId utility`. Safe to remove. |
| `testing-sanitize-video-id-11646371333736544834` | **Delete** | Fully merged into `main` on 2026-05-10. Commit: `Merge branch 'main' into testing-sanitize-video-id-11646371333736544834`. Safe to remove. |
| `testing-sanitize-video-id-6897501980297009885` | **Delete** | Fully merged into `main` on 2026-05-10. Commit: `test: improve sanitizeVideoId coverage and regex`. Safe to remove. |
| `testing-video-curation-service-171773308986672123` | **Delete** | Fully merged into `main` on 2026-05-10. Commit: `🧪 Improve getPerfectVideo test coverage in videoCurationService`. Safe to remove. |
| `testing/improve-cn-utility-tests-641121885395294690` | **Delete** | Fully merged into `main` on 2026-05-10. Commit: `Merge branch 'main' into testing/improve-cn-utility-tests-641121885395294690`. Safe to remove. |
| `ux-improve-icon-buttons-11738417009959906653` | **Delete** | Fully merged into `main` on 2026-05-10. Commit: `feat: add aria-label and title to icon-only buttons`. Safe to remove. |
| `main` | **Keep** | Primary branch. Source of truth. |
| `dev` | **Create & Keep** | Creating from `main` to serve as the development branch. |
| `test` | **Create & Keep** | Creating from `main` to serve as the QA and staging branch. |
