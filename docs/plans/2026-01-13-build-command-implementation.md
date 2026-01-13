# Build Command Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add `/build` command to Office plugin that executes implementation plans using an agent pool with isolated git worktrees per feature.

**Architecture:** Extends existing Office plugin with new skills (workspace:prepare, workspace:cleanup, /build) and updates to /plan skill (dependency validation, implementation spec generation). Agent Organizer coordinates build phase.

**Tech Stack:** Claude Code plugin (markdown-based), Git worktrees, YAML for state management

---

## Task Overview

| Task | Component | Description |
|------|-----------|-------------|
| 1 | workspace-prepare skill | Create isolated worktree with environment setup |
| 2 | workspace-cleanup skill | Remove worktree when feature completes |
| 3 | /plan skill update | Add feature grouping to tasks.yaml structure |
| 4 | /plan skill update | Add dependency cycle validation |
| 5 | /plan skill update | Add implementation spec generation |
| 6 | Agent Organizer update | Add build coordination responsibilities |
| 7 | /build skill | Create main build orchestration skill |
| 8 | /build command | Create command shortcut |
| 9 | README update | Document new /build workflow |

---

## Task 1: workspace-prepare Skill

**Files:**
- Create: `skills/workspace-prepare/SKILL.md`

**Step 1: Create skill directory**

```bash
mkdir -p skills/workspace-prepare
```

**Step 2: Write the skill file**

```markdown
---
name: workspace-prepare
description: "Create isolated git worktree with full environment setup for a feature"
---

# workspace-prepare - Create Feature Worktree

## Overview

Creates an isolated git worktree for a feature with full environment setup and verification.

## Input

Called by `/build` with:

```yaml
feature_id: user-auth
branch: feature/user-auth
base_branch: main
project_root: /path/to/project
```

## Process

### 1. Check Existing Worktree

```bash
# Check if worktree already exists (resume support)
git worktree list | grep "feature/$FEATURE_ID"
```

If exists: Return existing path (resume scenario)

### 2. Create Worktree

```bash
# Determine worktree location
WORKTREE_PATH="$PROJECT_ROOT/.worktrees/$FEATURE_ID"

# Create worktree with new branch from base
git worktree add "$WORKTREE_PATH" -b "$BRANCH" "$BASE_BRANCH"
```

### 3. Run Environment Setup

Auto-detect and run setup based on project files:

```bash
cd "$WORKTREE_PATH"

# Node.js
if [ -f package.json ]; then
  npm install
fi

# Python
if [ -f requirements.txt ]; then
  pip install -r requirements.txt
elif [ -f pyproject.toml ]; then
  poetry install
fi

# Go
if [ -f go.mod ]; then
  go mod download
fi

# Rust
if [ -f Cargo.toml ]; then
  cargo build
fi
```

### 4. Verify Environment

Run initial verification:

```bash
# Build (if applicable)
npm run build 2>/dev/null || cargo build 2>/dev/null || go build ./... 2>/dev/null || true

# Run tests (smoke test)
npm test 2>/dev/null || pytest 2>/dev/null || go test ./... 2>/dev/null || cargo test 2>/dev/null || true
```

Report any failures but don't block.

### 5. Report Result

```yaml
success: true
worktree_path: /path/to/project/.worktrees/user-auth
branch: feature/user-auth
setup_completed:
  - npm install
  - npm run build
tests_passed: true
```

## Error Handling

- If `git worktree add` fails: Report error, suggest manual cleanup
- If setup fails: Report which step failed, continue anyway
- If tests fail: Report failures, ask whether to proceed

## Output

Returns to `/build`:

```yaml
success: true|false
worktree_path: string
error: string (if failed)
```
```

**Step 3: Verify file exists**

```bash
cat skills/workspace-prepare/SKILL.md | head -5
```

Expected: Shows frontmatter with `name: workspace-prepare`

**Step 4: Commit**

```bash
git add skills/workspace-prepare/SKILL.md
git commit -m "feat: add workspace-prepare skill

Creates isolated git worktrees for features with:
- Auto-detection of project type
- Environment setup (npm, pip, cargo, go)
- Initial build and test verification"
```

---

## Task 2: workspace-cleanup Skill

**Files:**
- Create: `skills/workspace-cleanup/SKILL.md`

**Step 1: Create skill directory**

```bash
mkdir -p skills/workspace-cleanup
```

**Step 2: Write the skill file**

```markdown
---
name: workspace-cleanup
description: "Remove git worktree when feature work is complete"
---

# workspace-cleanup - Remove Feature Worktree

## Overview

Removes a git worktree after feature completion, with safety checks for uncommitted changes.

## Input

Called by `/build` with:

```yaml
feature_id: user-auth
worktree_path: /path/to/project/.worktrees/user-auth
delete_branch: false  # Keep branch if PR created
```

## Process

### 1. Safety Checks

```bash
cd "$WORKTREE_PATH"

