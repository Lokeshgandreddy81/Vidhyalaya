# CORTEX CONVERSATION MASTER PLAN

## Vision
Transform the existing question-answer "chat box" into a **Fluid Conversation Layer**. The goal is not to build a chatbot, but a ubiquitous, intelligent, context-aware mentor that adapts seamlessly to the student's emotional state, learning style, and technical context.

## User Journey
At the end of 500 hours, the student should feel:
> "I learned alongside a mentor who understood my goals, adapted to my learning style, guided me when I was stuck, challenged me when I was comfortable, and helped me become a better engineer."

## Architectures

### 1. Conversation Architecture
Chat is no longer a static window. It is an omnipresent layer that observes, listens, and speaks contextually. It lives where the student is working.

### 2. Intent Architecture
Before answering, the **Intent Engine** pre-processes the input to classify the true goal: Debugging, Conceptual, Emotional Validation, or Curiosity. 

### 3. Context Architecture
SARA receives an omniscient payload on every interaction: Current File, Cursor Position, Terminal Output, and the student's Skill Graph. The student never has to say "I'm looking at line 4".

### 4. Memory Architecture
A rolling JSON memory object tracks Strengths, Weaknesses, Common Mistakes, and Confidence levels across days and modules, injected into every prompt.

### 5. Dynamic Interaction Architecture
Responses break the markdown wall. SARA generates Inline Challenges, Clickable Pills, Quick Experiments, and triggers the `GhostMentorCursor` to physically point at the screen.

### 6. UI Architecture
The messaging app aesthetic is replaced by a translucent, glassmorphic layer. Contextual pop-overs appear near the code. Responses stream smoothly, mimicking human cadence.

## Implementation Roadmap

### Stage 1: Documentation (Complete)
- Discovered and defined the 10 architectural phases.

### Stage 2: The Core Engine (Backend/Logic)
- Implement the Intent Classifier in `geminiService.ts`.
- Expand `StudentBrainState` in `Store.tsx` to include the Mentor Memory vector.
- Build the `ContextAggregator` to capture IDE state (cursor, terminal, active file) on every keystroke/click.

### Stage 3: The Conversation UI (Frontend)
- Redesign the Chat Panel into the "Cortex Interaction Layer" with glassmorphism.
- Implement Interactive Response Blocks (Buttons, Quizzes, Mermaid Diagrams) replacing standard Markdown text.
- Build smooth, fluid transition animations for mode switching (Teacher vs. Debugger vs. Coach).
