# Build Command Design

## Overview

This design extends the Office plugin with a `/build` command that executes implementation plans using an agent pool, with isolated git worktrees per feature to prevent merge conflicts.

### Components

| Component | Type | Purpose |
|-----------|------|---------|
| `/build` | Command | Execute implementation plan with agent pool |
| `workspace:prepare` | Skill | Create isolated worktree with full environment setup |
| `workspace:cleanup` | Skill | Remove worktree when feature completes |

### Enhancements to Existing Components

- **tasks.yaml** - Restructure to group tasks by feature with dependencies
- **/plan skill** - Add dependency cycle validation + implementation spec generation
- **Agent Organizer** - Extend to coordinate build phase

### Flow

```
/imagine → /plan → /build
                     ↓
           workspace:prepare (per feature)
                     ↓
           agents execute tasks in pool
                     ↓
           workspace:cleanup (on completion)
```

---

## tasks.yaml Structure

### Current (flat list)

```yaml
tasks:
  - id: task-1
    title: Create user model
    ...
```

### New (feature-grouped with dependencies)

```yaml
features:
  - id: user-auth
    name: User Authentication
    branch: feature/user-auth
    depends_on: []
    tasks:
      - id: auth-1
        title: Create user model and migrations
        agent: backend-engineer
        acceptance_criteria:
          - User model with email, password_hash, timestamps
          - Migration runs successfully
      - id: auth-2
        title: Build login/register API endpoints
        agent: backend-engineer
        depends_on: [auth-1]
      - id: auth-3
        title: Create login form component
        agent: frontend-engineer
        depends_on: [auth-2]

  - id: dashboard
    name: Dashboard
    branch: feature/dashboard
    depends_on: [user-auth]
    tasks:
      - id: dash-1
        title: Create dashboard layout
        agent: frontend-engineer
```

### Key Points

- Feature-level `depends_on` controls parallel execution
- Task-level `depends_on` controls order within a feature
- Each feature maps to one branch and one worktree

---

## Implementation Spec Format

**File:** `docs/office/05-implementation-spec.md`

Generated during `/plan` phase by Team Lead with domain agent consultation.

### Principles

- DRY, KISS, YAGNI - no over-engineering
- TDD - test first, always
- Atomic commits - one step, one commit
- Exact paths - no ambiguity

### Task Format

Each task follows a strict TDD cycle with 5 steps (2-5 minutes each):

```markdown
### Task auth-1: User Model

**Files:**
- Create: `src/models/user.py`
- Create: `tests/models/test_user.py`
- Modify: `src/models/__init__.py:15` (add export)

**Step 1: Write failing test**
```python
# tests/models/test_user.py
def test_user_creation_with_email():
    user = User(email="test@example.com", password="secret123")
    assert user.email == "test@example.com"
    assert user.password_hash != "secret123"
```

**Step 2: Run test to verify failure**
```bash
Run: pytest tests/models/test_user.py::test_user_creation_with_email -v
Expected: FAIL - "ImportError: cannot import name 'User'"
```

**Step 3: Write minimal implementation**
```python
# src/models/user.py
import hashlib

class User:
    def __init__(self, email: str, password: str):
        self.email = email
        self.password_hash = hashlib.sha256(password.encode()).hexdigest()
```

**Step 4: Run test to verify pass**
```bash
Run: pytest tests/models/test_user.py::test_user_creation_with_email -v
Expected: PASS
```

**Step 5: Commit**
```bash
git add src/models/user.py tests/models/test_user.py
git commit -m "feat(auth): add User model with email and password hashing"
```
```

### Requirements

- Complete code blocks (never "add validation logic here")
- Exact file paths with line numbers for modifications
- Exact commands with expected output
- Each step is 2-5 minutes of work
- One commit per task (after step 5)

---

## build-state.yaml (Progress Tracking)

**Location:** `docs/office/build-state.yaml`

### Structure

