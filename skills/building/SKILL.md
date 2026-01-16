---
name: building
description: "Execute implementation plan with autonomous subagent pipeline. Two-stage review (spec + quality). Flags only for critical blockers."
---

# /build - Execute Implementation Plan

## Overview

Autonomous execution of the implementation plan from `/warroom`. Each phase gets an isolated worktree for safe parallel execution.

**Key principles:**
- Build branch isolates all work from main
- Each phase gets its own **worktree** (isolated)
- Independent phases run **in parallel** (separate worktrees)
- Tasks run **sequentially** within a phase (safe commits)
- Orchestrator merges phases and resolves conflicts
- Final output is a **PR to main**

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

**Model preset:**
- `default` - Sonnet/Opus/Haiku/Sonnet (recommended)
- `fast` - Sonnet/Sonnet/Haiku/Haiku
- `quality` - Opus/Opus/Sonnet/Sonnet

**Retry limit:** (default: 3)

*Note: Build always creates a PR to main when complete.*

### 4. Create Build Branch

Create an isolated branch for all build work:

```bash
# Generate session ID
session_id=$(date +%Y%m%d-%H%M%S)

# Create and push build branch
git checkout -b build/${session_id}
git push -u origin build/${session_id}

echo "Build branch: build/${session_id}"
```

Store `session_id` for later use (worktree names, PR).

### 5. Prime Permissions

**CRITICAL:** Task subagents run in background and auto-deny permission prompts. Prime permissions upfront by running check commands.

**5a. Extract permissions from tasks.yaml:**

```bash
# Get required permissions list
sed -n '/^required_permissions:/,/^[a-z]/{ /^  - /p }' docs/office/tasks.yaml | sed 's/^  - //' | head -20
```

**5b. Fallback if no permissions listed:**

If `required_permissions` section is missing (older tasks.yaml), infer from project:

```bash
[ -f package.json ] && echo "npm"
[ -f yarn.lock ] && echo "yarn"
[ -f pnpm-lock.yaml ] && echo "pnpm"
[ -f Cargo.toml ] && echo "cargo"
[ -f go.mod ] && echo "go"
[ -f requirements.txt ] && echo "pip" && echo "python"
[ -f pyproject.toml ] && echo "pip" && echo "python"
```

**5c. Display to user:**

```
Preparing build permissions...

Required commands for this build:
  - npm
  - git

Requesting permissions now. Please approve each prompt.
```

**5d. Run permission check commands:**

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

**5e. Confirm and proceed:**

After all check commands complete:

```
All permissions granted. Starting build...
```

**5f. Error handling:**

If a check command fails (command not found), warn but continue:

```
Warning: 'cargo' not found. Tasks requiring Rust may fail.
Continue anyway? [Y/n]
```

If user denies a permission prompt, that command won't work for background agents. Warn and ask whether to continue.

### 6. Initialize Build Directory

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
models:
  implementer: sonnet
  clarifier: opus
  spec_reviewer: haiku
  code_reviewer: sonnet
retry_limit: 3
started_at: [ISO timestamp]
```

**Note:** Each phase executor will create its own `docs/office/build/phase-{id}/` directory with `status.yaml` and `progress.log`. The orchestrator does NOT create per-phase directories.

### 7. Start Dashboard

**REQUIRED:** Invoke `/office:dashboard` skill to start build dashboard.

```
Use the Skill tool: skill: "office:dashboard"
```

### 8. Extract Phase Dependencies

Extract phase-level dependencies from tasks.yaml (without reading full file):

```bash
# Get phase IDs and their depends_on
grep -E "^- id:|^  depends_on:" docs/office/tasks.yaml | paste - - | \
  sed 's/- id: //; s/  depends_on: /|/'
