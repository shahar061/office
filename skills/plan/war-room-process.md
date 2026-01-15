# War Room Process - Detailed Steps

This document contains detailed instructions for each step of the /plan phase.

## Step 1: Session Validation (Agent Organizer)

Check session state:
- If `status != imagine_complete`: "Run /imagine first to create design documents."
- If documents missing: "Missing [document]. Run /imagine to complete design."
- If valid: Announce War Room start

## Step 2: Project Manager Creates plan.md

Agent Organizer announces: "Project Manager is creating the implementation plan..."

Spawn Project Manager agent:
- Reviews all four design documents
- Identifies logical implementation phases
- Defines milestone deliverables
- Establishes phase dependencies
- **Writes `docs/office/plan.md`**

**Wait for Project Manager to complete before proceeding.**

## Step 3: Parallel Execution (Team Lead + DevOps)

Agent Organizer announces: "Starting parallel work: Team Lead + DevOps..."

**IMPORTANT: To run agents in parallel, you MUST invoke both Task tools in a SINGLE message.**

Spawn these two agents simultaneously:

**Team Lead** - Break down tasks:
- Takes System Design components
- Creates discrete, executable tasks
- Defines task dependencies
- Sets acceptance criteria
- **Writes `docs/office/tasks.yaml`**
- **Writes `docs/office/05-implementation-spec.md`**

**DevOps** - Environment plan:
- Reads plan.md created by PM
- Adds environment section to plan.md
- Defines local dev setup, CI/CD, deployment
- **Edits `docs/office/plan.md` to add Environment section**

**Example invocation (both in one message):**
```
[Task tool: Team Lead agent]
[Task tool: DevOps agent]
```

Wait for both agents to complete before proceeding to step 4.

## Step 4: Agent Organizer Finalizes

Agent Organizer:
- Reviews all tasks
- Assigns each to appropriate agent
- Validates dependency graph
- Produces final tasks.yaml

## Step 5: Dependency Validation

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

## Step 6: Implementation Spec Generation

**Team Lead MUST write `docs/office/05-implementation-spec.md`** with detailed TDD steps for each task.

**Principles:**
- DRY, KISS, YAGNI - no over-engineering
- TDD - test first, always
- Atomic commits - one task, one commit
- Exact paths - no ambiguity
- Complete code - never "add validation logic here"
- Each step is 2-5 minutes of work

## Step 7: Validate tasks.yaml

After writing `tasks.yaml`, validate it can be parsed by PyYAML:

```bash
python3 -c "import yaml; yaml.safe_load(open('docs/office/tasks.yaml')); print('✓ tasks.yaml is valid YAML')"
```

**On validation failure:**
```
❌ tasks.yaml has YAML syntax error:
   [error message]

Common fix: Quote strings containing {}, [], :, or # characters.
Example: 'Health endpoint returns {"status": "ok"}'
```

If validation fails, fix the syntax error and re-validate before proceeding.

## Step 8: User Review

Agent Organizer presents output:
"Implementation plan complete. Please review plan.md, tasks.yaml, and 05-implementation-spec.md.

- [N] phases identified
- [M] tasks created
- Assigned to [agents list]

Want me to adjust anything before we finalize?"

User can request changes. Once approved:
- Update session.yaml: `status: plan_complete`

## Step 9: Commit Plan Documents

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

## Session State Update

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
