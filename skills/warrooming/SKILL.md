---
name: warrooming
description: "Use after /imagine completes to create an executable implementation plan (War Room phase)."
---

# War Room Planning

Transform design documents into an executable implementation plan.

**Announce at start:** "I'm using the warrooming skill to create the implementation plan."

## Prerequisites

Check `docs/office/session.yaml`:
- If `status` is not `imagine_complete`: Stop and say "Run /imagine first."

## Step 1: Project Manager Creates Plan

**Do NOT read design documents into main context.** The agent reads files directly.

```
Task tool:
  subagent_type: office:project-manager
  prompt: |
    # Project Manager: Create Implementation Plan

    ## Read These Files (extract key sections only)

    - `docs/office/01-vision-brief.md` → Problem, Vision, Key Capabilities
    - `docs/office/02-prd.md` → Feature Priority table
    - `docs/office/04-system-design.md` → Technology Stack table

    ## Task

    Create a phased implementation plan (4-6 phases).
    Each phase needs: Goal, Milestone, Dependencies, Key Tasks.

    Write the plan to `docs/office/plan.md` using the Write tool.
```

## Step 2: Team Lead Creates Tasks

**This must complete before Step 3.**

```
Task tool:
  subagent_type: office:team-lead
  prompt: |
    # Team Lead: Create Task Breakdown

    ## Read These Files

    - `docs/office/plan.md` - The implementation plan
    - `docs/office/02-prd.md` - User Stories section

    ## Task

    Create tasks.yaml with tasks to fully implement the plan.
    Each task: id, description, assigned_agent, dependencies, acceptance_criteria.
    Keep it focused - no TDD steps here.

    Write to `docs/office/tasks.yaml` using the Write tool.
```

## Step 3: DevOps + Parallel Spec Generation (Background Agents)

**After Step 2 completes**, run DevOps and N Team Leads in parallel as **background agents**.

> **Why background agents?** Each spec agent generates 20-50k tokens of output. Running them in the foreground would overflow the context window. Background agents write files independently and keep their output separate.

### 3a: Extract Phases

Run this bash command to get phases from plan.md:

```bash
grep "^### Phase" docs/office/plan.md
```

Parse the output to get:
- Phase count (N)
- Phase names (e.g., "Project Setup", "Backend API", "Frontend UI")

Convert names to snake_case for folders (e.g., `project_setup`, `backend_api`).

### 3b: Dispatch Background Agents

In a **SINGLE message**, dispatch N+1 Task tools with `run_in_background: true`:

**DevOps (1 background agent):**
```
Task tool:
  subagent_type: office:devops
  run_in_background: true
  prompt: |
    # DevOps: Environment Setup

    ## Context

    Read the tech stack from `docs/office/04-system-design.md`.
    Read the current plan from `docs/office/plan.md`.

    ## Task

    Add an environment setup section to the plan: Prerequisites, Local Setup, Env Vars, CI/CD, Deployment.
    Be specific to the tech stack.

    Use the Edit tool to append your "## Environment Setup" section to `docs/office/plan.md`.
```

**Team Lead per Phase (N background agents):**
```
Task tool:
  subagent_type: office:team-lead
  run_in_background: true
  prompt: |
    # Team Lead: Generate Implementation Spec for Phase {N}

    ## Your Assignment

    Phase: {phase_number} - {phase_name}
    Output: Create `spec/phase_{N}_{snake_name}/spec.md`

    ## Context (Read These Files)

    - `docs/office/plan.md` - Overall implementation plan
    - `docs/office/tasks.yaml` - All tasks (write specs for YOUR phase only)
    - `docs/office/04-system-design.md` - Architecture and naming conventions

    ## Task

    1. Create the folder: `spec/phase_{N}_{snake_name}/`
    2. Write `spec.md` with TDD implementation steps for EVERY task in Phase {N}
    3. Each task needs: Files, Step 1-5 (test → fail → implement → pass → commit)
    4. Use exact file paths, exact code - no placeholders like "add logic here"
    5. Reference other phases' tasks when needed (you can see all tasks)

    ## Spec Format

    ```markdown
    # Phase {N}: {Phase Name} - Implementation Spec

    ## Task {task-id}: {task title}

    **Files:**
    - Create: `exact/path/to/file.ts`
    - Modify: `exact/path/to/existing.ts`
    - Test: `tests/exact/path/test.ts`

    **Step 1: Write failing test**
    ```typescript
    // Full test code here
    ```

    **Step 2: Run test, verify failure**
    Run: `npm test -- --grep "test name"`
    Expected: FAIL with "specific error"

    **Step 3: Implement**
    ```typescript
    // Full implementation code here
    ```

    **Step 4: Run test, verify pass**
    Run: `npm test -- --grep "test name"`
    Expected: PASS

    **Step 5: Commit**
    `git commit -m "feat: description"`
    ```

    ## Quality Checks

    - Every task in Phase {N} from tasks.yaml has a spec entry
    - Code is complete and copy-pasteable
    - File paths match the project structure from system design
```