# Check for uncommitted changes
git status --porcelain
```

If changes found:
- Warn: "Worktree has uncommitted changes"
- Ask: "Discard changes and remove? (y/n)"
- If no: Abort cleanup

### 2. Return to Main Worktree

```bash
cd "$PROJECT_ROOT"
```

### 3. Remove Worktree

```bash
git worktree remove "$WORKTREE_PATH"
```

If fails (e.g., files open):
```bash
git worktree remove --force "$WORKTREE_PATH"
```

### 4. Optionally Delete Branch

If `delete_branch: true` and branch was merged:

```bash
git branch -d "$BRANCH"
```

If not merged, use `-D` with warning.

### 5. Update Build State

Remove worktree entry from `docs/office/build-state.yaml`.

## Output

```yaml
success: true
removed_path: /path/to/project/.worktrees/user-auth
branch_deleted: false
```

## Error Handling

- If worktree doesn't exist: Return success (idempotent)
- If removal fails: Report error, suggest `git worktree remove --force`
- If branch delete fails: Report but don't fail overall cleanup
```

**Step 3: Verify file exists**

```bash
cat skills/workspace-cleanup/SKILL.md | head -5
```

Expected: Shows frontmatter with `name: workspace-cleanup`

**Step 4: Commit**

```bash
git add skills/workspace-cleanup/SKILL.md
git commit -m "feat: add workspace-cleanup skill

Removes git worktrees after feature completion with:
- Safety check for uncommitted changes
- Optional branch deletion
- Build state cleanup"
```

---

## Task 3: Update /plan Skill - Feature Grouping

**Files:**
- Modify: `skills/plan/SKILL.md`

**Step 1: Read current file**

```bash
cat skills/plan/SKILL.md
```

**Step 2: Add feature grouping to tasks.yaml structure**

After the existing "Output Generation" section (around line 73), update the tasks.yaml format:

Find the section that describes tasks.yaml output and replace with enhanced structure showing feature grouping:

```markdown
**`tasks.yaml`** (machine-readable):

```yaml
features:
  - id: user-auth
    name: User Authentication
    branch: feature/user-auth
    depends_on: []  # Feature-level dependencies
    tasks:
      - id: auth-1
        title: Create user model
        agent: backend-engineer
        depends_on: []  # Task-level dependencies within feature
        acceptance_criteria:
          - User model with required fields
          - Migration runs successfully
      - id: auth-2
        title: Build login API
        agent: backend-engineer
        depends_on: [auth-1]

  - id: dashboard
    name: Dashboard
    branch: feature/dashboard
    depends_on: [user-auth]  # Waits for user-auth to merge
    tasks:
      - id: dash-1
        title: Create dashboard layout
        agent: frontend-engineer
```

Key structure:
- Tasks grouped under features
- Feature-level `depends_on` controls parallel execution
- Task-level `depends_on` controls order within feature
- Each feature maps to one branch and one worktree
```

**Step 3: Verify changes**

```bash
grep -A 5 "features:" skills/plan/SKILL.md
```

Expected: Shows new feature-grouped structure

**Step 4: Commit**

```bash
git add skills/plan/SKILL.md
git commit -m "feat(plan): add feature grouping to tasks.yaml

Tasks now grouped by feature with:
- Feature-level dependencies for parallel execution
- Task-level dependencies within features
- Branch mapping per feature"
```

---

## Task 4: Update /plan Skill - Dependency Validation

**Files:**
- Modify: `skills/plan/SKILL.md`

**Step 1: Add validation step after task assignment**

After "5. Agent Organizer: Assign Tasks" section, add new section:

```markdown
### 6. Dependency Validation

Agent Organizer validates the dependency graph:

**Checks performed:**
1. No cycles in feature dependencies
2. No cycles in task dependencies (within each feature)
3. All referenced dependencies exist
4. No self-dependencies

**Algorithm:**
```
For each dependency level (features, then tasks):
  Build directed graph: node → depends_on nodes
  Run topological sort
  If cycle detected → Error with cycle path
```

**On validation failure:**

```
❌ Dependency cycle detected in features:
   dashboard → user-auth → settings → dashboard

Please restructure to break the cycle.
```

Agent Organizer asks user to resolve before proceeding.

**On validation success:**

```
✓ Dependency graph validated
  - 5 features, 0 cycles
  - Execution order: user-auth → [settings, api-layer] → dashboard → admin
```
```

**Step 2: Renumber subsequent sections**

Update "6. Output Generation" to "7. Output Generation" and "7. User Review" to "8. User Review".

