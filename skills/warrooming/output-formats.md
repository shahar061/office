# Output Formats

This document defines the format specifications for files created during the /plan phase.

## tasks.yaml

Machine-readable task queue for `/build` execution.

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

**Key structure:**
- Tasks grouped under features
- Feature-level `depends_on` controls parallel execution
- Task-level `depends_on` controls order within feature
- Each feature maps to one branch and one worktree

**YAML Safety Rules:**
Always quote strings that contain:
- Curly braces: `{}` → `'Returns {"status": "ok"}'`
- Square brackets: `[]` → `'Array format [1,2,3]'`
- Colons: `:` → `'Time: 12:00'`
- Hash symbols: `#` → `'Issue #123'`

## 05-implementation-spec.md

Detailed TDD steps for each task. Primary reference for `/build` agents.

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

## plan.md

Human-readable implementation summary.

**Structure:**
- Phase overview
- Milestones and deliverables
- Task list per phase
- Environment setup instructions (added by DevOps)
- Risk mitigation

## session.yaml

Session state tracking. Updated after /plan completes:

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

## Files Created/Modified

```
docs/
  office/
    plan.md          (created by Project Manager, edited by DevOps)
    tasks.yaml       (created by Team Lead)
    05-implementation-spec.md  (created by Team Lead)
    session.yaml     (updated by Agent Organizer)
```
