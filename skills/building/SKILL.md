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

## Main Loop

```
While features remain incomplete:

  1. Find ready features:
     - Status is 'pending'
     - All depends_on features are 'completed'

  2. Dispatch ready features in parallel:
     - Create worktree (superpowers:using-git-worktrees)
     - Start feature-executor as background task
     - Update build-state.yaml: feature status = in_progress

  3. Monitor background tasks:
     - Poll for completion or flags
     - On flag: Handle flag (see Flag Handling)
     - On completion: Check newly unblocked features

  4. Repeat until all features completed or aborted
```

### Dispatching Features

**IMPORTANT:** To run features in parallel, invoke multiple Task tools in a SINGLE message.

```yaml
For each ready feature:
  Task tool:
    subagent_type: general-purpose
    run_in_background: true
    model: sonnet
    description: "Execute feature: [feature-id]"
    prompt: |
      Execute feature [feature-id] in worktree [worktree-path].

      Tasks to complete (in order):
      [list of task-ids from tasks.yaml]

      For EACH task, follow this pipeline:

      1. IMPLEMENTER
         Use prompt template: ./prompts/implementer.md
         Model: [config.models.implementer]

         Dispatch subagent, wait for response:
         - DONE → proceed to step 3
         - NEED_CLARIFICATION → proceed to step 2
         - ERROR → retry up to [retry_limit], then FLAG

      2. CLARIFIER (only if NEED_CLARIFICATION)
         Use prompt template: ./prompts/clarifier.md
         Model: [config.models.clarifier]

         Dispatch subagent, wait for response:
         - ANSWERED → re-dispatch implementer with answer
         - FLAG → exit with flag (clarifier_blocked)

      3. SPEC-REVIEWER
         Use prompt template: ./prompts/spec-reviewer.md
         Model: [config.models.spec_reviewer]

         Dispatch subagent, wait for response:
         - COMPLIANT → proceed to step 4
         - ISSUES → re-dispatch implementer to fix
           - Max 3 loops
           - If exhausted → FLAG (spec_review_exhausted)

      4. CODE-REVIEWER
         Use prompt template: ./prompts/code-reviewer.md
         Model: [config.models.code_reviewer]

         Dispatch subagent, wait for response:
         - APPROVED → task complete, next task
         - ISSUES → re-dispatch implementer to fix
           - Max 3 loops
           - If exhausted → FLAG (code_review_exhausted, WARNING)

      After each task: Update build-state.yaml

      On FLAG: Exit with flag details
      On all tasks complete: Exit with success
```