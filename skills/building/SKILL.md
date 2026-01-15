---
name: building
description: "Execute implementation plan with agent pool in isolated worktrees. Features run in parallel, agents pick tasks by domain."
---

# /build - Execute Implementation Plan

## Overview

The `/build` skill executes the implementation plan from `/warroom` using an agent pool. Each feature gets an isolated worktree, and domain-specialized agents pick up tasks from a queue.

## Prerequisites

Requires completed `/warroom` session with:
- `docs/office/tasks.yaml` (feature-grouped structure)
- `docs/office/05-implementation-spec.md` (TDD steps)
- `docs/office/session.yaml` with `status: plan_complete`

## Startup

### 1. Session Validation (Agent Organizer)

Check session state:
- If `status != plan_complete`: "Run /warroom first to create implementation plan."
- If tasks.yaml missing: "Missing tasks.yaml. Run /warroom to complete planning."
- If implementation-spec missing: "Missing implementation spec. Run /warroom to complete planning."
- If valid: Continue to configuration

### 2. Resume Check

Check for existing `docs/office/build-state.yaml`:
- If exists with `status: in_progress`: "Found in-progress build. Resume or start fresh?"
- If resuming: Load state, continue from last checkpoint

### 3. User Configuration

Ask user:

**Completion policy:**
- `auto-merge` - Automatically merge feature branch to main
- `pr` - Create pull request, wait for approval
- `checkpoint` - Pause for human review

**Retry limit:** (default: 3)
- How many times to retry failed tasks before escalating

### 4. Initialize State

Create `docs/office/build-state.yaml`:

```yaml
build:
  started_at: "2026-01-13T10:30:00Z"
  status: in_progress
  completion_policy: checkpoint
  retry_limit: 3

features: []  # Populated as features start
```

### 5. Start Dashboard (Required)

**You MUST invoke the `/office:dashboard` skill to start the build dashboard.**

The dashboard provides real-time visibility into build progress. It reads from `build-state.yaml` and `tasks.yaml`.

**Invoke the dashboard skill:**
```
Use the Skill tool: skill: "office:dashboard"
```

