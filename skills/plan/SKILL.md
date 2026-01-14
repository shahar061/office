---
name: plan
description: "Use after /imagine completes to create an executable implementation plan. The War Room agents (Project Manager, Team Lead, DevOps, Agent Organizer) work automatically to produce plan.md and tasks.yaml."
---

# /plan - Create Executable Implementation Plan

## Overview

The `/plan` skill takes the design documents from `/imagine` and produces an executable implementation plan through automated agent collaboration.

## Prerequisites

Requires completed `/imagine` session with:
- `docs/office/01-vision-brief.md`
- `docs/office/02-prd.md`
- `docs/office/03-market-analysis.md`
- `docs/office/04-system-design.md`
- `docs/office/session.yaml` with `status: imagine_complete`

## War Room Process

Unlike `/imagine`, the `/plan` phase is automated. User observes and reviews the final output.

### 1. Session Validation (Agent Organizer)

Check session state:
- If `status != imagine_complete`: "Run /imagine first to create design documents."
- If documents missing: "Missing [document]. Run /imagine to complete design."
- If valid: Announce War Room start

### 2. Project Manager: Define Milestones

Agent Organizer announces: "Project Manager is analyzing documents and defining milestones..."

Project Manager:
- Reviews all four design documents
- Identifies logical implementation phases
- Defines milestone deliverables
- Establishes phase dependencies

### 3. Team Lead: Break Down Tasks

Agent Organizer announces: "Team Lead is breaking down architecture into tasks..."

Team Lead:
- Takes System Design components
- Creates discrete, executable tasks
- Defines task dependencies
- Sets acceptance criteria
- Targets 5-15 minute tasks

### 4. DevOps: Environment Plan

Agent Organizer announces: "DevOps is creating environment setup plan..."

DevOps:
- Defines local dev setup
- Plans CI/CD pipeline
- Specifies infrastructure needs
- Documents deployment strategy

### 5. Agent Organizer: Assign Tasks

Agent Organizer:
- Reviews all tasks
- Assigns each to appropriate agent
- Validates dependency graph
- Produces final tasks.yaml

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

### 8. Output Generation

Produce three files:

**`05-implementation-spec.md`** (detailed TDD steps):
- Generated in step 7 above
- Contains exact file paths, test code, and implementation code for each task
- This is the primary reference for `/build` agents

**`plan.md`** (human-readable summary):
- Phase overview
- Milestones and deliverables
- Task list per phase
- Environment setup instructions
- Risk mitigation

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

### 9. User Review

Agent Organizer presents output:
"Implementation plan complete. Please review plan.md and tasks.yaml.

- [N] phases identified
- [M] tasks created
- Assigned to [agents list]

Want me to adjust anything before we finalize?"

User can request changes. Once approved:
- Update session.yaml: `status: plan_complete`

### 10. Commit Plan Documents

After user approves the plan, commit all documents to git:

```bash
git add docs/office/
git commit -m "docs(office): complete plan phase

Generated plan documents:
- plan.md
- tasks.yaml
- 05-implementation-spec.md
- session.yaml (updated)

Co-Authored-By: Office Plugin <noreply@anthropic.com>"
```

This ensures plan documents are available when `/build` creates worktrees.

## Session State

Update `docs/office/session.yaml`:

```yaml
status: "plan_complete"
plan:
  phases: 4
  tasks: 23
  agents_involved:
    - backend_engineer
    - frontend_engineer
    - devops
```

## Files Created

```
docs/
  office/
    plan.md
    tasks.yaml
    05-implementation-spec.md
    session.yaml (updated)
```

## Next Steps

After `/plan` completes, Agent Organizer offers:
"Plan finalized! When you're ready, /build will execute the tasks."
