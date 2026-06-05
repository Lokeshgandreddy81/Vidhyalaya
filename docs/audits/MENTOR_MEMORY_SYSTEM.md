# MENTOR MEMORY SYSTEM

## The Memory Vector
A mentor remembers. An AI chatbot forgets as soon as the context window clears. SARA will maintain a persistent memory vector for the student, spanning across modules and days.

## What Does SARA Remember?

### 1. Strengths
"I know you're great at CSS layouts, so I'll let you handle the styling here while we focus on the React state."

### 2. Weaknesses
"You struggled with the difference between `map` and `forEach` yesterday. Let's make sure we use the right one here."

### 3. Common Mistakes
"Watch out—you usually forget to add the dependency array in your `useEffects`."

### 4. Learning Style
If the student consistently asks for "Explain like I'm 5" or "Show me a diagram", SARA will automatically default to visual analogies in future modules without being asked.

### 5. Confidence Levels
The Hesitation Score is averaged over time. If a student is consistently hesitant, SARA becomes more proactive. If the student is flying through missions, SARA steps back and only intervenes when explicitly called.

## The Technical Implementation (Rolling State)
Instead of a complex, expensive Vector DB, Cortex will use a rolling JSON state object stored in MongoDB, synchronized to `Store.tsx`.

```json
{
  "student_id": "123",
  "mastered_concepts": ["html_semantics", "flexbox", "props"],
  "struggling_concepts": ["useEffect_lifecycle", "promises"],
  "frequent_errors": ["syntax_missing_comma", "react_unmounted_state_update"],
  "learning_preference": "visual_analogies",
  "average_confidence": 0.82
}
```
This payload is injected directly into the `brainContext` of every single SARA prompt.
