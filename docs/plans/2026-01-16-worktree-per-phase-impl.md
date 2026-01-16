# Worktree per Phase - Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Restore worktree isolation for /build - each phase gets its own worktree, tasks run sequentially within, independent phases run in parallel.

**Architecture:** Build branch → worktree per phase → sequential tasks → merge to build branch → PR to main.

**Tech Stack:** Markdown skill files

---

## Task 1: Update Building Skill - Startup Section

**Files:**
- Modify: `skills/building/SKILL.md` (lines 1-80)

**Step 1: Update the overview section**

Replace the overview to reflect new architecture:

```markdown
## Overview

Autonomous execution of the implementation plan from `/warroom`. Each phase gets an isolated worktree for safe parallel execution.

**Key principles:**
- Build branch isolates all work from main
- Each phase gets its own **worktree** (isolated)
- Independent phases run **in parallel** (separate worktrees)
- Tasks run **sequentially** within a phase (safe commits)
- Orchestrator merges phases and resolves conflicts
- Final output is a **PR to main**
```

**Step 2: Add build branch creation after Step 3 (Configure Build)**

Add new section after configuration:

```markdown
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
```

**Step 3: Renumber subsequent steps**

- Step 4 (Prime Permissions) → Step 5
- Step 5 (Initialize Build Directory) → Step 6
- Step 6 (Start Dashboard) → Step 7

**Step 4: Commit**

```bash
git add skills/building/SKILL.md
git commit -m "feat(build): add build branch creation at startup"
```

---

## Task 2: Update Building Skill - Extract Phase Dependencies

**Files:**
- Modify: `skills/building/SKILL.md`

**Step 1: Add phase dependency extraction after build directory initialization**

Add new section:

```markdown
### 8. Extract Phase Dependencies

Extract phase-level dependencies from tasks.yaml (without reading full file):

```bash
# Get phase IDs and their depends_on
grep -E "^- id:|^  depends_on:" docs/office/tasks.yaml | paste - - | \
  sed 's/- id: //; s/  depends_on: /|/'
```

Parse output to build phase dependency graph:
- Phases with `depends_on: []` → ready immediately
- Phases with dependencies → wait until dependencies complete

Store in memory for orchestration.
```

**Step 2: Commit**

```bash
git add skills/building/SKILL.md
git commit -m "feat(build): extract phase dependencies for parallel execution"
```

---

## Task 3: Update Building Skill - Main Loop with Worktrees

**Files:**
- Modify: `skills/building/SKILL.md` (Main Loop section)

**Step 1: Replace the Main Loop section**

Replace the entire "Main Loop" section with:

```markdown
## Main Loop (Parallel Phases with Worktrees)

**Key principle:** Independent phases run in parallel in separate worktrees. Tasks within each phase run sequentially.

```
While phases remain incomplete:

  1. Find ready phases:
     - Status is 'pending'
     - All depends_on phases are 'completed' (merged to build branch)

  2. For each ready phase IN PARALLEL (single message, multiple Task tools):
     a. Create worktree from build branch:
        git worktree add .worktrees/phase-{id} -b phase/{id} build/{session_id}

     b. Dispatch phase subagent (foreground, one per phase):
        Task tool:
          subagent_type: general-purpose
          description: "Execute phase: {phase-id}"
          prompt: |
            Execute phase {phase-id} in worktree at {worktree_path}.

            Run tasks SEQUENTIALLY (one at a time):
            - Read spec/phase_{N}_{name}/spec.md
            - For each task: implement → self-review → commit
            - All commits go to phase/{id} branch

            When all tasks complete, output:
            PHASE_COMPLETE: {phase-id}

            On blocking issue:
            FLAG: {type} | {task-id} | {description}

  3. Wait for ANY phase to complete:
     - Poll TaskOutput for each in-progress phase
     - On completion, handle result

  4. On PHASE_COMPLETE:
     a. Merge phase to build branch:
        git checkout build/{session_id}
        git merge phase/{id} --no-ff -m "Merge phase: {phase-name}"

     b. If merge conflict:
        - Read conflicting files
        - Resolve based on phase context
        - git add -A && git commit -m "Resolve conflicts: phase {id}"

     c. Cleanup worktree:
        git worktree remove .worktrees/phase-{id}
        git branch -d phase/{id}

     d. Mark phase completed
     e. Check if new phases are now ready (dependencies met)

  5. On FLAG:
     - Present to user with options
     - Handle user choice
     - Resume or skip as directed

