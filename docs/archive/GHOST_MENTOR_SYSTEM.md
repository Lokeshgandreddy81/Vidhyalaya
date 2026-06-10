# Ghost Mentor System

## Purpose

The Ghost Mentor System lets SARA teach visually and contextually across code, files, browser preview, terminal, notes, and diagrams.

Students learn faster when the mentor can point, highlight, demonstrate, and visualize instead of only speaking in text.

## Core Principle

Ghost Mentor actions must reduce cognitive load. If a visual action distracts from the current learning objective, do not use it.

## Supported Action Types

### Highlight Code

Purpose:

- Point at the exact line related to a mistake or concept.

Example:

```json
{
  "type": "highlight_code",
  "file": "src/App.tsx",
  "startLine": 42,
  "endLine": 47,
  "reason": "This state update mutates the existing array instead of creating a new one."
}
```

### Highlight File

Purpose:

- Direct the student's attention to the file that matters.

### Highlight Browser Element

Purpose:

- Connect UI behavior to implementation.

### Point At Mistake

Purpose:

- Make an error visible without over-explaining.

### Demonstrate Solution

Purpose:

- Show a short partial demonstration after the student has tried.

### Visualize Concept

Purpose:

- Render mental models such as data flow, async timelines, Git graph, component tree, or request lifecycle.

## Structured Action Contract

SARA interventions should emit structured JSON:

```json
{
  "message": "The button is not updating because this state array is being mutated in place.",
  "actions": [
    {
      "type": "highlight_code",
      "file": "src/cart.tsx",
      "startLine": 18,
      "endLine": 21
    },
    {
      "type": "visualize_concept",
      "diagram": "react_state_identity",
      "focus": "new array reference"
    }
  ],
  "nextPrompt": "What should React receive here: the same array object or a new one?"
}
```

## Action Timing

Use ghost actions when:

- The student asks "where is this?"
- The student repeats the same mistake.
- The concept is spatial or visual.
- The bug spans multiple surfaces.
- Text explanation would create cognitive overload.

Avoid ghost actions when:

- The student is close to solving independently.
- The next step is obvious.
- The visual effect would feel like noise.

## Surfaces

### Editor

- Highlight lines.
- Show diff previews.
- Mark syntax or logic causes.

### Terminal

- Highlight command segment.
- Explain flags.
- Point at error line.

### Browser

- Highlight affected UI element.
- Show before and after.
- Connect element to file.

### Notes

- Insert reflection prompts.
- Link mistake to concept.
- Capture durable principle.

### Neural Map

- Highlight prerequisite concept.
- Show dependency path.
- Mark weak concept for review.

## Product Signature

The signature feeling:

```text
SARA sees what I am seeing, knows what I am trying to do, and points at the exact thing I need to understand.
```
