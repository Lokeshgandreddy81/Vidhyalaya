# Performance Audit (PERFORMANCE_AUDIT.md)

This report details a performance audit of Vidyal.ai's frontend client, analyzing render cycles, effect hooks, useMemo dependencies, code splitting, and memory leak risks.

---

### 1. Code Splitting & Lazy Loading

#### Initial Page Load
*   **Assessment**: [App.tsx](file:///Users/lokeshgandreddy/Sara/Vidhyalaya/frontend/src/App.tsx) imports all 17 page files statically.
*   **Impact**: When Vite compiles the codebase, it creates a single large bundle. Heavy third-party libraries (like `pdfjs-dist` - approx. 2.5MB, `mermaid` - approx. 1MB, and `framer-motion`) are loaded upfront. This delays the initial page load, especially on slower mobile connections.
*   **Solution**: Implement dynamic imports with `React.lazy` and `Suspense` for routed page views:
    ```tsx
    const StudySession = React.lazy(() => import('./pages/StudySession'));
    const CodeSandbox = React.lazy(() => import('./components/ui/CodeSandbox'));
    ```

---

### 2. Component Re-renders & Context Synchronization

#### The Monolithic Store Bottleneck
*   **Assessment**: `Store.tsx` encapsulates paths, profiles, and achievements in a single state object.
*   **Impact**: When a user types in `RichNotesEditor`, notes are auto-saved to the database, updating the global paths state array. This triggers a full re-render of the parent page component and all consumer components of the store.
*   **Solution**: Extract the notes-saving logic from the global store, or split the global context store into smaller contexts (like `PathContext` and `UserContext`) to isolate updates.

---

### 3. useMemo & useEffect Analysis

#### useMemo Misuse (Bypassed Caches)
*   **Observation**: In [StudySession.tsx:L291-301](file:///Users/lokeshgandreddy/Sara/Vidhyalaya/frontend/src/pages/StudySession.tsx#L291-301), the notes concept coverage is computed using `useMemo`:
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
    *   **The Issue**: The dependency `content` changes on every single keystroke. This causes the array scan to run on every character typed, bypassing the cache.
    *   **Solution**: Debounce the notes editor updates by 300ms so that coverage checks and autocomplete suggestions run only after the user pauses typing.

#### useEffect Abuse (Dangling Timeouts)
*   **Observation**: The autocomplete ghost suggestion effect uses a `setTimeout` inside a `useEffect` loop that triggers whenever `content` updates:
    ```typescript
    useEffect(() => {
      if (!copilotEnabled || !content || viewMode === 'preview') {
        setGhostSuggestion('');
        return;
      }
      if (copilotTimeoutRef.current) clearTimeout(copilotTimeoutRef.current);
      setGhostSuggestion('');
      copilotTimeoutRef.current = setTimeout(async () => {
        ...
      }, 1200);
      return () => {
        if (copilotTimeoutRef.current) clearTimeout(copilotTimeoutRef.current);
      };
    }, [content, copilotEnabled, ...]);
    ```
    *   **The Issue**: The effect runs on every character typed, constantly instantiating and clearing timeouts.
    *   **Solution**: Move the typing timeout logic into a custom `useDebounce` hook to keep the component code clean.

---

### 4. CPU & Thread Blocking Calculations

#### Canvas Redrawing
*   **Observation**: `ConceptMapRenderer.tsx` handles drag, zoom, and selection updates on the main JavaScript thread, recalculating layout coordinates and redrawing node shapes dynamically.
*   **Impact**: Dragging a dense concept map can trigger layout thrashing, causing frame drops below 60fps.
*   **Solution**:
    1. Pre-render static links and nodes onto an offscreen canvas.
    2. Draw only active selections and hover states on the main interactive canvas.

---

### 5. Memory Leaks Analysis

#### Synthesizer Audio Context
*   **Observation**: `KeyboardSynth` maintains a static reference to the browser's `AudioContext`.
*   **Risk**: If the browser tab is left open in the background, the audio context remains active, continuing to consume CPU cycles.
*   **Solution**: Add a page-level visibility listener to automatically suspend the audio context when the tab is inactive and resume it when the user returns.
