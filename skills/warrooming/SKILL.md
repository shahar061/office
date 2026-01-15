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

## Step 1: Gather Context (Lean)

Read design documents and extract KEY SECTIONS only:

```
From 01-vision-brief.md: The Problem, The Vision, Key Capabilities
From 02-prd.md: User Stories, Feature Priority table
From 04-system-design.md: Technology Stack table, Components list
```

Do NOT pass full documents to agents - only relevant sections.

## Step 2: Project Manager Creates Plan

PM creates the phased implementation plan and writes it directly.

**Dispatch with LEAN context:**
```
Task tool:
  subagent_type: office:project-manager
  prompt: |
    # Project Manager: Create Implementation Plan

    ## Key Context

    ### Vision & Capabilities
    [Paste: Problem, Vision, Key Capabilities from vision brief]

    ### Features to Implement
    [Paste: Feature Priority table from PRD]

    ### Tech Stack
    [Paste: Technology Stack table from system design]

    ## Task

    Create a phased implementation plan (4-6 phases).
    Each phase needs: Goal, Milestone, Dependencies, Key Tasks.

    Write the plan to `docs/office/plan.md` using the Write tool.
```

## Step 3: Team Lead Creates Tasks

Team Lead creates the task breakdown. **This must complete before Step 4.**

```
Task tool:
  subagent_type: office:team-lead
  prompt: |
    # Team Lead: Create Task Breakdown

    ## Context

    Read the implementation plan from `docs/office/plan.md`.
    Read the User Stories from `docs/office/02-prd.md`.

    ## Task

    Create tasks.yaml with as many tasks as needed to fully implement the plan.
    Each task: id, description, assigned_agent, dependencies, acceptance_criteria.
    Keep it focused - no TDD steps here.

    Write to `docs/office/tasks.yaml` using the Write tool.
```

## Step 4: DevOps + Parallel Spec Generation

**After Step 3 completes**, run DevOps and N Team Leads in parallel.

### 4a: Extract Phases

Run this bash command to get phases from plan.md:

```bash
grep "^### Phase" docs/office/plan.md
```

Parse the output to get:
- Phase count (N)
- Phase names (e.g., "Project Setup", "Backend API", "Frontend UI")

Convert names to snake_case for folders (e.g., `project_setup`, `backend_api`).

### 4b: Dispatch in Parallel

In a **SINGLE message**, dispatch N+1 Task tools:

**DevOps (1 agent):**
```
Task tool:
  subagent_type: office:devops
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

**Team Lead per Phase (N agents):**
```
Task tool:
  subagent_type: office:team-lead
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

### 4c: Report Results

After all agents complete, report status:

```markdown
## Spec Generation Results

| Phase | Status | File |
|-------|--------|------|
| 1. Project Setup | ✓ Complete | spec/phase_1_project_setup/spec.md |
| 2. Backend API | ✓ Complete | spec/phase_2_backend_api/spec.md |
| 3. Frontend UI | ✓ Complete | spec/phase_3_frontend_ui/spec.md |
| DevOps | ✓ Complete | docs/office/plan.md (env section) |
```

If any phase failed, offer options:
- Retry failed phase only
- Continue with incomplete specs
- Abort warroom

## Step 5: Finalize

### 5a: Validate Specs

Verify all spec folders exist:

```bash
ls spec/phase_*/spec.md | wc -l
```

Should match phase count from Step 4a.

### 5b: Update Session and Commit

1. Update `docs/office/session.yaml`: status → plan_complete
2. Commit all artifacts:
   ```bash
   git add docs/office/ spec/ && git commit -m "docs(office): complete warroom phase with implementation specs"
   ```
3. Say: "War Room complete! Run /build when ready."
