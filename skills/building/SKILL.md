---
name: building
description: "Execute implementation plan with autonomous subagent pipeline. Two-stage review (spec + quality). Flags only for critical blockers."
---

# /build - Execute Implementation Plan

## Overview

Autonomous execution of the implementation plan from `/warroom`. Each task runs through a 4-subagent pipeline: Implementer → Clarifier (if needed) → Spec-Reviewer → Code-Reviewer.

**Key principles:**
- Features run in **parallel** (background tasks, isolated worktrees)
- Tasks run **sequentially** within a feature
- Each subagent is **fresh** (no inherited context)
- **No man-in-loop** unless critical blocker (flag)

## Prerequisites

Requires completed `/warroom` session with:
- `docs/office/tasks.yaml` - Feature-grouped task structure
- `docs/office/05-implementation-spec.md` - TDD steps per task
- `docs/office/session.yaml` with `status: plan_complete`

## Startup

### 1. Validate Session

```yaml
Check:
  - session.yaml exists with status: plan_complete
  - tasks.yaml exists
  - 05-implementation-spec.md exists

If any missing:
  "Run /warroom first to create implementation plan."
```

### 2. Check for Resume

```yaml
If docs/office/build-state.yaml exists:
  If status: in_progress
    Ask: "Found in-progress build. Resume or start fresh?"
    If resume: Load state, skip completed tasks
    If fresh: Delete build-state.yaml, start over
```

### 3. Configure Build

Ask user (use AskUserQuestion tool):

**Completion policy:**
- `auto-merge` - Merge to main automatically
- `pr` - Create pull request for review
- `checkpoint` - Pause for human review (default)

**Model preset:**
- `default` - Sonnet/Opus/Haiku/Sonnet (recommended)
- `fast` - Sonnet/Sonnet/Haiku/Haiku
- `quality` - Opus/Opus/Sonnet/Sonnet

**Max parallel features:** (default: 3)

**Retry limit:** (default: 3)

### 4. Initialize State

Create `docs/office/build-state.yaml`:

```yaml
build:
  started_at: "[timestamp]"
  status: in_progress

  config:
    completion_policy: [selected]
    retry_limit: [selected]
    max_parallel_features: [selected]
    models:
      implementer: [from preset]
      clarifier: [from preset]
      spec_reviewer: [from preset]
      code_reviewer: [from preset]

features: []
flags: []
```

### 5. Start Dashboard

**REQUIRED:** Invoke `/office:dashboard` skill to start build dashboard.

```
Use the Skill tool: skill: "office:dashboard"
```
