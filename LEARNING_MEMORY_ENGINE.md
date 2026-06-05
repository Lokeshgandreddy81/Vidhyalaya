# Learning Memory Engine

## Purpose

The Learning Memory Engine makes Cortex personal. It records what the student has tried, understood, forgotten, avoided, recovered from, and mastered.

Most platforms remember content completion. Cortex must remember the learner.

## Memory Principles

- Memory is evidence-based, not self-reported only.
- Mistakes are learning assets.
- Confidence must be calibrated against performance.
- Retention matters more than recent completion.
- Memory should adapt future missions, hints, reviews, and reflections.

## Core Records

### Completed Skills

Tracks skills demonstrated in real tasks, not just watched or read.

Fields:

- `skillId`
- `evidenceType`
- `missionId`
- `completedAt`
- `helpLevel`
- `reflectionQuality`

### Failed Attempts

Records attempts that did not achieve the goal.

Fields:

- `attemptId`
- `missionId`
- `stepId`
- `input`
- `stateBefore`
- `stateAfter`
- `errorType`
- `resolved`

### Common Mistakes

Tracks repeated misconceptions.

Examples:

- `git_push_before_commit`
- `cd_into_file`
- `async_without_await`
- `state_mutation_in_react`

### Confidence Levels

Confidence should be captured before and after missions:

- Pre-mission confidence.
- Post-mission confidence.
- Observed competence.
- Calibration gap.

### Learning Preferences

Preferences should be inferred carefully:

- Learns well from analogy.
- Prefers direct command examples.
- Needs visual diagrams.
- Benefits from prediction prompts.
- Avoids open-ended tasks.

### Struggling Concepts

Concepts become struggling concepts when:

- Retention drops.
- Repeated mistakes occur.
- Student requests help repeatedly.
- Student cannot explain the concept after completing the task.

### Strength Areas

Strength requires:

- Recent success.
- Low help level.
- Transfer to a new scenario.
- Accurate explanation.

### Learning Velocity

Velocity should measure:

- Time to first meaningful attempt.
- Attempts to success.
- Help level required.
- Retention after delay.
- Transfer success across contexts.

Velocity is not a public scoreboard. It is an internal adaptation signal.

## Memory Model

```typescript
type HelpLevel = 'none' | 'hint' | 'guided' | 'direct';

interface LearnerConceptMemory {
  conceptId: string;
  strengthHours: number;
  lastSuccessfulUseAt?: string;
  lastReviewedAt?: string;
  successCount: number;
  failureCount: number;
  transferCount: number;
  helpLevelTrend: HelpLevel[];
  confidenceBefore?: number;
  confidenceAfter?: number;
}

interface LearnerMistakeMemory {
  mistakeId: string;
  conceptId: string;
  occurrences: number;
  lastSeenAt: string;
  resolvedCount: number;
  representativeAttempts: string[];
}
```

## Retention Logic

Cortex should model memory strength with a forgetting curve:

```text
retention = exp(-hoursSinceSuccess / strengthHours)
```

When retention drops below threshold, Cortex should schedule a review inside a meaningful mission, not as a detached flashcard unless the skill is purely recall-based.

## Adaptation Rules

### If student struggles with Git branching

Future missions should:

- Include branch visualization.
- Ask the student to predict current branch before command execution.
- Introduce branch mistakes in low-risk sandboxes.
- Avoid moving directly into complex merge workflows.

### If student struggles with async JavaScript

Future missions should:

- Use timeline diagrams.
- Require prediction of log order.
- Show browser behavior tied to async state.
- Include debugging of missing `await`.

### If student struggles with state management

Future missions should:

- Ask what owns the state.
- Highlight data flow.
- Include mutation bugs.
- Require the student to explain render cause and effect.

## Memory Use Boundaries

Memory must not shame the student. It should be presented as:

```text
You have seen this pattern before. Let us make it stronger.
```

Never:

```text
You failed this three times.
```

## Storage Strategy

### Local First

The current terminal memory can remain local for fast iteration.

### Cloud Synced

Long-term memory must sync to MongoDB:

- Concept memory.
- Mistake memory.
- Mission summaries.
- Reflection history.
- Skill graph state.

### Privacy

The student should be able to view and delete memory records.
