---
name: building
description: "Execute implementation plan with autonomous subagent pipeline. Two-stage review (spec + quality). Flags only for critical blockers."
---

# /build - Execute Implementation Plan

## Overview

Autonomous execution of the implementation plan from `/warroom`. Each task runs through a 4-subagent pipeline: Implementer → Clarifier (if needed) → Spec-Reviewer → Code-Reviewer.

**Key principles:**
- Phases run **sequentially** (one at a time)
- Tasks run **in parallel** within a phase (based on dependency DAG)
- Each subagent is **fresh** (no inherited context)
- **No man-in-loop** unless critical blocker (flag)
- **No polling** - orchestrator waits idle while phase executor runs

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

### 2. Load Prompt Templates

**IMPORTANT:** Subagents are sandboxed and cannot access plugin cache files. You MUST read templates once and embed them in phase executor prompts.

```yaml
Read these files from the skill directory (use Read tool):
  - prompts/implementer.md
  - prompts/clarifier.md
  - prompts/spec-reviewer.md
  - prompts/code-reviewer.md

Store the content for embedding in phase executor prompts.
This is ~250 lines total - acceptable one-time cost.
```

### 3. Check for Resume

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

### 4. Configure Build

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

### 5. Request Permissions

**CRITICAL:** Background subagents auto-deny any tool calls that require permission. You MUST request permissions upfront for the build to work.

Use the `ExitPlanMode` tool with `allowedPrompts` to request session-wide permissions:

```yaml
ExitPlanMode:
  allowedPrompts:
    - tool: Bash
      prompt: "run npm and npx commands"
    - tool: Bash
      prompt: "run git commands"
    - tool: Bash
      prompt: "run build and test commands"
    - tool: Bash
      prompt: "run package manager commands (yarn, pnpm)"
```

**Why this is needed:**
- Phase executors run with `run_in_background: true` for parallelism
- Background agents cannot prompt for permissions interactively
- Without pre-approved permissions, all Bash/Write/Edit calls fail silently
- `allowedTools` in agent config only limits available tools, doesn't grant permissions

**Note:** The user will see a permission approval prompt. If denied, fall back to sequential foreground execution.

**Fallback - Manual Permission Configuration:**

If `ExitPlanMode` doesn't work (e.g., not in plan mode), instruct the user to add permissions to their project's `.claude/settings.local.json`:

```json
{
  "permissions": {
    "allow": [
      "Bash(npm:*)",
      "Bash(npx:*)",
      "Bash(yarn:*)",
      "Bash(pnpm:*)",
      "Bash(git:*)",
      "Bash(node:*)",
      "Bash(tsc:*)",
      "Bash(jest:*)",
      "Bash(vitest:*)",
      "Bash(pytest:*)",
      "Bash(cargo:*)",
      "Bash(go:*)",
      "Bash(make:*)"
    ]
  }
}
```

Or for broader (less secure) access:
```json
{
  "permissions": {
    "allow": [
      "Bash(*)"
    ]
  }
}
```

After adding permissions, user must restart Claude Code for changes to take effect.

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

### 7. Start Dashboard

**REQUIRED:** Invoke `/office:dashboard` skill to start build dashboard.

```
Use the Skill tool: skill: "office:dashboard"
```

## Main Loop (Sequential Phases)

**Key principle:** Phases run sequentially. Tasks within each phase run in parallel based on dependencies. The orchestrator goes idle after spawning a phase executor and waits for completion (no polling).

```
For each phase in order:

  1. Create worktree for the phase:
     - Use Bash: git worktree add .worktrees/phase-{id} -b phase-{id}

  2. Create status directory:
     - mkdir -p docs/office/build/phase-{id}/

  3. Spawn phase-executor (background: true):
     - Pass worktree path, phase ID, embedded prompt templates
     - The phase executor OWNS docs/office/build/phase-{id}/status.yaml

  4. Wait for completion:
     - Use TaskOutput with block: true
     - Orchestrator goes IDLE - no polling needed

  5. On completion, apply completion policy:
     - If checkpoint: Ask user to review, wait for approval
     - If auto-merge: Merge phase branch to main automatically
     - If pr: Create pull request for the phase branch

  6. Cleanup:
     - git worktree remove .worktrees/phase-{id}
     - Continue to next phase
```

**Why no parallel phases:** Simplifies state management, prevents merge conflicts, and reduces context usage. Tasks within a phase provide sufficient parallelism.

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

## Dispatching Phase Executor

**CRITICAL:**
- Use `office:phase-executor` agent - it has `allowedTools` configured
- Embed prompt templates directly (subagents cannot access plugin cache files)
- Use `run_in_background: true` so you can use TaskOutput to wait