All phases complete → Continue to Completion section
```

### Dispatching Multiple Phases

**CRITICAL:** To run phases in parallel, dispatch multiple Task tools in a SINGLE message:

```
[Task tool: Execute phase-1 in .worktrees/phase-1]
[Task tool: Execute phase-2 in .worktrees/phase-2]
```

Each phase works in its own worktree - no conflicts possible.
```

**Step 2: Commit**

```bash
git add skills/building/SKILL.md
git commit -m "feat(build): parallel phases with worktrees in main loop"
```

---

## Task 4: Update Building Skill - Completion Section

**Files:**
- Modify: `skills/building/SKILL.md` (Completion section)

**Step 1: Replace the completion section**

Replace with PR-based completion:

```markdown
## Completion

### On All Phases Complete

All phases have been merged to `build/{session_id}` branch.

**Create Pull Request:**

```bash
gh pr create \
  --base main \
  --head build/{session_id} \
  --title "Build: {project-name}" \
  --body "$(cat <<'EOF'
## Build Summary

**Session:** {session_id}
**Duration:** {duration}
**Phases:** {N} completed

| Phase | Tasks | Status |
|-------|-------|--------|
| {phase-1} | {n}/{m} | completed |
| {phase-2} | {n}/{m} | completed |

## Changes

{summary of major changes}

---
Generated by Office Plugin /build
EOF
)"
```

**Report to user:**

```markdown
## Build Complete!

**PR Created:** {pr_url}

**Summary:**
- Duration: {time}
- Phases: {N} completed
- Tasks: {M} total

**Next steps:**
1. Review the PR
2. Run CI checks
3. Merge when ready
```

### Cleanup

```bash
# Update session status
sed -i '' 's/status: .*/status: build_complete/' docs/office/session.yaml

# Stop dashboard
pkill -f "server.py.*office" 2>/dev/null

# Note: Build branch and worktrees are cleaned up
# Worktrees removed after each phase merge
# Build branch remains until PR is merged/closed
```
```

**Step 2: Commit**

```bash
git add skills/building/SKILL.md
git commit -m "feat(build): PR-based completion instead of direct merge"
```

---

## Task 5: Update Phase-Execution Skill - Sequential Tasks

**Files:**
- Modify: `skills/phase-execution/SKILL.md`

**Step 1: Update the overview**

Replace the header and overview:

```markdown
---
name: phase-execution
description: "Execute a single phase with sequential task execution in an isolated worktree."
---

# /phase-execution - Execute Single Phase

Runs all tasks in a phase **sequentially** within an isolated worktree. Each task goes through the 4-stage pipeline: Implement → Self-Review (Spec) → Self-Review (Quality) → Commit.

**Context strategy:**
- Phase runs in its own worktree (isolated from other phases)
- Tasks run ONE AT A TIME (no parallel execution)
- All commits go to the phase branch
- Orchestrator handles merge to build branch
```

**Step 2: Replace the DAG Execution Algorithm**

Replace with sequential execution:

```markdown
## Sequential Execution Algorithm

```python
for task in phase_tasks:  # In dependency order
    # 1. Execute task
    log_event(f"TASK_START:{task.id}")
    update_status(task.id, "in_progress")

    result = execute_task_pipeline(task)

    # 2. Handle result
    if result.success:
        update_status(task.id, "completed")
        log_event(f"TASK_DONE:{task.id}")
    elif result.is_blocking:
        # Return flag to orchestrator
        output: FLAG: {type} | {task.id} | {description}
        return
    else:
        update_status(task.id, "failed")
        log_event(f"TASK_FAIL:{task.id}")
        # Continue to next task (non-blocking failure)

# All tasks complete
log_event("PHASE_COMPLETE")
update_status_file(status="completed")
output: PHASE_COMPLETE: {phase_id}
```

**Why sequential?**
- No git conflicts within the phase
- No race conditions on commits
- Simpler, more reliable
- Parallel execution happens at phase level instead
```

