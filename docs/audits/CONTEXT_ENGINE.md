# CONTEXT ENGINE

## The Omniscient Payload
For SARA to act like a mentor looking over the student's shoulder, she cannot rely on the student to explain what they are doing. The Context Engine injects the environment's state directly into the LLM prompt silently.

## The 8 Pillars of Context

1. **Current Module:** The overarching learning objective (e.g., "Intro to React State").
2. **Current Mission:** The specific active task (e.g., "Build a counter button").
3. **Current File:** The exact file currently open in the Monaco Editor (e.g., `src/Counter.tsx`).
4. **Current Code:** The live contents of the active file, and potentially the specific line the cursor is on.
5. **Current Error:** The last 10 lines of the Terminal output, especially if an exit code 1 was thrown.
6. **Current Skill Graph:** The student's specific mastery vectors (e.g., `useState: 0.9`, `useEffect: 0.2`).
7. **Previous Mistakes:** What did the student get wrong 5 minutes ago?
8. **Learning History:** Has the student encountered this concept before in a different module?

## The "Never Repeat" Rule
Because SARA has this context, the following student interaction becomes possible:
**Student:** "Why is it breaking?"
*(SARA knows the student is looking at `App.tsx`, knows the terminal just threw a `ReferenceError: count is not defined`, and knows the student just learned about `let` vs `const` yesterday).*
**SARA:** "You forgot to initialize the `count` variable in `App.tsx`. Remember how we used `let` for variables that change yesterday?"
