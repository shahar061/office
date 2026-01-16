---
name: building
description: "Execute implementation plan with autonomous subagent pipeline. Two-stage review (spec + quality). Flags only for critical blockers."
---

# /build - Execute Implementation Plan

## Overview

Autonomous execution of the implementation plan from `/warroom`. Each task runs through a 4-subagent pipeline: Implementer → Clarifier (if needed) → Spec-Reviewer → Code-Reviewer.

**Key principles:**
- Phases run **sequentially** (invokes `/phase-execution` skill for each)
- Tasks run **in parallel** within a phase (DAG-based, spawned by skill)
- Each task subagent is **fresh** (no inherited context)
- **No man-in-loop** unless critical blocker (flag)

## Prerequisites

Requires completed `/warroom` session with:
- `docs/office/tasks.yaml` - Feature-grouped task structure
- `spec/phase_*/spec.md` - TDD implementation specs (one per phase)
- `docs/office/session.yaml` with `status: plan_complete`

## Startup

### 1. Validate Session

```yaml
Check (use Bash with test/ls, do NOT read file contents):
  - session.yaml exists: grep -q "status: plan_complete" docs/office/session.yaml
  - tasks.yaml exists: test -f docs/office/tasks.yaml
  - spec/phase_*/spec.md exists: ls spec/phase_*/spec.md >/dev/null 2>&1

If any missing:
  "Run /warroom first to create implementation plan."
```

**CRITICAL - Context Conservation:**
- Do NOT read tasks.yaml into orchestrator context
- Do NOT read spec files into orchestrator context
- Only verify files EXIST - subagents will read them

### 2. Check for Resume

```yaml
If docs/office/build/ directory exists:
  # Check for existing phase directories
  phases=$(ls -d docs/office/build/phase-* 2>/dev/null)

  If phases exist:
    Ask: "Found existing build. Resume or start fresh?"
    If resume:
      # Find last completed phase
      for dir in $phases; do
        grep -l "status: completed" "$dir/status.yaml" 2>/dev/null
      done
      # Resume from first incomplete phase
    If fresh:
      rm -rf docs/office/build/
      # Start over
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

**Retry limit:** (default: 3)

### 4. Prime Permissions

**CRITICAL:** Task subagents run in background and auto-deny permission prompts. Prime permissions upfront by running check commands.

**4a. Extract permissions from tasks.yaml:**

```bash
# Get required permissions list
grep -A 50 "^required_permissions:" docs/office/tasks.yaml | grep "^  - " | sed 's/^  - //' | head -20
```

**4b. Fallback if no permissions listed:**

If `required_permissions` section is missing (older tasks.yaml), infer from project:

```bash
[ -f package.json ] && echo "npm"
[ -f Cargo.toml ] && echo "cargo"
[ -f go.mod ] && echo "go"
[ -f requirements.txt ] && echo "pip"
```

**4c. Display to user:**

```
Preparing build permissions...

Required commands for this build:
  - npm
  - git

Requesting permissions now. Please approve each prompt.
```

**4d. Run permission check commands:**

For each permission, run the corresponding check command:

| Permission | Check Command |
|------------|---------------|
| npm | `npm --version` |
| npx | `npx --version` |
| yarn | `yarn --version` |
| pnpm | `pnpm --version` |
| git | `git --version` |
| node | `node --version` |
| cargo | `cargo --version` |
| go | `go version` |
| python | `python --version` |
| pip | `pip --version` |
| pytest | `pytest --version` |
| make | `make --version` |
| tsc | `npx tsc --version` |
| jest | `npx jest --version` |
| vitest | `npx vitest --version` |

Run each check command. User will see permission prompts and approve them.

**4e. Confirm and proceed:**

After all check commands complete:

```
All permissions granted. Starting build...
```

**4f. Error handling:**

If a check command fails (command not found), warn but continue:

```
Warning: 'cargo' not found. Tasks requiring Rust may fail.
Continue anyway? [Y/n]
```

If user denies a permission prompt, that command won't work for background agents. Warn and ask whether to continue.

### 5. Initialize Build Directory

Create the build output structure:

```
docs/office/build/
└── config.yaml       # Build configuration
```

**Extract phase list from tasks.yaml without reading full file:**
```bash
# Get phase IDs and names only
grep -E "^- id:|^  name:" docs/office/tasks.yaml | paste - - | \
  sed 's/- id: //; s/  name: /|/'
```

**Create config.yaml with build settings:**
```yaml
completion_policy: [checkpoint|auto-merge|pr]
models:
  implementer: sonnet
  clarifier: opus
  spec_reviewer: haiku
  code_reviewer: sonnet
retry_limit: 3
started_at: [ISO timestamp]
```

**Note:** Each phase executor will create its own `docs/office/build/phase-{id}/` directory with `status.yaml` and `progress.log`. The orchestrator does NOT create per-phase directories.

### 6. Start Dashboard

**REQUIRED:** Invoke `/office:dashboard` skill to start build dashboard.

```
Use the Skill tool: skill: "office:dashboard"
```

## Main Loop (Sequential Phases)

**Key principle:** Phases run sequentially by invoking `/phase-execution` skill. Tasks within each phase run in parallel (skill spawns background subagents).

```
For each phase in order:

  1. Announce phase start:
     - "Starting phase: {phase-id} - {phase-name}"

  2. Invoke /phase-execution skill:
     - Use Skill tool: skill: "office:phase-execution"
     - The skill handles DAG execution, task parallelism, status updates
     - Skill runs in FOREGROUND (main context) - blocks until phase completes

  3. On skill return, check result:
     - PHASE_COMPLETE: Apply completion policy
     - FLAG: Handle flag (see Flag Handling section)

  4. Apply completion policy:
     - checkpoint: Ask user to review, wait for approval
     - auto-merge: Merge phase branch to main automatically
     - pr: Create pull request for the phase branch

  5. Continue to next phase
