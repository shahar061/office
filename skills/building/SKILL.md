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
If docs/office/build-state.yaml exists:
  # Only grep for status, don't read full file
  status=$(grep "^  status:" docs/office/build-state.yaml | head -1 | awk '{print $2}')

  If status == "in_progress":
    Ask: "Found in-progress build. Resume or start fresh?"
    If resume:
      # Extract only phase statuses, not full file
      grep -E "^  - id:|status:" docs/office/build-state.yaml
    If fresh: Delete build-state.yaml, start over
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

**Max parallel phases:** (default: 3)

**Retry limit:** (default: 3)

### 5. Initialize State

Create `docs/office/build-state.yaml` with initial structure.

**Extract phase list from tasks.yaml without reading full file:**
```bash
# Get phase IDs and names only
grep -E "^- id:|^  name:" docs/office/tasks.yaml | paste - - | \
  sed 's/- id: //; s/  name: /|/'
```

Then write the build-state.yaml with phases set to `pending`.

### 6. Start Dashboard

**REQUIRED:** Invoke `/office:dashboard` skill to start build dashboard.

```
Use the Skill tool: skill: "office:dashboard"
```

## Main Loop

```
While phases remain incomplete:

  1. Find ready phases (use grep, not full file read):
     grep -B2 "status: pending" docs/office/build-state.yaml | grep "id:"
     # Check depends_on separately

  2. Dispatch ready phases in parallel:
     - Create worktree (superpowers:using-git-worktrees)
     - Start phase-executor as background task
     - Dispatch state-updater agent to mark phase in_progress

  3. Monitor background tasks (lightweight):
     - Use targeted grep on output files (see Monitoring section)
     - On flag: Handle flag (see Flag Handling)
     - On completion: Check newly unblocked phases

  4. Repeat until all phases completed or aborted
```

## State Updates

**IMPORTANT:** Use a dedicated haiku agent to update build-state.yaml instead of reading/editing in orchestrator.

### State Updater Agent

When you need to update build-state.yaml, dispatch a haiku agent:

```yaml
Task tool:
  subagent_type: general-purpose
  model: haiku
  description: "Update build state: [brief description]"
  prompt: |
    Update the build state file at: [project]/docs/office/build-state.yaml

    Action: [one of: mark_phase_started, mark_task_started, mark_task_completed,
             mark_phase_completed, add_flag, mark_task_skipped]

    Details:
      phase_id: [phase-id]
      task_id: [task-id if applicable]
      [additional fields as needed]

    Read the file, make the targeted edit, write it back.
    Respond with: DONE or ERROR: [reason]
```

This keeps build-state.yaml out of orchestrator context entirely.

## Dispatching Phases

**IMPORTANT:** To run phases in parallel, invoke multiple Task tools in a SINGLE message.

**CRITICAL:**
- Use `office:phase-executor` agent - it has `allowedTools` configured for autonomous operation
- Embed prompt templates directly (subagents cannot access plugin cache files)

```yaml
For each ready phase:
  Task tool:
    subagent_type: office:phase-executor   # Has Read/Write/Edit/Bash/Task permissions
    run_in_background: true
    description: "Execute phase: [phase-id]"
    prompt: |
      Work in worktree: [worktree-absolute-path]

      ## File Paths (READ THESE - they are in the project, not this prompt)
      - Tasks file: [project]/docs/office/tasks.yaml
      - Phase spec: [project]/spec/phase_[N]_[name]/spec.md
      - Build state: [project]/docs/office/build-state.yaml

      ## Your Phase
      Phase ID: [phase-id]

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

      ## Instructions
      1. Read tasks.yaml to get tasks for phase [phase-id]
      2. Read the phase spec file for implementation details
      3. For EACH task, follow the pipeline defined in your agent persona:

      ### Pipeline per Task

      1. IMPLEMENTER
         Use the IMPLEMENTER TEMPLATE above
         Model: [config.models.implementer]

         Dispatch subagent with:
         - The template content
         - Task details from tasks.yaml
         - Spec section for this task

         Wait for response:
         - DONE → proceed to step 3
         - NEED_CLARIFICATION → proceed to step 2
         - ERROR → retry up to [retry_limit], then FLAG

      2. CLARIFIER (only if NEED_CLARIFICATION)
         Use the CLARIFIER TEMPLATE above
         Model: [config.models.clarifier]

         Dispatch subagent, wait for response:
         - ANSWERED → re-dispatch implementer with answer
         - FLAG → exit with flag (clarifier_blocked)

      3. SPEC-REVIEWER
         Use the SPEC-REVIEWER TEMPLATE above
         Model: [config.models.spec_reviewer]

         Dispatch subagent, wait for response:
         - COMPLIANT → proceed to step 4
         - ISSUES → re-dispatch implementer to fix
           - Max 3 loops
           - If exhausted → FLAG (spec_review_exhausted)

      4. CODE-REVIEWER
         Use the CODE-REVIEWER TEMPLATE above
         Model: [config.models.code_reviewer]

         Dispatch subagent, wait for response:
         - APPROVED → task complete, next task
         - ISSUES → re-dispatch implementer to fix
           - Max 3 loops
           - If exhausted → FLAG (code_review_exhausted, WARNING)

      ## After Each Task
      Update build-state.yaml directly (you have full context of current task).

      ## Output Format
      After each task, output a status line:
      TASK_STATUS: [task-id] [DONE|FLAG|SKIPPED] [optional: flag_type]

      On completion:
      PHASE_COMPLETE: [phase-id]

      On flag:
      FLAG: [flag_type] | [task-id] | [brief description]
```

## Monitoring Background Tasks

**CRITICAL:** Do NOT dump full output into orchestrator context.

### Lightweight Polling

```bash
# Check for completion or flags - returns just status lines
grep -E "^(TASK_STATUS|PHASE_COMPLETE|FLAG):" [output-file] | tail -20

# Check if still running
ps -p [pid] >/dev/null 2>&1 && echo "RUNNING" || echo "FINISHED"
```

### What to Look For

| Pattern | Meaning |
|---------|---------|
| `PHASE_COMPLETE: [id]` | Phase finished successfully |
| `FLAG: [type] \| [task] \| [desc]` | Human intervention needed |
| `TASK_STATUS: [id] DONE` | Task completed |
| `TASK_STATUS: [id] FLAG [type]` | Task flagged |

### Polling Frequency

```yaml
Every 30 seconds:
  1. Check each background task output with grep
  2. If FLAG found: Handle immediately
  3. If PHASE_COMPLETE found: Process completion
  4. If still RUNNING: Continue polling
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
1. Dispatch state-updater (haiku) to update build-state.yaml:
   - Task status: flagged
   - Add to flags array

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

To stay under ~50k context in orchestrator:

| Item | Approach | Context Cost |
|------|----------|--------------|
| tasks.yaml | Pass path to subagents | ~0 |
| spec files | Pass path to subagents | ~0 |
| prompt templates | Read ONCE, embed in phase prompts | ~250 (one-time) |
| build-state.yaml | Use haiku state-updater | ~0 |
| Task output | grep for status lines only | ~100-500 |
| Skill content | Loaded once at start | ~5k |
| Conversation | Accumulates | Variable |

**Total orchestrator overhead: ~5-10k** (vs 85k+ before)

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
- `docs/office/build-state.yaml` - Build progress state
- `docs/office/session.yaml` - Updated on completion
