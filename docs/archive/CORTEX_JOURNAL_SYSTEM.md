# Cortex Journal System

## Purpose

The Cortex Journal shows the student their growth over time. It converts sessions into a living record of skills practiced, mistakes recovered, insights gained, and next steps.

Growth creates motivation.

## Journal Entry Triggers

Create journal entries:

- At session end.
- After mission completion.
- After failure recovery.
- After meaningful reflection.
- After a skill graph update.

## Session Entry Structure

Every session generates:

- Session summary.
- Skills practiced.
- New insights.
- Mistakes made.
- Improvements.
- Recommended next step.

## Entry Schema

```typescript
interface CortexJournalEntry {
  id: string;
  userId: string;
  sessionId: string;
  createdAt: string;
  summary: string;
  skillsPracticed: string[];
  insights: string[];
  mistakes: Array<{
    mistakeId: string;
    recovered: boolean;
    lesson: string;
  }>;
  improvements: string[];
  nextStep: {
    type: 'mission' | 'review' | 'scenario' | 'reflection';
    label: string;
    reason: string;
  };
}
```

## Journal Tone

The journal should feel like a thoughtful mentor's field notes.

Good:

```text
Today you became more reliable at reading Git state before acting. You still confuse staging and committing under pressure, so the next mission will practice status-driven decisions.
```

Bad:

```text
Great job. You earned 200 points.
```

## Student View

The student should be able to review:

- This week I practiced.
- Mistakes I now recover from.
- Concepts I am forgetting.
- Missions I solved independently.
- What SARA recommends next.

## Mentor Use

SARA uses the journal to:

- Reference prior wins.
- Avoid repeating generic advice.
- Notice long-term patterns.
- Recommend next missions.
- Prepare monthly growth summaries.

## Long-Term Dossier

After 500 hours, the journal should produce a mastery dossier:

- Skills demonstrated.
- Representative missions.
- Failure recoveries.
- Strongest areas.
- Remaining weak areas.
- Recommended professional next steps.

This becomes the student's evidence of transformation.