```

**Why sequential phases:** Skills run in main context (foreground). Only one skill can run at a time. Tasks within a phase provide parallelism via background subagents.

**Why this works:** The `/phase-execution` skill runs in the main conversation context, so it CAN spawn background subagents for parallel task execution. Background subagents cannot spawn nested subagents, but they don't need to - each task subagent executes the full 4-stage pipeline inline.

## State Management

**Key principle:** Each phase executor OWNS its status file. No race conditions, no shared state.

### Directory Structure

```
docs/office/build/
├── config.yaml           # Build config (created by orchestrator)
└── phase-{id}/           # Created by phase executor
    ├── status.yaml       # Phase executor OWNS this file
    └── progress.log      # Append-only event log
```

### status.yaml format (per-phase)

```yaml
phase: phase-1
status: in_progress  # pending | in_progress | completed | failed
started_at: "2026-01-16T10:30:00Z"
tasks:
  setup-001: completed
  setup-002: in_progress
  setup-003: in_progress  # parallel with 002 (different dependency chain)
  setup-004: blocked      # waiting on 002, 003
```

### progress.log format (append-only)

```
2026-01-16T10:30:00 PHASE_START
2026-01-16T10:30:01 TASK_START:setup-001
2026-01-16T10:31:30 TASK_DONE:setup-001
2026-01-16T10:31:31 TASK_START:setup-002
2026-01-16T10:31:31 TASK_START:setup-003
2026-01-16T10:32:45 CODE_REVIEW:setup-002
2026-01-16T10:33:00 TASK_DONE:setup-002
```

**Benefits:**
- No race conditions (each phase has its own file)
- Dashboard watches `build/` directory for all updates
- Orchestrator stays lean (no state file reads)

## Invoking Phase Execution

Use the Skill tool to invoke `/phase-execution`:

```yaml
Skill tool:
  skill: "office:phase-execution"
```

Before invoking, set context for the skill (it reads from conversation):
- Current phase ID
- Project path (absolute)
- Model configuration from config.yaml
- Retry limit

The skill will:
1. Read tasks.yaml to get this phase's tasks and dependencies
2. Initialize status.yaml and progress.log
3. Spawn task subagents in parallel based on DAG
4. Wait for tasks to complete, spawn newly-ready tasks
5. Return PHASE_COMPLETE or FLAG

**Example conversation flow:**

```
Orchestrator: "Executing phase-1: Project Foundation"
Orchestrator: "Phase ID: phase-1"
Orchestrator: "Project: /Users/dev/my-project"
Orchestrator: "Models: sonnet/opus/haiku/sonnet, Retry: 3"
[Invokes Skill: office:phase-execution]

... skill runs, spawns parallel tasks ...

Skill returns: "PHASE_COMPLETE: phase-1"
Orchestrator: Applies completion policy, moves to phase-2
```

## Skill Completion

The `/phase-execution` skill runs in the **foreground** (main context). When it returns:

| Output | Meaning | Action |
|--------|---------|--------|
| `PHASE_COMPLETE: [id]` | Phase finished | Apply completion policy |
| `FLAG: [type] \| [task] \| [desc]` | Needs human input | Handle flag |

**Dashboard integration:** The skill updates `status.yaml` and `progress.log` as tasks complete. Dashboard watches these files for real-time progress display.

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
1. Read flag details from TaskOutput result

2. Present to user:
   FLAG: [type]

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

# Update session.yaml (use state-updater or direct grep+sed)
sed -i '' 's/status: .*/status: build_complete/' docs/office/session.yaml
```

## Context Budget Guidelines

| Item | Approach | Context Cost |
|------|----------|--------------|
| tasks.yaml | Read once per phase by skill | ~500-1k (per phase) |
| spec files | Read by task subagents | ~0 (in main) |
| State updates | Skill owns status files | ~50 per update |
| /build skill | Loaded once | ~5k |
| /phase-execution skill | Loaded per phase | ~3k (per phase) |
| Task subagent results | Brief completion messages | ~100 per task |

**Total per phase: ~5-8k context**

**Why this works:**
- Each task subagent gets **fresh context** (no accumulation)
- Skill reads tasks.yaml once, stores dependency graph in memory
- Heavy implementation work happens in isolated subagents

## Files

**Skills:**
- `skills/building/SKILL.md` - This orchestrator
- `skills/phase-execution/SKILL.md` - Phase executor (DAG + task parallelism)

**Runtime files:**
- `docs/office/build/config.yaml` - Build configuration
- `docs/office/build/phase-{id}/status.yaml` - Per-phase status (owned by phase-execution skill)
- `docs/office/build/phase-{id}/progress.log` - Per-phase event log
- `docs/office/session.yaml` - Updated on completion
