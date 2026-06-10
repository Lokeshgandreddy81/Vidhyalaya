# Mission Engine

## Purpose

The Mission Engine replaces lessons, chapters, and tutorials with purposeful tasks.

Students remember missions because missions create context, stakes, action, and reflection.

## Mission Philosophy

Bad:

```text
Chapter 5: React State
```

Good:

```text
Mission: Fix a broken shopping cart.
```

A mission teaches by requiring the student to do something meaningful.

## Mission Structure

Every mission contains:

- Story.
- Goal.
- Challenge.
- Success criteria.
- Reflection.
- Mastery check.

## Mission Schema

```typescript
interface Mission {
  id: string;
  title: string;
  story: string;
  goal: string;
  targetSkills: string[];
  prerequisiteSkills: string[];
  estimatedMinutes: number;
  challenge: MissionChallenge;
  successCriteria: SuccessCriterion[];
  reflectionPrompts: string[];
  masteryCheck: MasteryCheck;
}
```

## Mission Types

### Guided Mission

Used for first exposure. Includes clear steps and hints.

### Practice Mission

Used for reinforcement. Fewer hints. More student planning.

### Scenario Mission

Used for realism. Starts from messy state.

### Failure Mission

Used for recovery confidence. The environment is intentionally broken.

### Capstone Mission

Used for transfer. Ambiguous, multi-surface, and less guided.

## Mission Anatomy

### Story

The story gives meaning.

Example:

```text
Your teammate initialized a new project but forgot to create a first commit. Set up version history so the work can be shared safely.
```

### Goal

The goal states the outcome.

```text
Create a Git repository with README.md committed as the first snapshot.
```

### Challenge

The challenge defines what the learner must handle.

```text
Use the terminal to initialize Git, create README.md, stage it, and commit it.
```

### Success Criteria

Success must be verifiable:

- Git initialized.
- README.md exists.
- README.md staged.
- Commit message includes "Initial commit".

### Reflection

Reflection turns action into memory:

- What did Git create when you ran `git init`?
- Why does Git require staging before committing?
- What would happen if you tried to push before committing?

### Mastery Check

The check asks the student to transfer:

```text
Now create a second file, stage only that file, and explain why `git add .` would be different.
```

## Mission Recommendation Logic

SARA recommends missions based on:

- Current goal.
- Weak skills.
- Retention risk.
- Recent mistakes.
- Student confidence.
- Required transfer.

## Mission Completion Rules

A mission is complete only when:

- The environment state matches success criteria.
- The student resolves blocking mistakes.
- The student can answer one reflection prompt.

Completion without reflection is practice, not mastery.

## P0 Mission Set

Initial P0 missions:

- Your First Commit.
- Navigate the Workspace.
- Read and Edit a File.
- Fix a Missing Dependency.
- Resolve a Merge Conflict.
- Repair an API Environment Variable.
