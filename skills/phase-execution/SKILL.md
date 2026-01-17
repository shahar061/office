---
name: phase-execution
description: "Execute a single phase with sequential task execution in an isolated worktree."
---

# /phase-execution - Execute Single Phase

Runs all tasks in a phase **sequentially** within an isolated worktree. Each task goes through the 4-stage pipeline inline: Implement → Self-Review (Spec) → Self-Review (Quality) → Commit.

**Context strategy:**
- Phase runs in its own worktree (created by orchestrator)
- Tasks run ONE AT A TIME (no parallel execution within phase)
- All commits go to the phase branch
- Orchestrator handles merge to build branch after phase completes

**Why sequential?**
- No git conflicts within the phase
- No race conditions on commits
- Simpler and more reliable
- Parallel execution happens at PHASE level (multiple worktrees)

## Input (from orchestrator)

The orchestrator provides context before invoking this skill:
- `phase_id` - Which phase to execute
- `worktree_path` - Absolute path to this phase's worktree
- `project_path` - Absolute path to main project root
- `models` - Model config (for reference, but tasks run inline)
- `retry_limit` - Max retry attempts per stage (default: 3)

## Initialization

### 1. Create Status Directory

```bash
mkdir -p {project_path}/docs/office/build/phase-{id}/
```

### 2. Parse Phase Tasks (ONE-TIME read)

```bash
# Extract only THIS phase's tasks from tasks.yaml
# This is unavoidable - we need the dependency graph
```

Read `{project_path}/docs/office/tasks.yaml` and extract:
- Task IDs for this phase
- Dependencies for each task
- Task descriptions

Store in memory for sequential processing. **Do NOT re-read this file.**

### 3. Initialize status.yaml

```yaml
phase: {phase-id}
status: in_progress
started_at: "{ISO timestamp}"
tasks:
  task-001: ready      # no dependencies
  task-002: ready      # no dependencies (parallel with 001)
  task-003: blocked    # depends on task-001
  task-004: blocked    # depends on task-001, task-002
```

### 4. Initialize progress.log

Use the Write tool to create the initial log entry:

```yaml
Write tool:
  file_path: {project_path}/docs/office/build/phase-{id}/progress.log
  content: "{ISO timestamp} PHASE_START\n"
```

**Do NOT use bash echo** - it requires permission prompts that block execution.

## Sequential Execution Algorithm

Tasks are executed in dependency order, one at a time:

```python
for task in sorted_by_dependencies(phase_tasks):
    # 1. Start task
    log_event(f"TASK_START:{task.id}")
    update_status(task.id, "in_progress")

    # 2. Execute 4-stage pipeline (inline - see Task Execution section)
    result = execute_task_inline(task)

    # 3. Handle result
    if result.success:
        update_status(task.id, "completed")
        log_event(f"TASK_DONE:{task.id}")

    elif result.is_blocking_flag:
        # Return flag to orchestrator immediately
        output: FLAG: {type} | {task.id} | {description}
        return  # Stop phase execution

    else:
        # Non-blocking failure - log and continue
        update_status(task.id, "failed")
        log_event(f"TASK_FAIL:{task.id}")

# All tasks processed
log_event("PHASE_COMPLETE")
update_status_file(status="completed")
output: PHASE_COMPLETE: {phase_id}
```

## Task Execution (Inline)

**Execute each task directly** - do NOT spawn background subagents.

For each task, follow this 4-stage pipeline:

### Stage 1: IMPLEMENT

1. Read the spec section for this task from `spec/phase_{N}_{name}/spec.md`
2. Follow TDD:
   - Write failing test first
   - Run test, verify it fails
   - Write minimal implementation
   - Run test, verify it passes
3. If blocked (missing information):
   - First search codebase for answers
   - If still unclear: `FLAG: clarifier_blocked | {task-id} | {question}`

### Stage 2: SELF-REVIEW (Spec Compliance)

After implementing:
1. Re-read the spec requirements
2. Verify EACH acceptance criterion is met
3. Check you didn't add unnecessary code (YAGNI)

If issues found:
- Fix immediately, re-run tests
- Max 3 fix attempts
- After 3 failures: `FLAG: spec_review_exhausted | {task-id} | {issues}`

### Stage 3: SELF-REVIEW (Code Quality)

Review your code for:
- Readability and clarity
- Test coverage
- Consistency with codebase patterns
- Security issues
- Obvious bugs

If issues found:
- Fix, re-run tests
- Max 3 fix attempts
- After 3: `FLAG: code_review_exhausted | {task-id} | {issues}` (WARNING only)

### Stage 4: COMMIT

```bash
git add -A
git commit -m "{task-id}: {description}"
```

### Task Output

On success:
```
TASK_DONE: {task-id}
Files: {list of files changed}
Tests: {pass count} passed
Commit: {sha}
```

On blocking issue:
```
FLAG: {type} | {task-id} | {description}
```

## Status Updates

**Use the Edit tool** (NOT sed/bash) to update `status.yaml`:

```yaml
Edit tool:
  file_path: {project_path}/docs/office/build/phase-{id}/status.yaml
  old_string: "  {task_id}: {old_status}"
  new_string: "  {task_id}: {new_status}"
```

This avoids shell command issues (sed waiting on stdin if malformed).

For `progress.log`, use Read + Write tools to append:

```yaml
# 1. Read current content
Read tool:
  file_path: {project_path}/docs/office/build/phase-{id}/progress.log

# 2. Write with appended line
Write tool:
  file_path: {project_path}/docs/office/build/phase-{id}/progress.log
  content: "{existing_content}{ISO timestamp} {EVENT}\n"
```

**Do NOT use bash echo for logging** - it requires permission prompts that block background agent execution.

## Output Format

**After each task completes:**
```
TASK_STATUS: {task-id} {DONE|FLAG|SKIPPED}
```

**On phase completion:**
```
PHASE_COMPLETE: {phase-id}
```

**On blocking flag:**
```
FLAG: {flag_type} | {task-id} | {brief description}
```

## Context Budget

| Item | Cost | Notes |
|------|------|-------|
| Skill content | ~3k | One-time load |
| tasks.yaml (phase portion) | ~500-1k | One-time read |
| Spec file (phase) | ~2-5k | Read once per phase |
| Task implementation | ~1-2k each | Inline execution |
| Status updates | ~50 each | Edit tool |
| **Total per phase** | ~10-20k | Depends on task count |

All execution happens inline - no subagent overhead.
