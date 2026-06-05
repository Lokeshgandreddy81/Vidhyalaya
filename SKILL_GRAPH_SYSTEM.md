# Skill Graph System

## Purpose

The Skill Graph System replaces shallow completion metrics with an evidence-based model of mastery.

Completion asks:

```text
Did the student finish?
```

The skill graph asks:

```text
Can the student do the work again, in a new context, with less help?
```

## Skill Domains

Initial Cortex skill graph domains:

- Git.
- Linux.
- JavaScript.
- React.
- Python.
- AI.
- Problem solving.
- Debugging.
- System thinking.

## Skill Node Fields

Each skill contains:

- Progress: evidence of exposure and practice.
- Confidence: student's self-assessment.
- Retention: likelihood the skill remains retrievable.
- Mastery: demonstrated independent ability.
- Practice count: meaningful attempts, not clicks.
- Transfer count: successful use in a different context.
- Help trend: whether the student needs less help over time.

## Mastery Levels

Avoid learner-facing levels. Internally, use mastery states:

- `unseen`: no evidence.
- `introduced`: seen in guided context.
- `practiced`: completed with help.
- `reliable`: completed with minimal help.
- `transferable`: completed in a novel scenario.
- `mentor_ready`: can explain and help another learner.

## Domain Breakdown

### Git

Nodes:

- repository initialization
- status reading
- staging
- commits
- branching
- merging
- conflict resolution
- history inspection
- recovery

### Linux

Nodes:

- navigation
- file inspection
- file creation
- search
- piping and redirection
- permissions
- process awareness

### JavaScript

Nodes:

- variables and types
- functions
- arrays and objects
- async programming
- errors and exceptions
- modules
- DOM interactions

### React

Nodes:

- component mental model
- props
- state
- effects
- rendering lifecycle
- data flow
- form handling
- debugging UI state

### Python

Nodes:

- syntax basics
- data structures
- functions
- files
- package usage
- scripts
- debugging tracebacks

### AI

Nodes:

- prompt clarity
- context grounding
- evaluation
- tool use
- hallucination detection
- AI-assisted debugging

### Problem Solving

Nodes:

- problem decomposition
- hypothesis generation
- tradeoff comparison
- test design
- incremental execution

### Debugging

Nodes:

- reproducing issue
- reading errors
- isolating variables
- inspecting state
- validating fix
- preventing regression

### System Thinking

Nodes:

- data flow
- client-server boundaries
- state persistence
- dependency mapping
- failure modes
- observability

## Evidence Types

The graph should update from:

- Completed mission steps.
- Terminal commands.
- Code edits.
- Browser output changes.
- Quiz answers.
- Reflections.
- SARA conversations.
- Failure recovery.

## Skill Graph UX

The student should see a calm mastery map:

- Strong areas.
- Needs practice.
- At risk of forgetting.
- Ready for challenge.

Avoid:

- XP.
- Public ranking.
- Decorative progress bars.
- Completion theater.

## Mentor Use

SARA should use the graph to decide:

- Whether to explain or ask a question.
- Which hint level to use.
- Which mission to recommend.
- Whether to insert review.
- When to increase ambiguity.