**Step 3: Verify changes**

```bash
grep "Dependency Validation" skills/plan/SKILL.md
```

Expected: Shows the new section header

**Step 4: Commit**

```bash
git add skills/plan/SKILL.md
git commit -m "feat(plan): add dependency cycle validation

Validates dependency graph before finalizing plan:
- Detects cycles in feature dependencies
- Detects cycles in task dependencies
- Reports execution order on success"
```

---

## Task 5: Update /plan Skill - Implementation Spec

**Files:**
- Modify: `skills/plan/SKILL.md`

**Step 1: Add implementation spec generation step**

After the dependency validation section, add:

```markdown
### 7. Implementation Spec Generation

Team Lead generates detailed implementation spec with TDD steps.

**Output file:** `docs/office/05-implementation-spec.md`

**Format for each task:**

```markdown
### Task [id]: [title]

**Files:**
- Create: `exact/path/to/file.py`
- Modify: `exact/path/to/existing.py:123-145`
- Test: `tests/exact/path/to/test.py`

**Step 1: Write failing test**

\`\`\`python
def test_specific_behavior():
    result = function(input)
    assert result == expected
\`\`\`

**Step 2: Run test to verify failure**

Run: `pytest tests/path/test.py::test_name -v`
Expected: FAIL with "function not defined"

**Step 3: Write minimal implementation**

\`\`\`python
def function(input):
    return expected
\`\`\`

**Step 4: Run test to verify pass**

Run: `pytest tests/path/test.py::test_name -v`
Expected: PASS

**Step 5: Commit**

\`\`\`bash
git add tests/path/test.py src/path/file.py
git commit -m "feat: add specific feature"
\`\`\`
```

**Principles:**
- DRY, KISS, YAGNI - no over-engineering
- TDD - test first, always
- Atomic commits - one task, one commit
- Exact paths - no ambiguity
- Complete code - never "add validation logic here"
- Each step is 2-5 minutes of work
```

**Step 2: Update files created list**

Update the "Files Created" section to include:

```markdown
## Files Created

```
docs/
  office/
    plan.md
    tasks.yaml
    05-implementation-spec.md  # NEW
    session.yaml (updated)
```
```

**Step 3: Verify changes**

```bash
grep "implementation-spec" skills/plan/SKILL.md
```

Expected: Shows references to implementation spec

**Step 4: Commit**

```bash
git add skills/plan/SKILL.md
git commit -m "feat(plan): add TDD implementation spec generation

Generates detailed implementation spec with:
- Exact file paths for each task
- Complete code blocks (not placeholders)
- TDD cycle: write test → verify fail → implement → verify pass → commit
- 2-5 minute granular steps"
```

---

## Task 6: Update Agent Organizer

**Files:**
- Modify: `agents/agent-organizer.md`

**Step 1: Read current file**

```bash
cat agents/agent-organizer.md
```

**Step 2: Add build coordination responsibilities**

Add new section after "War Room Coordination":

```markdown
### Build Coordination

During `/build`, orchestrate the agent pool:

**Startup:**
- Verify plan files exist (tasks.yaml, 05-implementation-spec.md)
- Check for existing build-state.yaml (resume support)
- Ask user for completion policy and retry limit
- Initialize build-state.yaml

**Main loop:**
- Track feature status (pending, in_progress, completed, failed)
- Spawn workspace:prepare for ready features
- Dispatch tasks to domain-matched agents
- Monitor step-level progress
- Handle failures (retry with context, escalate after limit)
- Apply completion policy when feature done
- Trigger workspace:cleanup after merge/PR

**Announcements:**
- "Starting feature [name]... Creating worktree..."
- "[Agent] is working on [task]... (Step N/5)"
- "Feature [name] complete. [Applying policy]..."
- "Task [id] failed. Retrying with error context... (Attempt N/M)"
- "Build complete! [N] features, [M] tasks, [T] time"
```

**Step 3: Update session states**

Add to the "Session States" section:

```markdown
- `build_in_progress` - Build phase active
- `build_complete` - Build phase done
```

**Step 4: Verify changes**

```bash
grep "Build Coordination" agents/agent-organizer.md
```

Expected: Shows the new section header

**Step 5: Commit**

```bash
git add agents/agent-organizer.md
git commit -m "feat(agent-organizer): add build coordination

Agent Organizer now coordinates /build phase:
- Manages agent pool and task queue
- Tracks step-level progress
- Handles retries and escalation
- Applies completion policies"
```

---

## Task 7: Create /build Skill

**Files:**
- Create: `skills/build/SKILL.md`

**Step 1: Create skill directory**

```bash
mkdir -p skills/build
```

**Step 2: Write the skill file**

```markdown
---
name: build
description: "Execute implementation plan with agent pool in isolated worktrees. Features run in parallel, agents pick tasks by domain."
---

