# Learning OS Architecture

## Architecture Premise

Cortex should not be architected around lessons, modules, or screens.

It should be architected around transformation loops.

The Learning OS is the system that turns a student's goal into a living apprenticeship.

## Core Loop

```text
Goal -> Diagnosis -> Mission -> Attempt -> Feedback -> Recovery -> Reflection -> Memory -> Adaptation -> Transfer
```

Every subsystem exists to strengthen that loop.

## System 1: Skill Graph

### Purpose

The Skill Graph models what capabilities the student needs and what evidence exists for each capability.

### Skill Dimensions

Each skill tracks:

- Conceptual understanding.
- Procedural fluency.
- Debugging ability.
- Transfer ability.
- Retention.
- Independence.
- Confidence calibration.

### Example Skill Node

```text
Skill: Git staging
Evidence:
- Initialized repo with no help.
- Staged file after one hint.
- Explained index vs working tree.
- Transfer pending.
Risk:
- Confuses commit with push.
```

### Outcome

The student and SARA both know what is real, what is weak, and what is ready for harder work.

## System 2: Knowledge Graph

### Purpose

The Knowledge Graph maps concepts, prerequisites, dependencies, analogies, and real-world uses.

### What It Connects

- Concepts.
- Mental models.
- Common misconceptions.
- Practice scenarios.
- Tools.
- Files.
- Commands.
- Career contexts.

### Outcome

Cortex can explain not just what to learn next, but why the next concept unlocks future capability.

## System 3: Learning Memory

### Purpose

Learning Memory makes Cortex personal over time.

### Memory Records

- Attempts.
- Mistakes.
- Recovery steps.
- Confidence ratings.
- Reflection summaries.
- Help levels.
- Transfer outcomes.
- Retention checks.

### Memory Use

Memory drives:

- Mission selection.
- Hint depth.
- Review timing.
- Challenge difficulty.
- Mentor tone.
- Career evidence.

### Outcome

Every hour makes Cortex a better mentor.

## System 4: Practice Engine

### Purpose

The Practice Engine creates situations where the student must act.

### Practice Types

- Retrieval checks.
- Prediction prompts.
- Code repair.
- Terminal workflows.
- Concept relationship puzzles.
- Debugging scenarios.
- Deployment failures.
- Architecture tradeoff decisions.
- Teach-back prompts.

### Practice Standard

Practice must reveal capability. If the student can complete it by copying, it is not enough.

## System 5: Reflection Engine

### Purpose

The Reflection Engine converts activity into durable learning.

### Reflection Outputs

- What changed.
- What was misunderstood.
- What evidence was captured.
- What remains weak.
- What should be reviewed.
- What next mission is recommended.

### Outcome

Students see growth and retain it.

## System 6: Mastery Engine

### Purpose

The Mastery Engine determines when a skill is likely durable.

### Mastery Evidence

Mastery requires:

- Successful performance.
- Low help level.
- Correct explanation.
- Delayed retention.
- Transfer to a new context.
- Recovery from a related failure.

### Mastery States

- Introduced.
- Practiced.
- Recovered.
- Retained.
- Transferred.
- Career-ready.

### Outcome

Cortex stops overclaiming and starts proving.

## System 7: Career Engine

### Purpose

The Career Engine converts learning into opportunity.

### Career Evidence

It captures:

- Verified missions.
- Portfolio artifacts.
- Technical explanations.
- Debugging records.
- Tradeoff decisions.
- Skill graph snapshots.
- Readiness gaps.

### Career Outcomes

- Student knows what role they are trending toward.
- Student knows what evidence is missing.
- Student can show proof beyond certificates.
- Student can prepare for interviews from real mistakes.

## System 8: Mentor Orchestrator

### Purpose

The Mentor Orchestrator decides what should happen next.

### Inputs

- Skill graph.
- Knowledge graph.
- Learning memory.
- Current mission.
- Current environment state.
- Student behavior.
- Confidence.
- Time since review.

### Decisions

- Teach.
- Ask.
- Hint.
- Challenge.
- Wait.
- Reflect.
- Escalate.
- Schedule review.
- Generate mission.

## System 9: Evidence Layer

### Purpose

The Evidence Layer records proof of growth.

### Evidence Types

- Command history.
- Code diff.
- Browser outcome.
- Quiz response.
- Explanation.
- Reflection.
- Recovery path.
- Mentor assessment.

### Outcome

Progress becomes trustworthy.

## System 10: Experience Layer

### Purpose

The Experience Layer presents only what the student needs now.

### Surfaces

- Mission environment.
- SARA mentor rail.
- Terminal.
- Editor.
- Browser preview.
- Notes.
- Concept map.
- Vault.
- Journal.

### Rule

The OS should orchestrate surfaces. The student should not manage the OS manually.

## Learning OS Data Flow

```text
Student action
  -> observation
  -> classification
  -> memory update
  -> skill evidence update
  -> mentor decision
  -> next action
  -> reflection
  -> future mission adaptation
```

## Strategic Architecture Outcome

The Learning OS lets Cortex answer:

- What does this student know?
- What can they do?
- What do they misunderstand?
- What should they attempt next?
- What evidence proves growth?
- What career path is becoming realistic?

That is the architecture of transformation.
