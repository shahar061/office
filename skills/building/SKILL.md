---
name: building
description: "Execute implementation plan with autonomous subagent pipeline. Two-stage review (spec + quality). Flags only for critical blockers."
---

# /build - Execute Implementation Plan

## Overview

Autonomous execution of the implementation plan from `/warroom`. Each task runs through a 4-subagent pipeline: Implementer → Clarifier (if needed) → Spec-Reviewer → Code-Reviewer.

**Key principles:**
- Features run in **parallel** (background tasks, isolated worktrees)
- Tasks run **sequentially** within a phase
- Each subagent is **fresh** (no inherited context)
- **No man-in-loop** unless critical blocker (flag)

## Prerequisites

Requires completed `/warroom` session with:
- `docs/office/tasks.yaml` - Feature-grouped task structure
- `spec/phase_*/spec.md` - TDD implementation specs (one per phase)
- `docs/office/session.yaml` with `status: plan_complete`

## Startup

### 1. Validate Session

```yaml
Check:
  - session.yaml exists with status: plan_complete
  - tasks.yaml exists
  - spec/phase_*/spec.md exists (at least one)

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

**Max parallel phases:** (default: 3)

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
    max_parallel_phases: [selected]
    models:
      implementer: [from preset]
      clarifier: [from preset]
      spec_reviewer: [from preset]
      code_reviewer: [from preset]

phases: []
flags: []
```

### 5. Start Dashboard

**REQUIRED:** Invoke `/office:dashboard` skill to start build dashboard.

```
Use the Skill tool: skill: "office:dashboard"
```

## Main Loop

```
While phases remain incomplete:

  1. Find ready phases:
     - Status is 'pending'
     - All depends_on phases are 'completed'

  2. Dispatch ready phases in parallel:
     - Create worktree (superpowers:using-git-worktrees)
     - Start phase-executor as background task
     - Update build-state.yaml: phase status = in_progress

  3. Monitor background tasks:
     - Poll for completion or flags
     - On flag: Handle flag (see Flag Handling)
     - On completion: Check newly unblocked phases

  4. Repeat until all phases completed or aborted
```

### Dispatching Phases

**IMPORTANT:** To run phases in parallel, invoke multiple Task tools in a SINGLE message.

```yaml
For each ready phase:
  Task tool:
    subagent_type: general-purpose
    run_in_background: true
    model: sonnet
    description: "Execute phase: [phase-id]"
    prompt: |
      Execute phase [phase-id] in worktree [worktree-path].

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

## Flag Handling

Flags are the **only** time human intervention is needed.

### Flag Types

| Type | Trigger | Severity |
|------|---------|----------|
| `clarifier_blocked` | Clarifier can't answer from codebase | BLOCKING |
| `spec_review_exhausted` | 3 attempts, still not compliant | BLOCKING |
| `code_review_exhausted` | 3 attempts, still has issues | WARNING |
| `implementation_error` | Unrecoverable error | BLOCKING |
| `security_concern` | Potential vulnerability | BLOCKING |

### On Flag Received

```yaml
1. Update build-state.yaml:
   - Task status: flagged
   - Add to flags array

2. Present to user:
   🚩 FLAG: [type]

   Task: [task-id] - [task-title]
   Phase: [phase-id]

   [Context from flag payload]

   Options:
   [1] Provide guidance
   [2] Skip task
   [3] Accept as-is
   [4] Abort phase

3. On user choice:
   - Guidance: Resume phase with user's input
   - Skip: Mark task skipped, continue to next
   - Accept: Mark task completed with warnings
   - Abort: Mark phase aborted, continue others
```

### Severity Behavior

| Severity | Feature | Other Features |
|----------|---------|----------------|
| BLOCKING | Paused until resolved | Continue |
| WARNING | Continues (task has warnings) | Unaffected |

## Completion

### On Phase Complete

```yaml
Apply completion policy:
  auto-merge:
    - Merge phase branch to main
    - Delete worktree
  pr:
    - Create pull request
    - Keep worktree until merged
  checkpoint:
    - Pause for user review
    - Ask: "Feature [id] complete. Review and continue?"

Invoke: superpowers:finishing-a-development-branch
Check: Any blocked phases now unblocked?
```

### On All Features Complete

```markdown
## Build Complete!

**Duration:** [time]
**Features:** [N] completed, [M] skipped

| Feature | Tasks | Flags | Status |
|---------|-------|-------|--------|
| [id] | [N/M] | [count] | [status] |

**Next steps:**
- Review merged code
- Run full test suite
- Deploy to staging
```

### Cleanup

```bash
# Stop dashboard
pkill -f "server.py.*office" 2>/dev/null

# Update session.yaml
status: build_complete
```

## Files

**Skill files:**
- `SKILL.md` - This orchestrator
- `prompts/implementer.md` - Implementer subagent template
- `prompts/clarifier.md` - Clarifier subagent template
- `prompts/spec-reviewer.md` - Spec reviewer subagent template
- `prompts/code-reviewer.md` - Code reviewer subagent template

**Runtime files:**
- `docs/office/build-state.yaml` - Build progress state
- `docs/office/session.yaml` - Updated on completion