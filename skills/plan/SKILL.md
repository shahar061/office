---
name: plan
description: "Use after /imagine completes to create an executable implementation plan. The War Room agents (Project Manager, Team Lead, DevOps, Agent Organizer) work automatically to produce plan.md and tasks.yaml."
---

# /plan - Create Executable Implementation Plan

## Overview

The `/plan` skill takes the design documents from `/imagine` and produces an executable implementation plan through automated agent collaboration.

## Prerequisites

Requires completed `/imagine` session with:
- `docs/office/01-vision-brief.md`
- `docs/office/02-prd.md`
- `docs/office/03-market-analysis.md`
- `docs/office/04-system-design.md`
- `docs/office/session.yaml` with `status: imagine_complete`

## War Room Process

Unlike `/imagine`, the `/plan` phase is automated. User observes and reviews the final output.

### 1. Session Validation (Agent Organizer)

Check session state:
- If `status != imagine_complete`: "Run /imagine first to create design documents."
- If documents missing: "Missing [document]. Run /imagine to complete design."
- If valid: Announce War Room start

### 2. Project Manager: Define Milestones

Agent Organizer announces: "Project Manager is analyzing documents and defining milestones..."

Project Manager:
- Reviews all four design documents
- Identifies logical implementation phases
- Defines milestone deliverables
- Establishes phase dependencies

### 3. Team Lead: Break Down Tasks

Agent Organizer announces: "Team Lead is breaking down architecture into tasks..."

Team Lead:
- Takes System Design components
- Creates discrete, executable tasks
- Defines task dependencies
- Sets acceptance criteria
- Targets 5-15 minute tasks

### 4. DevOps: Environment Plan

Agent Organizer announces: "DevOps is creating environment setup plan..."

DevOps:
- Defines local dev setup
- Plans CI/CD pipeline
- Specifies infrastructure needs
- Documents deployment strategy

### 5. Agent Organizer: Assign Tasks

Agent Organizer:
- Reviews all tasks
- Assigns each to appropriate agent
- Validates dependency graph
- Produces final tasks.yaml

### 6. Output Generation

Produce two files:

**`plan.md`** (human-readable):
- Phase overview
- Milestones and deliverables
- Task list per phase
- Environment setup instructions
- Risk mitigation

**`tasks.yaml`** (machine-readable):
- Structured task definitions
- Agent assignments
- Dependencies
- Acceptance criteria

### 7. User Review

Agent Organizer presents output:
"Implementation plan complete. Please review plan.md and tasks.yaml.

- [N] phases identified
- [M] tasks created
- Assigned to [agents list]

Want me to adjust anything before we finalize?"

User can request changes. Once approved:
- Update session.yaml: `status: plan_complete`

## Session State

Update `docs/office/session.yaml`:

```yaml
status: "plan_complete"
plan:
  phases: 4
  tasks: 23
  agents_involved:
    - backend_engineer
    - frontend_engineer
    - devops
```

## Files Created

```
docs/
  office/
    plan.md
    tasks.yaml
    session.yaml (updated)
```

## Next Steps

After `/plan` completes, Agent Organizer offers:
"Plan finalized! When you're ready, /build will execute the tasks."

(Note: /build is a future skill)