**Step 3: Update task dispatching section**

Replace "Dispatching Task Subagents" with inline execution:

```markdown
## Task Execution (Inline)

**Do NOT spawn background subagents.** Execute each task directly in this agent context.

For each task:

```markdown
### Task: {task-id}

**1. Read spec:**
Read `spec/phase_{N}_{name}/spec.md` section for this task.

**2. Implement (TDD):**
- Write failing test
- Verify test fails
- Write implementation
- Verify test passes

**3. Self-Review (Spec Compliance):**
- Re-read spec requirements
- Verify each acceptance criterion
- Fix issues (max 3 attempts)

**4. Self-Review (Code Quality):**
- Check code quality, test coverage
- Fix issues (max 3 attempts)

**5. Commit:**
git add -A
git commit -m "{task-id}: {description}"

**6. Output:**
TASK_DONE: {task-id}
Files: {files changed}
Commit: {sha}
```

If blocked at any stage:
```
FLAG: {type} | {task-id} | {description}
```
```

**Step 4: Remove parallel-related sections**

Remove:
- "Dispatching Task Subagents" section (replaced above)
- "Waiting for Tasks" section (not needed for sequential)
- References to background subagents

**Step 5: Commit**

```bash
git add skills/phase-execution/SKILL.md
git commit -m "feat(phase-execution): sequential tasks instead of parallel DAG"
```

---

## Task 6: Update Warrooming Skill - Ensure Phase Dependencies

**Files:**
- Modify: `skills/warrooming/SKILL.md`

**Step 1: Update Team Lead prompt to include phase depends_on**

In Step 2, update the Team Lead prompt to explicitly include phase-level dependencies:

Find the Team Lead prompt and add to the task structure:

```markdown
    ## Task Structure

    Each phase MUST have a `depends_on` field:

    ```yaml
    phases:
      - id: phase-1
        name: Project Setup
        depends_on: []  # No dependencies - can start first
        tasks: [...]

      - id: phase-2
        name: Backend API
        depends_on: [phase-1]  # Depends on phase-1
        tasks: [...]

      - id: phase-3
        name: Frontend UI
        depends_on: [phase-1]  # Can run parallel with phase-2
        tasks: [...]

      - id: phase-4
        name: Integration
        depends_on: [phase-2, phase-3]  # Waits for both
        tasks: [...]
    ```

    Infer dependencies from task relationships:
    - If any task in Phase B depends on a task in Phase A → Phase B depends_on Phase A
    - If no cross-phase dependencies → depends_on: []
```

**Step 2: Commit**

```bash
git add skills/warrooming/SKILL.md
git commit -m "feat(warroom): ensure phase-level depends_on in tasks.yaml"
```

---

## Task 7: Final Verification

**Step 1: Review all changes**

```bash
git log --oneline -10
git diff master..HEAD --stat
```

**Step 2: Verify key sections exist**

```bash
# Build branch creation
grep -n "Create Build Branch" skills/building/SKILL.md

# Worktree creation in main loop
grep -n "git worktree add" skills/building/SKILL.md

# Sequential execution
grep -n "sequential" skills/phase-execution/SKILL.md

# Phase depends_on
grep -n "depends_on" skills/warrooming/SKILL.md
```

**Step 3: Update design doc link**

Add link from design to implementation plan:

```bash
echo -e "\n---\n\n**Implementation:** [2026-01-16-worktree-per-phase-impl.md](./2026-01-16-worktree-per-phase-impl.md)" >> docs/plans/2026-01-16-worktree-per-phase-design.md
git add docs/plans/
git commit -m "docs: link design to implementation"
```

---

## Summary

| Task | File | Change |
|------|------|--------|
| 1 | building/SKILL.md | Add build branch creation at startup |
| 2 | building/SKILL.md | Extract phase dependencies |
| 3 | building/SKILL.md | Parallel phases with worktrees in main loop |
| 4 | building/SKILL.md | PR-based completion |
| 5 | phase-execution/SKILL.md | Sequential tasks instead of parallel DAG |
| 6 | warrooming/SKILL.md | Ensure phase-level depends_on |
| 7 | - | Final verification |

**Estimated commits:** 7
**Files changed:** 3 (building, phase-execution, warrooming skills)
