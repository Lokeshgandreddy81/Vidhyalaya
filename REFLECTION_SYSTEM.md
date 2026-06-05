# Reflection System

## Purpose

The Reflection System turns activity into learning. Without reflection, a student may complete tasks without changing their mental model.

Reflection creates retention.

## Reflection Moments

Reflection should happen:

- After every mission.
- After repeated failure recovery.
- At session end.
- Before moving into a harder scenario.
- When confidence and performance disagree.

## Mission Reflection Output

Every completed mission generates:

- What was learned.
- What remains weak.
- What improved.
- Suggested next mission.
- Confidence assessment.

## Reflection Schema

```typescript
interface MissionReflection {
  missionId: string;
  completedAt: string;
  learned: string[];
  weakConcepts: string[];
  improvedSkills: string[];
  mistakesRecovered: string[];
  confidenceBefore?: number;
  confidenceAfter?: number;
  observedIndependence: 'none' | 'hint' | 'guided' | 'direct';
  recommendedNextMissionId?: string;
}
```

## Reflection Prompts

### Beginner

- What did you do in your own words?
- What command or concept felt confusing?
- What would you try first next time?

### Intermediate

- What was your first hypothesis?
- What evidence confirmed or rejected it?
- What mistake would you recognize faster next time?

### Advanced

- What tradeoff did you make?
- How would this fail in production?
- What test or guard would prevent regression?

## Mentor Reflection Style

SARA should be concise and concrete:

```text
You learned that staging is the step where Git marks changes for the next snapshot. You still hesitated between git add and git commit, so the next mission should practice reading git status before acting.
```

## Student Reflection Quality

Reflections should be scored internally:

- `thin`: copied or vague.
- `accurate`: correct but surface-level.
- `connected`: links action to concept.
- `transferable`: explains how to apply in a new context.

This score adapts future coaching. It should not be shown as a game score.

## Journal Integration

Reflections become entries in the Cortex Journal and evidence in the Skill Graph.

## Anti-Patterns

Avoid:

- Long generic summaries.
- Praise without evidence.
- Asking too many questions after every small action.
- Turning reflection into homework.

Reflection should feel like a mentor helping the student see growth clearly.
