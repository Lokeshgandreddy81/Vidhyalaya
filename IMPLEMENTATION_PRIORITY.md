# Implementation Priority

## Purpose

This document defines the build order for the Cortex Learning Operating System. Do not build everything at once.

## Priority Philosophy

Build the systems that make Cortex a mentor before building systems that make Cortex more visually impressive.

## P0

### Learning Memory

Why:

- Personalization depends on memory.
- SARA cannot mentor deeply without knowing the learner.

Build:

- Cloud-backed learner memory schema.
- Concept memory update events.
- Mistake memory records.
- Help-level tracking.
- Confidence calibration.

### Mission Engine

Why:

- Missions become the core learning unit.
- The terminal coach already proves the pattern.

Build:

- Mission catalog schema.
- Mission start and completion lifecycle.
- Programmatic success criteria.
- Reflection requirement.
- Mission recommendation hook.

### AI Mentor

Why:

- SARA is the product experience.
- All surfaces should route through mentor intent.

Build:

- Mentor mode contract.
- Structured intervention payloads.
- Mistake prompt integration.
- Memory-aware response context.
- No-gamification response guidelines.

## P1

### Ghost Mentor

Build:

- Highlight code actions.
- Highlight terminal errors.
- Browser element pointing.
- Visual concept actions.

### Skill Graph

Build:

- Skill node schema.
- Evidence ingestion.
- Mastery state transitions.
- Student-facing mastery map.

### Reflection System

Build:

- Mission reflection generator.
- Student reflection prompts.
- Reflection quality classifier.
- Memory update hooks.

## P2

### Scenario Engine

Build:

- More isolated scenario templates.
- Scenario restoration safeguards.
- Scenario recommendation logic.

### Failure Engine

Build:

- Failure injection catalog.
- Hypothesis prompts.
- Recovery scoring.

### Journal

Build:

- Session journal entries.
- Weekly summaries.
- 500-hour mastery dossier.

## Execution Rule

Every implementation task must answer:

```text
What learning behavior changes because of this?
```

If the answer is weak, do not build it yet.
