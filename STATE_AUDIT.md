# State Management Audit (STATE_AUDIT.md)

This report details an audit of global state, local state, context sync structures, and re-render efficiency in Vidyal.ai.

---

### 1. Global State Architecture

#### Store Evaluation
Global state is managed in [Store.tsx](file:///Users/lokeshgandreddy/Sara/Vidhyalaya/frontend/src/context/Store.tsx) via React Context (`AppContext`) and consumed using the `useAppStore` hook.
*   **The Single-Object Bottleneck**: `Store.tsx` wraps its state inside a single value object.
    ```tsx
    AppContext.Provider value={{
      paths, activePathId, userProfile, achievements, geometryAnchors, isCloudSynced, isAuthenticated, setAuthenticated, ...
    }}
    ```
    *   **Impact**: Any change to *any* global property (e.g., updating user XP, unlocking an achievement, or auto-saving local notes) updates the context value object reference. Consequently, **every component in the application subscribing to `useAppStore` is forced to re-render**, even if it only depends on a static property like `isAuthenticated` or `activePathId`.
    *   **Mitigation**: Split the store into three focused context segments:
        1.  `AuthContext`: Handles credentials and setup API keys.
        2.  `LearningPathContext`: Handles active paths, module progress, and resource replacements.
        3.  `UserPreferencesContext`: Handles themes, streaks, levels, and user XP.

---

### 2. Local State Colocation & State Bloat

#### Page-Level State Pollution
Many pages house a large volume of temporary layout and visual control state variables that should be encapsulated in custom hooks or child components.
*   **Case Study**: [StudySession.tsx](file:///Users/lokeshgandreddy/Sara/Vidhyalaya/frontend/src/pages/StudySession.tsx) contains over 25 individual local states:
    *   `showAiDropdown`, `isAiLoading` (AI panel states)
    *   `showSearch`, `searchQuery`, `replaceQuery` (Search & Replace edit modes)
    *   `showOutline`, `wordGoal`, `saveStatus` (Notes editor metrics)
    *   `copilotEnabled`, `ghostSuggestion`, `isCopilotLoading`, `typingSound` (Autocomplete configuration)
*   **Impact**: This clutter increases compiler load and makes testing individual visual modules difficult.
*   **Solution**: Group notes-related states (search/replace, word goals, autocompletes, backup handlers) into a custom hook `useRichNotes.ts` inside `features/study/hooks/`.

---

### 3. Derived State Analysis

#### Progress Calculation
In [Store.tsx:L160-179](file:///Users/lokeshgandreddy/Sara/Vidhyalaya/frontend/src/context/Store.tsx#L160-179), path progress is recalculated on every module completion status update:
```typescript
const total = newPhases.reduce((acc, p) => acc + p.modules.length, 0);
const done = newPhases.reduce((acc, p) => acc + p.modules.filter(m => m.isCompleted).length, 0);
const updatedPath = { ...path, phases: newPhases, progress: Math.round((done / total) * 100) };
```
*   **Analysis**: This is correct and keeps the data structure self-consistent, but we should ensure the calculation doesn't run during render cycles of layout dashboards.

#### Live Notes Analysis
In `StudySession.tsx`, `conceptCoverage` is derived from the notes `content` on every keypress:
```typescript
const conceptCoverage = useMemo(() => {
  const list: { concept: string; isCovered: boolean }[] = [];
  if (!keyConcepts || keyConcepts.length === 0) return list;

  const lowerContent = (content || '').toLowerCase();
  keyConcepts.forEach(c => {
    const isCovered = lowerContent.includes(c.toLowerCase());
    list.push({ concept: c, isCovered });
  });
  return list;
}, [content, keyConcepts]);
```
*   **Concern**: As a user types notes, `content` changes on every keystroke. Performing multiple substring lookups on every single character inputted adds typing latency.
*   **Solution**: Debounce the notes update hook by 300ms so that derived calculations (`conceptCoverage` and autocomplete suggestion requests) trigger only after typing pauses.

---

### 4. Duplicate State Risks

*   **Offline / Backup Synchronization**: The application maintains a double-write state strategy for safety:
    1.  React state (paths array) -> saved to MongoDB Atlas via optimistic writes.
    2.  `localStorage` draft backup -> stored under `vidyalai_notes_backup_<module_id>`.
*   **Sync Drift**: If the network times out and the API call fails, the database and local storage backup drift. Currently, there is no reconciliation routine to check if the database version is newer than the local storage backup before prompting the user to restore.