```yaml
Task tool:
  subagent_type: office:phase-executor
  run_in_background: true
  description: "Execute phase: [phase-id]"
  prompt: |
    ## Phase Execution Context

    Work in worktree: [worktree-absolute-path]

    ## File Paths (READ THESE - they are in the project, not this prompt)
    - Tasks file: [project]/docs/office/tasks.yaml
    - Phase spec: [project]/spec/phase_[N]_[name]/spec.md
    - Build config: [project]/docs/office/build/config.yaml

    ## Your Phase
    Phase ID: [phase-id]

    ## Status Files (YOU OWN THESE)
    - Status: [project]/docs/office/build/phase-[id]/status.yaml
    - Log: [project]/docs/office/build/phase-[id]/progress.log

    ## Configuration
    Models: implementer=[implementer], clarifier=[clarifier],
            spec_reviewer=[spec_reviewer], code_reviewer=[code_reviewer]
    Retry limit: [retry_limit]

    ## Prompt Templates (embedded - subagents cannot access plugin files)

    ### IMPLEMENTER TEMPLATE
    ```
    [paste implementer.md content here]
    ```

    ### CLARIFIER TEMPLATE
    ```
    [paste clarifier.md content here]
    ```

    ### SPEC-REVIEWER TEMPLATE
    ```
    [paste spec-reviewer.md content here]
    ```

    ### CODE-REVIEWER TEMPLATE
    ```
    [paste code-reviewer.md content here]
    ```

    ## DAG Execution Instructions

    Execute tasks in parallel based on their `dependencies` field. See your
    agent persona for the full DAG execution algorithm.

    Key steps:
    1. Read tasks.yaml for your phase's tasks and dependencies
    2. Initialize status.yaml with all tasks as "blocked" or "ready"
    3. Run DAG executor: spawn ready tasks in parallel, wait for any completion
    4. Merge completed task branches, spawn newly-ready tasks
    5. Repeat until all tasks done or a blocking flag occurs

    ## Output Format
    After each task:
    TASK_STATUS: [task-id] [DONE|FLAG|SKIPPED] [optional: flag_type]

    On completion:
    PHASE_COMPLETE: [phase-id]

    On flag:
    FLAG: [flag_type] | [task-id] | [brief description]
```

## Waiting for Phase Completion

After dispatching the phase executor:

```yaml
TaskOutput:
  task_id: [agent_id from Task result]
  block: true
  timeout: 600000  # 10 minutes max per phase (adjust as needed)
```

The orchestrator goes **idle** while waiting. No polling needed.

When TaskOutput returns, check the result for:
- `PHASE_COMPLETE` - Phase finished successfully
- `FLAG: ...` - Human intervention needed (see Flag Handling)

## No Polling Required

The new architecture eliminates polling entirely:

1. **Orchestrator waits with TaskOutput** - goes idle, no context usage
2. **Phase executor updates status.yaml** - dashboard watches this
3. **Dashboard watches build/ directory** - users see real-time progress

**Result patterns in TaskOutput:**

| Pattern | Meaning | Action |
|---------|---------|--------|
| `PHASE_COMPLETE: [id]` | Phase finished | Apply completion policy |
| `FLAG: [type] \| [task] \| [desc]` | Needs human input | Handle flag |
| Task exits with error | Phase failed | Mark failed, ask user |

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

The new architecture dramatically reduces orchestrator context:

| Item | Approach | Context Cost |
|------|----------|--------------|
| tasks.yaml | Pass path to subagents | ~0 |
| spec files | Pass path to subagents | ~0 |
| prompt templates | Read ONCE, embed in phase prompts | ~250 (one-time) |
| State updates | Phase executor owns files | ~0 |
| Polling | **None** (wait with TaskOutput) | ~0 |
| Task output | Only final result | ~100-500 |
| Skill content | Loaded once at start | ~5k |

**Total orchestrator overhead: ~5-10k per phase** (vs 220k+ with polling)

**Why templates must be embedded:**
- Subagents run in sandboxed environments
- They cannot access `~/.claude/plugins/cache/...` paths
- Only project directory files are accessible to subagents

## Files

**Skill files:**
- `SKILL.md` - This orchestrator
- `prompts/implementer.md` - Implementer subagent template
- `prompts/clarifier.md` - Clarifier subagent template
- `prompts/spec-reviewer.md` - Spec reviewer subagent template
- `prompts/code-reviewer.md` - Code reviewer subagent template

**Runtime files:**
- `docs/office/build/config.yaml` - Build configuration
- `docs/office/build/phase-{id}/status.yaml` - Per-phase status (owned by phase executor)
- `docs/office/build/phase-{id}/progress.log` - Per-phase event log
- `docs/office/session.yaml` - Updated on completion