```

Example output:
```
phase-1|[]
phase-2|[phase-1]
phase-3|[phase-1]
phase-4|[phase-2, phase-3]
```

Parse output to build phase dependency graph:
- Phases with `depends_on: []` → ready immediately (can start in parallel)
- Phases with dependencies → wait until all dependencies complete and merge

Store dependency graph in memory for orchestration. Do NOT read full tasks.yaml.

## Main Loop (Parallel Phases with Worktrees)

**Key principle:** Independent phases run in parallel in separate worktrees. Tasks within each phase run sequentially (handled by phase-execution skill).

```
While phases remain incomplete:

  1. Find ready phases:
     - Status is 'pending'
     - All depends_on phases are 'completed' (merged to build branch)

  2. For each ready phase IN PARALLEL (single message, multiple Task tools):

     a. Create worktree from build branch:
        git worktree add .worktrees/phase-{id} -b phase/{id} build/${session_id}

     b. Dispatch phase execution (foreground subagent per phase):
        Task tool:
          subagent_type: general-purpose
          description: "Execute phase: {phase-id}"
          prompt: |
            Execute phase {phase-id} in worktree.

            Working directory: {project_path}/.worktrees/phase-{id}
            Phase spec: spec/phase_{N}_{name}/spec.md
            Tasks file: docs/office/tasks.yaml (your phase only)

            Run tasks SEQUENTIALLY (one at a time):
            - For each task: implement (TDD) → self-review → commit
            - All commits go to phase/{id} branch in your worktree

            When all tasks complete:
            PHASE_COMPLETE: {phase-id}

            On blocking issue:
            FLAG: {type} | {task-id} | {description}

  3. Wait for ANY phase to complete:
     - Poll TaskOutput for each in-progress phase (block=false)
     - On completion, process result

  4. On PHASE_COMPLETE:

     a. Switch to build branch and merge phase:
        git checkout build/${session_id}
        git merge phase/{id} --no-ff -m "Merge phase: {phase-name}"

     b. If merge conflict:
        - Read conflicting files to understand the conflict
        - Resolve based on phase context (you have full visibility)
        - git add -A && git commit -m "Resolve conflicts: phase {id}"

     c. Cleanup worktree:
        git worktree remove .worktrees/phase-{id}
        git branch -d phase/{id}

     d. Update phase status to 'completed'

     e. Check if new phases are now ready (their dependencies now met)

  5. On FLAG:
     - Present to user with options (see Flag Handling section)
     - Handle user choice
     - Resume or skip as directed

All phases complete → Continue to Completion section
```

### Dispatching Multiple Phases in Parallel

**CRITICAL:** To run independent phases in parallel, dispatch multiple Task tools in a SINGLE message:

```
Example: phase-1 and phase-3 both have depends_on: []

[Task tool: Execute phase-1 in .worktrees/phase-1]
[Task tool: Execute phase-3 in .worktrees/phase-3]

Both dispatch in same message → both run simultaneously
```

Each phase works in its own worktree on its own branch - no conflicts possible.

### Conflict Resolution

When merging a phase to build branch, conflicts can occur if:
- Two parallel phases modified the same file
- A phase modified a file that was also changed in a dependency

The orchestrator (you) resolves conflicts because:
- You have context of all phases
- You can read both versions and understand intent
- Phase subagents only know their own scope

Resolution approach:
1. `git diff --name-only --diff-filter=U` to list conflicted files
2. Read each conflicted file
3. Understand what each phase was trying to do
4. Edit to combine both changes appropriately
5. `git add` and commit the resolution

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
Merge phase to build branch:
  1. Switch to build branch:
     git checkout build/${session_id}

  2. Merge phase:
     git merge phase/{id} --no-ff -m "Merge phase: {phase-name}"

  3. Handle conflicts if any (orchestrator resolves)

  4. Cleanup worktree:
     git worktree remove .worktrees/phase-{id}
     git branch -d phase/{id}

  5. Update phase status to 'completed'

Check: Any blocked phases now unblocked?
```

### On All Phases Complete

All phases have been merged to `build/${session_id}` branch.

**Create Pull Request:**

```bash
gh pr create \
  --base main \
  --head build/${session_id} \
  --title "Build: {project-name}" \
  --body "$(cat <<'EOF'
## Build Summary

**Session:** ${session_id}
**Phases:** {N} completed

| Phase | Tasks | Status |
|-------|-------|--------|
| phase-1 | {n}/{m} | completed |
| phase-2 | {n}/{m} | completed |

## Changes

{summary of major changes from each phase}

---
Generated by Office Plugin /build
EOF
)"

echo "PR created: $(gh pr view --json url -q .url)"
```

**Report to user:**

```markdown
## Build Complete!

**PR Created:** {pr_url}

**Summary:**
- Phases: {N} completed
- Total tasks: {M}

| Phase | Tasks | Commits |
|-------|-------|---------|
| {phase-name} | {completed}/{total} | {commit-count} |

**Next steps:**
1. Review the PR: {pr_url}
2. CI checks will run automatically
3. Merge when ready

Note: Build branch `build/${session_id}` will be deleted when PR is merged.
```

### Cleanup

```bash
# Update session status
sed -i '' 's/status: .*/status: build_complete/' docs/office/session.yaml

# Stop dashboard
pkill -f "server.py.*office" 2>/dev/null

# Worktrees already cleaned up after each phase merge
# Build branch remains until PR is merged/closed
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