The skill will:
1. Find the dashboard server in the plugin cache
2. Set up the Python environment if needed
3. Start the server pointing to `docs/office/`
4. Report the URL (typically http://localhost:5050)

**Do NOT skip this step.** The dashboard is essential for monitoring parallel agent execution.

## Main Loop

### Agent Pool

Available agents and their domains:

| Agent | Domains |
|-------|---------|
| backend-engineer | api, database, models, migrations, server |
| frontend-engineer | ui, components, pages, state, client |
| ui-ux-expert | styling, ux-review, design |
| data-engineer | data-pipeline, analytics, etl |
| automation-developer | tests, ci-cd, scripts, automation |
| devops | infrastructure, deployment, docker |

### Execution Flow

**IMPORTANT - Parallel Execution:**

To run features in parallel, you MUST invoke multiple Task tools in a SINGLE message. Each ready feature (no unmet dependencies) should be started simultaneously.

**Example:** If `user-auth` and `payments` are both ready:
```
[Task tool: Start user-auth feature with backend-engineer]
[Task tool: Start payments feature with backend-engineer]
```
Both agents work in isolated worktrees - no conflicts.

**Rules:**
- Features with `depends_on: []` or all dependencies completed → run in parallel
- Tasks within same feature → run sequentially (shared worktree)
- Same agent type in different features → CAN run in parallel (separate instances)

```
While features remain incomplete:

  1. Find ready features:
     - Status is 'pending'
     - All depends_on features are 'completed'

  2. For each ready feature (in parallel):
     **Invoke one Task tool per ready feature in a SINGLE message.**
     a. Agent Organizer announces: "Starting [N] features in parallel..."
     b. For each: Invoke superpowers:using-git-worktrees skill
     c. Update build-state.yaml: feature status = in_progress
     d. Add feature's tasks to queue

  3. Agents claim tasks from queue:
     - Agent checks queue for tasks matching their domain
     - Claims task, updates queue status
     - Receives: worktree path + implementation spec section

  4. Agent executes task:
     - Follows TDD steps from implementation spec
     - Step 1: Write failing test
     - Step 2: Run test, verify failure
     - Step 3: Write implementation
     - Step 4: Run test, verify pass
     - Step 5: Commit

  4b. Code review (after each task):
     - Update task status to `in_review` in build-state.yaml
     - Invoke superpowers:requesting-code-review
     - If review is clean:
       - Set status to `completed`, review_status to `clean`
     - If review has issues:
       - Invoke office:handling-code-review to process feedback
       - Re-request review (max 3 attempts)
       - After 3 attempts: set status to `completed`, review_status to `has-warnings`
     - Move to next task

  5. On step completion:
     - Update build-state.yaml (step-level)
     - If step 5 done → proceed to code review (step 4b)
     - If code review passes → task complete
     - If all tasks done → feature complete

  6. On step failure:
     - Capture actual vs expected output
     - Retry with error context
     - If attempts >= retry_limit → pause, escalate to user

  7. On feature complete:
     - Apply completion policy:
       - auto-merge: merge to main, delete branch
       - pr: create PR, wait for approval
       - checkpoint: pause for user review
     - Invoke superpowers:finishing-a-development-branch skill
     - Check if blocked features can now start
```

### Agent Instructions Template

When dispatching a task to an agent:

```markdown
## Task Assignment

**Task:** [task-id] - [task-title]
**Feature:** [feature-name]
**Worktree:** [worktree-path]

**Instructions:**
1. Change to worktree directory
2. Read implementation spec: docs/office/05-implementation-spec.md#[task-id]
3. Follow steps 1-5 EXACTLY as written
4. Verify each step's expected output before proceeding
5. Report completion or failure with details

**Current step:** [N] ([step-description])

Do not improvise. Do not add extras. Follow the spec.
```

## Failure Handling

### Retry Strategy

```yaml
On failure:
  attempt: N of M

  If N < M:
    - Capture error output
    - Provide error context to agent
    - Agent retries with context

  If N >= M:
    - Pause build
    - Notify user with:
      - Task and step that failed
      - All retry attempts and errors
      - Relevant file contents
      - Suggestion for resolution
    - Wait for user guidance:
      - "Skip this task"
      - "Mark as resolved, continue"
      - "Abort build"
```

### Error Context Template

```markdown
## Retry Context

**Task:** [task-id] - [task-title]
**Step:** [N] - [step-description]
**Attempt:** [M] of [limit]

**Expected:**
[expected output from spec]

**Actual:**
[actual output from run]

**Previous attempts:**
1. [error message 1]
2. [error message 2]

**Suggestion:** [based on error pattern]
```

## Completion

### Summary

When all features complete:

```markdown
## Build Complete!

**Duration:** [time]
**Features:** [N] completed

| Feature | Tasks | Retries | Time |
|---------|-------|---------|------|
| user-auth | 5/5 | 1 | 45m |
| dashboard | 3/3 | 0 | 30m |

**Next steps:**
- Review merged code
- Run full test suite
- Deploy to staging
```

### Stop Dashboard

Stop the dashboard server:

```bash
pkill -f "server.py.*office" 2>/dev/null && echo "Dashboard stopped." || echo "Dashboard was not running."
```

### State Update

Update `docs/office/session.yaml`:
```yaml
status: build_complete
build:
  completed_at: "2026-01-13T14:30:00Z"
  features_completed: 5
  tasks_completed: 23
  total_retries: 3
```

## Session State

### build-state.yaml Structure

```yaml
build:
  started_at: "2026-01-13T10:30:00Z"
  status: in_progress
  completion_policy: checkpoint
  retry_limit: 3

features:
  - id: user-auth
    status: completed
    branch: feature/user-auth
    worktree: /path/to/.worktrees/user-auth
    started_at: "2026-01-13T10:30:00Z"
    completed_at: "2026-01-13T11:45:00Z"
    merged_at: "2026-01-13T11:50:00Z"
    tasks:
      - id: auth-1
        status: completed
        agent: backend-engineer
        attempts: 1
        current_step: 5
        review_attempts: 1
        review_status: clean
        steps:
          - step: 1
            status: completed
          - step: 2
            status: completed
          - step: 3
            status: completed
          - step: 4
            status: completed
          - step: 5
            status: completed

  - id: dashboard
    status: in_progress
    branch: feature/dashboard
    worktree: /path/to/.worktrees/dashboard
    started_at: "2026-01-13T11:51:00Z"
    tasks:
      - id: dash-1
        status: in_progress
        agent: frontend-engineer
        attempts: 1
        current_step: 3
        steps:
          - step: 1
            status: completed
          - step: 2
            status: completed
          - step: 3
            status: in_progress
          - step: 4
            status: pending
          - step: 5
            status: pending

      - id: dash-2
        status: in_review
        agent: frontend-engineer
        attempts: 1
        current_step: 5
        review_attempts: 2
        steps:
          - step: 1
            status: completed
          - step: 2
            status: completed
          - step: 3
            status: completed
          - step: 4
            status: completed
          - step: 5
            status: completed

      - id: dash-3
        status: completed
        agent: frontend-engineer
        attempts: 1
        current_step: 5
        review_attempts: 3
        review_status: has-warnings
```

## Files Created/Modified

```
docs/
  office/
    build-state.yaml (created)
    session.yaml (updated)
```
