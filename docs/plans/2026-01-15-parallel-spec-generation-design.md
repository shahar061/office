# Design: Parallel Implementation Spec Generation

## Overview

Add a new step to the warrooming skill that generates TDD implementation specs in parallel - one Team Lead agent per phase.

### Problem

Currently, implementation specs are generated on-demand during `/build` phase. This creates delays during build execution and loses the benefit of upfront planning.

### Solution

After Team Lead creates `tasks.yaml`, spawn N Team Lead agents (one per phase) to generate implementation specs in parallel. Each agent writes specs to a dedicated folder.

## Flow Changes

### Current Flow

```
Step 1: Gather Context
Step 2: PM creates plan.md
Step 3 & 4 (parallel): Team Lead creates tasks.yaml + DevOps adds env setup
Step 5: Finalize
```

### New Flow

```
Step 1: Gather Context
Step 2: PM creates plan.md
Step 3: Team Lead creates tasks.yaml
Step 4 (parallel): DevOps adds env setup + N Team Leads generate specs
Step 5: Finalize
```

Key change: Step 3 must complete before spec generation starts (specs depend on tasks.yaml). DevOps and spec generation then run in parallel.

## Phase Extraction

Extract phases from plan.md after Step 3 completes:

```bash
grep "^### Phase" docs/office/plan.md
```

Example output:
```
### Phase 1: Project Setup
### Phase 2: Backend API
### Phase 3: Frontend UI
```

Parse to get phase count and names for agent dispatch.

## Output Structure

```
spec/
  phase_1_project_setup/
    spec.md
  phase_2_backend_api/
    spec.md
  phase_3_frontend_ui/
    spec.md
```

Folder format: `phase_<number>_<snake_case_name>/spec.md`

## Spec Format

Each `spec.md` contains TDD implementation steps for all tasks in that phase:

```markdown
# Phase 1: Project Setup - Implementation Spec

## Task setup-001: Initialize project with Next.js

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `src/app/page.tsx`

**Step 1: Write failing test**
```typescript
test('project builds without errors', async () => {
  const result = await exec('npm run build');
  expect(result.exitCode).toBe(0);
});
```

**Step 2: Run test, verify failure**
Run: `npm test`
Expected: FAIL - no package.json exists

**Step 3: Implement**
[Exact code to write]

**Step 4: Run test, verify pass**
Run: `npm test`
Expected: PASS

**Step 5: Commit**
`git commit -m "feat: initialize Next.js project"`

---

## Task setup-002: Configure database connection
[Same TDD structure...]
```

## Agent Dispatch

In a SINGLE message, invoke N+1 Task tools:

```
Task tool (DevOps):
  subagent_type: office:devops
  prompt: [existing devops prompt]

Task tool (Phase 1):
  subagent_type: office:team-lead
  prompt: |
    # Team Lead: Generate Implementation Spec for Phase 1

    ## Your Assignment

    Phase: 1 - Project Setup
    Output: Create `spec/phase_1_project_setup/spec.md`

    ## Context (Read These Files)

    - `docs/office/plan.md` - Overall implementation plan
    - `docs/office/tasks.yaml` - All tasks (write specs for YOUR phase only)
    - `docs/office/04-system-design.md` - Architecture and naming conventions

    ## Task

    1. Create the folder: `spec/phase_1_project_setup/`
    2. Write `spec.md` with TDD implementation steps for EVERY task in Phase 1
    3. Each task needs: Files, Step 1-5 (test → fail → implement → pass → commit)
    4. Use exact file paths, exact code - no placeholders
    5. Reference other phases' tasks when needed (you can see all tasks)

    ## Quality Checks

    - Every task in Phase 1 from tasks.yaml has a spec entry
    - Code is complete and copy-pasteable
    - File paths match the project structure from system design

Task tool (Phase 2):
  subagent_type: office:team-lead
  prompt: [same template, Phase 2]

Task tool (Phase 3):
  subagent_type: office:team-lead
  prompt: [same template, Phase 3]
```

## Shared Context

Each Team Lead agent receives full read context but isolated write scope:

| Document | Access | Purpose |
|----------|--------|---------|
| `plan.md` | Read | Understand overall architecture |
| `tasks.yaml` | Read | See ALL phases, know dependencies |
| `04-system-design.md` | Read | Canonical naming conventions |
| `spec/phase_N_*/spec.md` | Write | Only their assigned phase |

This prevents misalignment (e.g., Phase 2 referencing correct function names from Phase 1).

## Error Handling

### Collect Results

After parallel dispatch, report status:

```markdown
## Spec Generation Results

| Phase | Status | File |
|-------|--------|------|
| 1. Project Setup | ✓ Complete | spec/phase_1_project_setup/spec.md |
| 2. Backend API | ✓ Complete | spec/phase_2_backend_api/spec.md |
| 3. Frontend UI | ✗ Failed | (retry or skip) |
```

### Retry Strategy

If a phase fails, offer options:
- Retry failed phase only (don't regenerate successful ones)
- Continue to finalize with incomplete specs
- Abort warroom

### Validation

Before finalize, verify all specs exist:

```bash
ls spec/phase_*/spec.md | wc -l
```

Should match phase count from plan.md.

## Performance

| Approach | Time (5 phases) |
|----------|-----------------|
| Sequential | ~8-12 min |
| Parallel | ~2-3 min |

Expected 4-5x speedup.

## Files to Modify

- `skills/warrooming/SKILL.md` - Update flow, add spec generation step

## Files Unchanged

- `agents/team-lead.md` - Already has Write/Edit tools
- Other agents and skills