# /build - Execute Implementation Plan

## Overview

The `/build` skill executes the implementation plan from `/plan` using an agent pool. Each feature gets an isolated worktree, and domain-specialized agents pick up tasks from a queue.

## Prerequisites

Requires completed `/plan` session with:
- `docs/office/tasks.yaml` (feature-grouped structure)
- `docs/office/05-implementation-spec.md` (TDD steps)
- `docs/office/session.yaml` with `status: plan_complete`

## Startup

### 1. Session Validation (Agent Organizer)

Check session state:
- If `status != plan_complete`: "Run /plan first to create implementation plan."
- If tasks.yaml missing: "Missing tasks.yaml. Run /plan to complete planning."
- If implementation-spec missing: "Missing implementation spec. Run /plan to complete planning."
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

```
While features remain incomplete:

  1. Find ready features:
     - Status is 'pending'
     - All depends_on features are 'completed'

  2. For each ready feature (in parallel):
     a. Agent Organizer announces: "Starting feature [name]..."
     b. Call workspace:prepare skill
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

  5. On step completion:
     - Update build-state.yaml (step-level)
     - If step 5 done → task complete
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
     - Call workspace:cleanup skill
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
```

## Files Created/Modified

```
docs/
  office/
    build-state.yaml (created)
    session.yaml (updated)
```
```

**Step 3: Verify file exists**

```bash
cat skills/build/SKILL.md | head -10
```

Expected: Shows frontmatter with `name: build`

**Step 4: Commit**

```bash
git add skills/build/SKILL.md
git commit -m "feat: add /build skill

Execute implementation plans with:
- Parallel feature execution in isolated worktrees
- Agent pool with domain specialization
- Step-level progress tracking
- Configurable completion policies (auto-merge, PR, checkpoint)
- Retry with error context, escalation after limit"
```

---

## Task 8: Create /build Command

**Files:**
- Create: `commands/build.md`

**Step 1: Write the command file**

```markdown
---
description: "Execute implementation plan with agent pool in isolated worktrees"
---

Invoke the office:build skill and follow it exactly as presented to you.
```

**Step 2: Verify file exists**

```bash
cat commands/build.md
```

Expected: Shows command definition

**Step 3: Commit**

```bash
git add commands/build.md
git commit -m "feat: add /build command shortcut"
```

---

## Task 9: Update README

**Files:**
- Modify: `README.md`

**Step 1: Read current README**

```bash
cat README.md
```

**Step 2: Add /build documentation**

After the `/plan` section, add:

```markdown
### /build - Build Phase

After planning is complete:

```
/build
```

Configure at startup:
- **Completion policy:** auto-merge | pr | checkpoint
- **Retry limit:** default 3

The build phase:
1. Creates isolated worktrees per feature
2. Agents pick tasks from queue (domain-matched)
3. Each task follows TDD steps from implementation spec
4. Applies completion policy when feature done
5. Tracks progress in `docs/office/build-state.yaml`

Produces:
- Working code in feature branches
- Merged features or pull requests (based on policy)
```

**Step 3: Update the "The Team" table**

Add note about build roles:

```markdown
| Agent | Role |
|-------|------|
| ... existing rows ... |

*During /build, Backend Engineer, Frontend Engineer, UI/UX Expert, Data Engineer, Automation Developer, and DevOps execute tasks in their domains.*
```

**Step 4: Verify changes**

```bash
grep "/build" README.md
```

Expected: Shows /build documentation

**Step 5: Commit**

```bash
git add README.md
git commit -m "docs: add /build command documentation"
```

---

## Final Verification

After all tasks complete:

```bash
# Verify all files created
ls -la skills/workspace-prepare/
ls -la skills/workspace-cleanup/
ls -la skills/build/
ls -la commands/build.md

# Verify git log
git log --oneline -10
```

Expected: 9 commits for the feature

---

## Summary

| Task | Files | Commit Message |
|------|-------|----------------|
| 1 | skills/workspace-prepare/SKILL.md | feat: add workspace-prepare skill |
| 2 | skills/workspace-cleanup/SKILL.md | feat: add workspace-cleanup skill |
| 3 | skills/plan/SKILL.md | feat(plan): add feature grouping |
| 4 | skills/plan/SKILL.md | feat(plan): add dependency validation |
| 5 | skills/plan/SKILL.md | feat(plan): add implementation spec |
| 6 | agents/agent-organizer.md | feat(agent-organizer): add build coordination |
| 7 | skills/build/SKILL.md | feat: add /build skill |
| 8 | commands/build.md | feat: add /build command shortcut |
| 9 | README.md | docs: add /build command documentation |
