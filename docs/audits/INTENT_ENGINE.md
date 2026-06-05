# INTENT ENGINE

## The "Why" Before the "What"
Before generating a response, the Cortex system must pass the user's input through the **Intent Classifier**. The system must identify the *true goal* of the user, which is rarely what they literally typed.

## Intent Classification Categories

### 1. The "Frustration" Intent
- **Trigger:** "This doesn't work", "I'm lost", "Why is this so hard", random keyboard mashing.
- **Real Goal:** The student needs a win, emotional validation, or a very small, guided step forward.
- **Engine Action:** Route to `Coach Mode` or `Pair Programmer Mode`. Lower the difficulty of the next response.

### 2. The "Debugging" Intent
- **Trigger:** "Why is X undefined?", "It says syntax error", "Look at this traceback".
- **Real Goal:** The student wants to fix broken code.
- **Engine Action:** Route to `Debugger Mode`. Pull terminal context and current file context. Do not explain abstract theory; focus on the concrete error.

### 3. The "Conceptual" Intent
- **Trigger:** "I don't get React state", "Explain closures", "What is the difference between X and Y?".
- **Real Goal:** The student lacks the mental model.
- **Engine Action:** Route to `Teacher Mode`. Use visual blocks, analogies, and comparison tables.

### 4. The "Curiosity" Intent
- **Trigger:** "What if I did this instead?", "How does Google do this?", "Can I use X with Y?".
- **Real Goal:** The student is exploring beyond the curriculum.
- **Engine Action:** Route to `Mentor Mode`. Encourage the exploration, provide industry context, and suggest a safe experiment they can run in the sandbox.

### 5. The "Validation" Intent
- **Trigger:** "Is this right?", "Did I do this the best way?".
- **Real Goal:** The student wants code review and confidence building.
- **Engine Action:** Route to `Interviewer Mode` or `Senior Engineer Mode`. Praise the working parts, then suggest one refactoring challenge for optimization.

## The Pre-Processing Flow
1. User submits input.
2. Fast LLM pass (or heuristic rules engine) evaluates: `[Input + Hesitation Score + Recent Errors] -> Intent_ID`.
3. Intent_ID is passed to the main Generator to select the Conversation Mode and format the response.