```yaml
build:
  started_at: 2026-01-13T10:30:00Z
  status: in_progress  # pending | in_progress | completed | failed
  completion_policy: checkpoint  # auto-merge | pr | checkpoint
  retry_limit: 3

features:
  - id: user-auth
    status: completed
    branch: feature/user-auth
    worktree: /path/to/project-user-auth
    started_at: 2026-01-13T10:30:00Z
    completed_at: 2026-01-13T11:45:00Z
    merged_at: 2026-01-13T11:50:00Z
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
    worktree: /path/to/project-dashboard
    started_at: 2026-01-13T11:51:00Z
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

### Tracked State

- Global build config (policy, retry limit)
- Per-feature status with worktree path
- Per-task attempts count for retry tracking
- Per-step progress within tasks
- Timestamps for debugging and reporting

---

## Workspace Skills

### workspace:prepare

**Triggers:** Called by `/build` when starting a feature

**Input:**
```yaml
feature_id: user-auth
branch: feature/user-auth
base_branch: main
```

**Actions:**
1. Check if worktree already exists for this feature (resume support)
2. Create worktree: `git worktree add ../project-user-auth -b feature/user-auth`
3. Run setup commands (detected or configured):
   - Node: `npm install` or `yarn install`
   - Python: `pip install -r requirements.txt`
   - Go: `go mod download`
4. Run verification:
   - Build: `npm run build` or equivalent
   - Tests: `npm test` (quick smoke test)
5. Return worktree path or error

**Output:**
```yaml
success: true
worktree_path: /Users/project-user-auth
```

### workspace:cleanup

**Triggers:** Called by `/build` when feature completes (after merge/PR)

**Input:**
```yaml
feature_id: user-auth
worktree_path: /Users/project-user-auth
delete_branch: false  # Keep branch if PR created
```

**Actions:**
1. Verify no uncommitted changes (warn if found)
2. Remove worktree: `git worktree remove ../project-user-auth`
3. Optionally delete branch: `git branch -d feature/user-auth`
4. Update build-state.yaml

---

## /build Command Flow

### Startup

```
User runs: /build

Agent Organizer:
1. Verify docs/office/tasks.yaml exists (from /plan)
2. Verify docs/office/05-implementation-spec.md exists
3. Check for existing build-state.yaml (resume support)
4. Ask user: "Completion policy?" → auto-merge | pr | checkpoint
5. Ask user: "Retry limit?" → default 3
6. Initialize build-state.yaml
```

### Main Loop

```
While features remain:
  1. Find ready features (dependencies met, not started)
  2. For each ready feature (in parallel):
     a. workspace:prepare → create worktree
     b. Add feature's tasks to agent pool queue

  3. Agents pick tasks from queue (domain-matched)
     - Agent receives pointer to task in implementation spec
     - Agent follows steps 1-5 mechanically
     - Each step has verification (expected output)

  4. On step complete:
     - Update build-state.yaml (step-level)
     - If step 5 done → task complete
     - If all tasks done → feature complete

  5. On step failure:
     - Compare actual vs expected output
     - Retry with error context (up to limit)
     - If exhausted → pause, notify user

  6. On feature complete:
     - Apply completion policy (merge/PR/checkpoint)
     - workspace:cleanup
     - Check if blocked features can now start
```

### Completion

```
All features done:
  - Show summary (tasks completed, retries, time)
  - Clean up any remaining state
```

---

## Agent Pool Mechanism

### Domain Mapping

| Agent | Domains (task types) |
|-------|---------------------|
| backend-engineer | api, database, models, migrations |
| frontend-engineer | ui, components, pages, state |
| ui-ux-expert | styling, ux-review |
| data-engineer | data-pipeline, analytics |
| automation-developer | tests, ci-cd, scripts |
| devops | infrastructure, deployment |

### Task Queue

```yaml
queue:
  - task_id: auth-1
    feature_id: user-auth
    agent: backend-engineer
    worktree: /path/to/project-user-auth
    spec_section: "#task-auth-1"
    status: available
  - task_id: dash-1
    feature_id: dashboard
    agent: frontend-engineer
    worktree: /path/to/project-dashboard
    spec_section: "#task-dash-1"
    status: claimed
    claimed_by: frontend-engineer-1
