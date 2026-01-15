---
name: plan
description: "Use after /imagine completes to create an executable implementation plan. The War Room agents (Project Manager, Team Lead, DevOps, Agent Organizer) work automatically to produce plan.md, tasks.yaml, 05-implementation-spec.md, and update session.yaml."
---

# /plan - Create Executable Implementation Plan

## Overview

The `/plan` skill takes design documents from `/imagine` and produces an executable implementation plan through automated agent collaboration.

## Prerequisites

Requires completed `/imagine` session with:
- `docs/office/01-vision-brief.md`
- `docs/office/02-prd.md`
- `docs/office/03-market-analysis.md`
- `docs/office/04-system-design.md`
- `docs/office/session.yaml` with `status: imagine_complete`

## War Room Process

Unlike `/imagine`, the `/plan` phase is automated. User observes and reviews the final output.

**Execute these steps in order using the Task tool:**

### Step 1: Session Validation
Check `docs/office/session.yaml`:
- If `status != imagine_complete`: "Run /imagine first to create design documents."
- If documents missing: "Missing [document]. Run /imagine to complete design."
- If valid: Continue to step 2

### Step 2: Project Manager Creates plan.md
Use Task tool:
```
Task tool: subagent_type="office:project-manager"
prompt="Read the design documents in docs/office/ (01-vision-brief.md through 04-system-design.md). Create docs/office/plan.md with implementation phases, milestones, and deliverables."
```
Wait for completion before step 3.

### Step 3: Parallel Execution (Team Lead + DevOps)
**IMPORTANT:** Invoke BOTH Task tools in a SINGLE message:
```
Task tool: subagent_type="office:team-lead"
prompt="Read docs/office/04-system-design.md and plan.md. Create docs/office/tasks.yaml and docs/office/05-implementation-spec.md with TDD steps for each task."

Task tool: subagent_type="office:devops"
prompt="Read docs/office/plan.md. Add an Environment section covering local dev setup, CI/CD, and deployment."
```
Wait for both to complete before step 4.

### Step 4: Finalize
- Review tasks.yaml for completeness
- Validate no dependency cycles
- Present summary to user

### Step 5: Validate tasks.yaml
```bash
python3 -c "import yaml; yaml.safe_load(open('docs/office/tasks.yaml')); print('✓ tasks.yaml is valid YAML')"
```

### Step 6: User Review
Present output for approval. Once approved, commit:
```bash
git add docs/office/
git commit -m "docs(office): complete plan phase

Generated: plan.md, tasks.yaml, 05-implementation-spec.md, session.yaml

Co-Authored-By: Office Plugin <noreply@anthropic.com>"
```

## Output Files

All files written to `docs/office/`:

| File | Purpose | Agent |
|------|---------|-------|
| `plan.md` | Human-readable phases, milestones, environment | Project Manager + DevOps |
| `tasks.yaml` | Machine-readable task queue | Team Lead |
| `05-implementation-spec.md` | TDD steps for each task | Team Lead |
| `session.yaml` | Updated with `status: plan_complete` | Agent Organizer |

## Reference

For detailed process steps, see: `war-room-process.md`
For output file formats, see: `output-formats.md`

## Next Steps

After `/plan` completes: "Plan finalized! When you're ready, /build will execute the tasks."
