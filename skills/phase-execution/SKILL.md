---
name: phase-execution
description: "Execute a single phase with DAG-based parallel task execution. Invoked by /build for each phase sequentially."
---

# /phase-execution - Execute Single Phase

Runs all tasks in a phase with **parallel execution based on dependency DAG**. Each task goes through the 4-subagent pipeline.

**Context strategy:**
- Skill runs in main context (can spawn subagents)
- Read tasks.yaml ONCE to build dependency graph
- Push all implementation work to subagents
- Subagents are fresh (no context accumulation)

## Input (from orchestrator)

The orchestrator passes these via skill invocation context:
- `phase_id` - Which phase to execute
- `project_path` - Absolute path to project root
- `models` - Model config (implementer, clarifier, spec_reviewer, code_reviewer)
- `retry_limit` - Max retry attempts per stage

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
- Task descriptions (for subagent prompts)

Store in memory as dependency graph. **Do NOT re-read this file.**

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

```bash
echo "$(date -Iseconds) PHASE_START" >> {project_path}/docs/office/build/phase-{id}/progress.log
```

## DAG Execution Algorithm

```python
completed = set()
in_progress = {}  # task_id -> agent_id
failed = set()

while incomplete_tasks_remain():
    # 1. Find ready tasks
    ready = [t for t in tasks
             if t.id not in completed
             and t.id not in in_progress
             and t.id not in failed
             and all(dep in completed for dep in t.dependencies)]

    # 2. Spawn ALL ready tasks in parallel (single message, multiple Task calls)
    for task in ready:
        agent_id = dispatch_task_pipeline(task)  # background subagent
        in_progress[task.id] = agent_id
        update_status(task.id, "in_progress")
        log_event(f"TASK_START:{task.id}")

    # 3. Wait for ANY task to complete
    for task_id, agent_id in in_progress.items():
        result = TaskOutput(agent_id, block=false, timeout=1000)
        if result.finished:
            handle_completion(task_id, result)
            break
    else:
        # None finished yet, brief wait then retry
        sleep(5 seconds)
        continue

    # 4. Handle completion
    if result.success:
        completed.add(task_id)
        update_status(task_id, "completed")
        log_event(f"TASK_DONE:{task_id}")
    else:
        # Handle failure/flag
        if is_blocking(result):
            output: FLAG: {type} | {task_id} | {description}
            return  # Let orchestrator handle
        else:
            failed.add(task_id)
            log_event(f"TASK_FAIL:{task_id}")

    del in_progress[task_id]

# All tasks complete
log_event("PHASE_COMPLETE")
update_status_file(status="completed")
output: PHASE_COMPLETE: {phase_id}
```

## Dispatching Task Subagents

**CRITICAL:** Spawn multiple tasks in a SINGLE message to maximize parallelism.

**IMPORTANT:** Task subagents CANNOT spawn nested subagents (Claude Code limitation). Each task subagent must do all 4 stages INLINE within a single agent execution.

For each ready task, dispatch a background subagent:

```yaml
Task tool:
  subagent_type: general-purpose
  model: {models.implementer}
  run_in_background: true
  description: "Execute task: {task-id}"
  prompt: |
    # Task Pipeline: {task-id}

    You are a task executor. Complete this task through a 4-stage pipeline.
    **You must do all stages yourself - you CANNOT spawn subagents.**

    ## Context
    Project: {project_path}
    Phase spec: {project_path}/spec/phase_{N}_{name}/spec.md
    Task: {task-id} - {task-description}
    Acceptance criteria:
    {acceptance_criteria}

    ## Stage 1: IMPLEMENT

    1. Read the spec section for this task
    2. Follow TDD:
       - Write failing test first
       - Verify test fails (run it)
       - Write implementation
       - Verify test passes
    3. Commit: "{task-id}: {description}"

    If you cannot proceed due to missing information:
    - First, search the codebase for answers (grep, read files)
    - If still unclear after searching, output:
      FLAG: clarifier_blocked | {task-id} | {your question}

    ## Stage 2: SELF-REVIEW (Spec Compliance)

    After implementing, review your own work:
    - Re-read the spec requirements
    - Verify EACH acceptance criterion is met
    - Check you didn't add unnecessary code

    If issues found:
    - Fix them immediately
    - Re-run tests
    - Commit the fix

    Max 3 fix attempts. If still failing after 3:
    FLAG: spec_review_exhausted | {task-id} | {remaining issues}

    ## Stage 3: SELF-REVIEW (Code Quality)

    Review your code for:
    - Code quality and readability
    - Test coverage
    - Consistency with codebase patterns
    - Security issues
    - Obvious bugs

    If issues found:
    - Fix them
    - Re-run tests
    - Commit

    Max 3 fix attempts. If still failing after 3:
    FLAG: code_review_exhausted | {task-id} | {remaining issues}
    (This is a WARNING - task can still complete)

    ## Stage 4: FINALIZE

    1. Ensure all tests pass
    2. Ensure code is committed
    3. Output final status

    ## Output Format

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

    Flag types:
    - clarifier_blocked: Need human input (BLOCKING)
    - spec_review_exhausted: Can't meet spec after 3 tries (BLOCKING)
    - code_review_exhausted: Quality issues remain (WARNING)
    - implementation_error: Unrecoverable error (BLOCKING)
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

For `progress.log`, use Write tool to append:

```yaml
# Read current content first, then write with appended line
Read: {project_path}/docs/office/build/phase-{id}/progress.log
Write: {existing_content}\n{timestamp} {EVENT}
```

Or if you must use Bash for logging (simpler for append):
```bash
echo "$(date -Iseconds) {EVENT}" >> "{project_path}/docs/office/build/phase-{id}/progress.log"
```

**Never chain multiple sed commands with `&&`** - each file operation should be separate.

## Waiting for Tasks

Use non-blocking TaskOutput in a loop:

```yaml
For each in_progress task:
  TaskOutput:
    task_id: {agent_id}
    block: false
    timeout: 1000

  If task finished:
    Process result and continue DAG
```

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
| tasks.yaml (phase portion) | ~500-1k | One-time read, stored in memory |
| Status updates | ~50 each | sed commands, minimal |
| TaskOutput checks | ~100 each | Non-blocking, brief results |
| **Total per phase** | ~5-10k | Much less than full conversation |

Task subagents get **fresh context** - no accumulation in main conversation.