```

### Agent Execution

Each agent runs as a Task subagent:
1. Claims a task from queue (matching their domain)
2. Changes to the feature's worktree
3. Reads task section from implementation spec
4. Follows steps 1-5 mechanically
5. Verifies each step against expected output
6. Reports success or failure with context
7. Returns to pool for next task

### Agent Instructions Template

```markdown
You are working on: Task auth-1 (User Model)
Worktree: /path/to/project-user-auth
Spec file: docs/office/05-implementation-spec.md#task-auth-1

Current step: 3 (Write minimal implementation)

Follow the spec EXACTLY:
1. Read the code block for Step 3
2. Write it to the specified file
3. Report completion

Do not improvise. Do not add extras. Follow the spec.
```

### Parallelism

- Multiple agents can run simultaneously
- Each works in their feature's worktree (no conflicts)
- Agent Organizer monitors progress, updates state

---

## /plan Enhancement: Dependency Validation

### New Step

After Team Lead creates `tasks.yaml`, validate the dependency graph.

### Validation Checks

1. No cycles in feature dependencies
2. No cycles in task dependencies (within features)
3. All referenced dependencies exist
4. No feature depends on itself

### Algorithm

```
For feature dependencies:
  Build directed graph: feature → depends_on features
  Run topological sort
  If cycle detected → Error with cycle path

For task dependencies (per feature):
  Build directed graph: task → depends_on tasks
  Run topological sort
  If cycle detected → Error with cycle path
```

### Error Output

```
Dependency cycle detected in features:
   dashboard → user-auth → settings → dashboard

Please restructure to break the cycle.
```

### Success Output

```
Dependency graph validated
  - 5 features, 0 cycles
  - Execution order: user-auth → [settings, api-layer] → dashboard → admin
```

---

## Failure Handling

### Strategy

Retry with feedback, escalate after N failures (configurable, default 3).

### Flow

```
Step fails:
1. Agent captures actual error output
2. Compares to expected output from spec
3. Reports: "Expected PASS, got FAIL: assertion error on line 12"
4. Retry: Agent reviews implementation, adjusts
5. If still fails after N retries → pause, escalate to user with full context
```

### Context Provided on Escalation

- Task and step that failed
- Expected vs actual output
- All retry attempts and their errors
- Relevant file contents
- Suggestion for manual intervention

---

## Feature Completion Policies

Configurable at `/build` start:

| Policy | Behavior |
|--------|----------|
| auto-merge | Automatically merge feature branch to main |
| pr | Create pull request, wait for approval |
| checkpoint | Pause for human review, user decides |

---

## File Structure

### New/Modified Plugin Files

```
office/
├── agents/
│   └── agent-organizer.md    # Update: add build coordination
├── skills/
│   ├── build/
│   │   └── SKILL.md          # NEW
│   ├── workspace-prepare/
│   │   └── SKILL.md          # NEW
│   └── workspace-cleanup/
│       └── SKILL.md          # NEW
├── commands/
│   └── build.md              # NEW
└── skills/
    └── plan/
        └── SKILL.md          # Update: dependency validation + impl spec
```

### Output Files (User's Project)

```
docs/office/
├── 01-vision-brief.md        # From /imagine
├── 02-prd.md                  # From /imagine
├── 03-market-analysis.md     # From /imagine
├── 04-system-design.md       # From /imagine
├── 05-implementation-spec.md # NEW: From /plan
├── tasks.yaml                # Updated structure
└── build-state.yaml          # NEW: From /build
```

---

## Summary

This design enables:

1. **Parallel feature development** - Multiple features built simultaneously in isolated worktrees
2. **Agent specialization** - Domain experts handle their areas
3. **TDD discipline** - Every task follows test-first with verification
4. **Precise execution** - Implementation spec removes agent guesswork
5. **Robust tracking** - Step-level progress with retry history
6. **Flexible completion** - User controls merge/PR/checkpoint policy
7. **Safe isolation** - Git worktrees prevent merge conflicts
