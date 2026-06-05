# Cortex Product Learning Map

## Purpose

This document defines what Cortex is today, what it must become, and what learning problems it exists to solve. It is the Phase 0 product audit for the Cortex Learning Operating System.

The product standard is simple:

> A student should not leave Cortex saying "I completed lessons."
> A student should leave Cortex saying "I became a developer."

## What Cortex Is Today

Cortex is an AI-native learning workspace with several strong but partially separate surfaces:

- Dashboard and path creation: helps a learner express a goal and generate a structured roadmap.
- Study session: combines generated content, SARA chat, quiz panels, notes, smartboard media, neural maps, whiteboard, vault, code sandbox, and terminal.
- Terminal coach: a simulated learning shell with virtual filesystem, virtual Git, command explanations, mistake detection, missions, scenarios, and a HUD.
- Notes workspace: a markdown study notebook with SARA editing and expansion tools.
- Smartboard and neural map: visual learning surfaces for media grounding and concept relationships.
- Store and persistence: central app state in `Store.tsx`, optimistic path updates through the API, and local coach memory for terminal skills.

Today, Cortex already has the raw material of a learning operating system. The current risk is fragmentation: the student sees many tools, but the tools do not yet reliably converge into one mentor-led learning loop.

## What Cortex Should Become

Cortex should become a personal AI mentor that runs a complete learning loop:

1. Diagnose what the student knows.
2. Choose a meaningful mission.
3. Put the student in a realistic environment.
4. Watch their attempts.
5. Intervene at the right moment.
6. Turn mistakes into memory.
7. Reflect on growth.
8. Recommend the next mission.

The product should feel less like a course catalog and more like an apprenticeship.

## Learning Problems We Are Solving

### Fragmented Learning

Students jump between videos, docs, editors, terminals, notes, and chat tools. Cortex must integrate these into one guided classroom where every surface knows the current learning objective.

### Passive Completion

Most platforms reward finishing content. Cortex must reward demonstrated ability, internal mastery, and recovery from mistakes. Completion is only evidence when paired with practice.

### Shallow Understanding

Students can follow tutorials without understanding when or why to use a concept. Cortex must teach judgment through scenarios, not only syntax through explanations.

### Forgotten Knowledge

Most platforms forget the student after every lesson. Cortex must remember completed skills, weak concepts, recurring mistakes, confidence levels, and learning velocity.

### Fear of Failure

Students often interpret errors as personal failure. Cortex must make failure normal, safe, diagnostic, and useful.

### Confidence Without Competence

Students may feel productive while copying answers. Cortex must measure whether they can act independently, explain decisions, debug issues, and transfer knowledge to new contexts.

## Current User Journey Audit

### Product Vision

The repo vision is "transform unstructured mess into structured mastery." This is the right direction, but mastery must be operationalized through memory, missions, skill graphs, and reflection.

### Product Mission

The mission should be reframed from "generate learning paths" to "accelerate the student's transformation into a capable practitioner."

### Classroom Experience

The study session is powerful but dense. It should become mission-centered:

- Left or main area: current mission environment.
- Right area: SARA mentor, reflection, and memory.
- Bottom area: terminal or tool surface when relevant.
- Background surfaces: notes, smartboard, neural map, and vault appear when they help the current mission.

### Session Window

The session currently contains many modes. The future session should always answer:

- What am I trying to do?
- Why does it matter?
- What have I tried?
- What did I learn?
- What should I do next?

### Terminal Experience

The terminal is correctly becoming an AI coding coach, not a shell clone. Its role is to create safe practice loops for command-line reasoning, Git workflows, debugging, and environment repair.

### Notes Experience

Notes should become learning evidence, not just text storage. Notes should capture misconceptions corrected, principles learned, commands understood, and reflections after missions.

### Browser Experience

Browser preview should teach cause and effect. It should answer: "How did my code change the user-facing product?" SARA should be able to point at browser elements and connect them to files and concepts.

### AI Experience

SARA currently answers, summarizes, quizzes, and assists. SARA must become a persistent mentor that adapts tone, difficulty, hints, and mission choice based on memory.

### Progress Experience

Progress must move away from XP, levels, and generic bars. The meaningful progress model is:

- Skills demonstrated.
- Concepts retained.
- Mistakes recovered from.
- Missions completed with independence.
- Confidence calibrated against performance.

## Product Principle Stack

1. Learning acceleration beats feature volume.
2. Mastery beats completion.
3. Recovery beats correctness.
4. Mentorship beats chat.
5. Missions beat chapters.
6. Memory beats stateless tutoring.
7. Judgment beats syntax recall.
8. Reflection beats passive summaries.

## North Star

The north star metric is not time spent, modules completed, or messages sent.

The north star is:

> Can the student solve increasingly realistic problems with decreasing help while explaining their reasoning clearly?
