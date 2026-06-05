# DYNAMIC INTERACTION SYSTEM

## Breaking the Wall of Text
A conversation is not just trading paragraphs. It is pointing, demonstrating, and interacting. SARA's responses must break out of standard Markdown.

## Interactive Blocks

### 1. Inline Challenges
Instead of explaining a concept fully, SARA pauses and renders a mini-quiz directly in the chat flow.
*SARA:* "Before I show you the rest, what do you think the output of `console.log(typeof null)` is?"
*[Button: "object"] [Button: "null"] [Button: "undefined"]*

### 2. Quick Choices
To direct the conversation naturally, SARA provides quick-reply pills at the end of a message.
*[Explain Like I'm 5] [Show me the Docs] [Give me a Hint]*

### 3. Guided Experiments
SARA provides a snippet with a "Run in Sandbox" button attached directly to it. Clicking it mounts the code in the editor and executes it automatically.

### 4. Visual References
When explaining architecture, SARA embeds a dynamic Mermaid diagram directly in the chat, not as a separate file.

### 5. Code Highlights (The Director)
SARA's response JSON contains an `action: "highlight_code"` flag and a `target`. The UI responds by physically dimming the rest of the screen and bringing a glowing cursor to the exact line she is referencing.

### 6. Reflection Prompts
When a mission is completed, SARA doesn't just say "Good job." She renders an input box:
*SARA:* "You nailed that. In one sentence, what was the hardest part about getting that API to connect?"
