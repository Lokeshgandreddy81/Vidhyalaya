# CHAT EXPERIENCE AUDIT

## Current State Analysis
- **Layout:** Standard right-side drawer. Creates a physical separation between the "work" (editor/terminal) and the "help" (chat).
- **Information Density:** High density, but visually monolithic. It looks like a standard messaging app.
- **Message Structure:** Markdown blocks, often too long, requiring scrolling.
- **Cognitive Load:** High. The student has to read paragraphs of text while simultaneously looking back at their code.

## The Disappearing Interface
How can the interface disappear and allow the conversation to become the focus?

### 1. Contextual Pop-overs (The Whisper)
If the student highlights a piece of code and asks for help, SARA's response should not appear in the right-side chat panel. It should appear as an inline, floating pop-over *directly above the code*, like a comment left by a coworker on GitHub.

### 2. Glassmorphism and Depth
The chat panel should not feel like a solid wall. It should use `backdrop-blur` and translucent backgrounds so the IDE feels continuous. The chat floats *over* the workspace, rather than pushing it aside.

### 3. Chunked Streaming
SARA should not dump a 300-word essay instantly. The UI should stream the response in deliberate, readable chunks, pausing slightly for emphasis, mimicking the cadence of human typing and speech.

### 4. Ephemeral Feedback
Not every interaction needs to be saved in the chat history forever. "Great job!" or "Syntax error on line 4" can be ephemeral toast notifications or floating text that fades away, keeping the main chat log clean for deep conceptual discussions.