### 3c: Wait for Completion (Context-Lean)

**CRITICAL: Do NOT pull agent output into main context.**

Each background agent returns a `task_id`. Wait for completion without retrieving verbose output:

```
For each agent task_id:
  TaskOutput tool:
    task_id: <agent_id>
    block: true
    timeout: 300000  # 5 minutes per agent
```

The TaskOutput result confirms completion but **do not store or process the detailed output**. The agents already wrote their files directly.

### 3d: Verify Files (Not Agent Output)

Check that spec files exist - don't read their contents:

```bash
# Count spec files
ls spec/phase_*/spec.md 2>/dev/null | wc -l

# Check DevOps section was added
grep -q "## Environment Setup" docs/office/plan.md && echo "DevOps: OK" || echo "DevOps: MISSING"
```

### 3e: Handle Failures

If any spec file is missing:

1. **Identify which phase failed** by checking which `spec/phase_N_*/spec.md` doesn't exist
2. **Retry ONLY the failed phase** - dispatch a single background agent for that phase
3. **Do NOT re-read successful specs** - they're already on disk

```
# Retry example for failed Phase 2:
Task tool:
  subagent_type: office:team-lead
  run_in_background: true
  prompt: |
    # RETRY: Generate Implementation Spec for Phase 2
    [Same prompt as original, for the specific failed phase]
```

After retry, verify again with `ls`. If still failing after 2 retries, report error and continue with available specs.

### 3f: Report Results

Report status table (do NOT include file contents):

```markdown
## Spec Generation Results

| Phase | Status | File |
|-------|--------|------|
| 1. Project Setup | ✓ | spec/phase_1_project_setup/spec.md |
| 2. Backend API | ✓ | spec/phase_2_backend_api/spec.md |
| 3. Frontend UI | ✓ | spec/phase_3_frontend_ui/spec.md |
| DevOps | ✓ | docs/office/plan.md (env section) |
```

### 3g: Extract Required Permissions

Extract shell command prefixes from generated specs for build-time permission priming.

**Run extraction command:**

```bash
# Extract unique command prefixes from all bash code blocks in specs
grep -hE '^\s*(npm|npx|yarn|pnpm|git|node|cargo|go|python|pip|pytest|make|tsc|jest|vitest)\b' spec/phase_*/spec.md 2>/dev/null | \
  sed 's/^\s*//' | cut -d' ' -f1 | sort -u
```

**Fallback inference from project files (if no specs or empty result):**

```bash
# Detect from project config files
[ -f package.json ] && echo "npm"
[ -f yarn.lock ] && echo "yarn"
[ -f pnpm-lock.yaml ] && echo "pnpm"
[ -f Cargo.toml ] && echo "cargo"
[ -f go.mod ] && echo "go"
[ -f requirements.txt ] && echo "pip" && echo "python"
[ -f pyproject.toml ] && echo "pip" && echo "python"
```

**Add to tasks.yaml:**

Use sed to insert `required_permissions` at the top of tasks.yaml:

```bash
# Get the extracted permissions as a list
PERMS=$(grep -hE '^\s*(npm|npx|yarn|pnpm|git|node|cargo|go|python|pip|pytest|make|tsc|jest|vitest)\b' spec/phase_*/spec.md 2>/dev/null | sed 's/^\s*//' | cut -d' ' -f1 | sort -u)

# Create YAML list format
YAML_PERMS=$(echo "$PERMS" | sed 's/^/  - /' | tr '\n' '\n')

# Prepend to tasks.yaml
{
  echo "required_permissions:"
  echo "$PERMS" | sed 's/^/  - /'
  echo ""
  cat docs/office/tasks.yaml
} > docs/office/tasks.yaml.tmp && mv docs/office/tasks.yaml.tmp docs/office/tasks.yaml
```

## Step 4: Finalize

### 4a: Final Validation

Verify spec count matches phase count (already done in 3d, just confirm):

```bash
ls spec/phase_*/spec.md | wc -l
```

### 4b: Update Session and Commit

1. Update `docs/office/session.yaml`: status → `plan_complete`
2. Commit all artifacts:
   ```bash
   git add docs/office/ spec/ && git commit -m "docs(office): complete warroom phase with implementation specs"
   ```
3. Say: "War Room complete! Run /build when ready."

---

## Context Management Summary

This skill stays atomic (single session) by:
- **Main context never reads design docs** - agents read files directly
- **Steps 1-2**: Foreground agents (PM, Team Lead) - small output, acceptable in context
- **Step 3**: Background agents for spec generation - output stays out of main context
- **Step 4**: File existence checks only - never read spec contents into context
