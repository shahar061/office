---
name: warrooming
description: "Use after /imagine completes to create an executable implementation plan (War Room phase)."
---

# War Room Planning

Transform design documents into an executable implementation plan using your virtual startup team.

**Announce at start:** "I'm using the warrooming skill to create the implementation plan."

## Prerequisites

Check `docs/office/session.yaml`:
- If `status` is not `imagine_complete`: Stop and say "Run /imagine first."
- If status is valid: Continue.

## Step 1: Gather Context

Read all design documents and store their contents:

```bash
cat docs/office/01-vision-brief.md
cat docs/office/02-prd.md
cat docs/office/03-market-analysis.md
cat docs/office/04-system-design.md
```

You'll use these to fill placeholders in the agent templates.

## Step 2: Dispatch Project Manager

The PM creates the high-level implementation plan.

**Fill the template** at `project-manager-prompt.md` with:
- `{VISION_BRIEF}` - Contents of 01-vision-brief.md
- `{PRD}` - Contents of 02-prd.md
- `{SYSTEM_DESIGN}` - Contents of 04-system-design.md

**Dispatch agent:**
```
Task tool:
  subagent_type: office:project-manager
  prompt: [filled template from project-manager-prompt.md]
```

**Verify output:**
```bash
ls docs/office/plan.md && echo "SUCCESS" || echo "FAILED"
```

If FAILED: Report error and stop.

## Step 3: Dispatch Team Lead

The Team Lead breaks down the plan into granular tasks.

**Fill the template** at `team-lead-prompt.md` with:
- `{PLAN_MD}` - Contents of docs/office/plan.md (just created)
- `{PRD}` - Contents of 02-prd.md
- `{SYSTEM_DESIGN}` - Contents of 04-system-design.md

**Dispatch agent:**
```
Task tool:
  subagent_type: office:team-lead
  prompt: [filled template from team-lead-prompt.md]
```

**Verify outputs:**
```bash
ls docs/office/tasks.yaml docs/office/05-implementation-spec.md && echo "SUCCESS" || echo "FAILED"
```

If FAILED: Report error and stop.

## Step 4: Dispatch DevOps

DevOps adds environment setup and deployment instructions.

**Fill the template** at `devops-prompt.md` with:
- `{SYSTEM_DESIGN}` - Contents of 04-system-design.md
- `{PLAN_MD}` - Current contents of docs/office/plan.md

**Dispatch agent:**
```
Task tool:
  subagent_type: office:devops
  prompt: [filled template from devops-prompt.md]
```

**Verify output:**
```bash
grep -q "Environment Setup" docs/office/plan.md && echo "SUCCESS" || echo "FAILED"
```

## Step 5: Finalize Session

Update `docs/office/session.yaml`:
```yaml
status: plan_complete
current_phase: plan_complete
```

Commit the planning documents:
```bash
git add docs/office/
git commit -m "docs(office): complete warroom phase

Planning documents:
- plan.md
- tasks.yaml
- 05-implementation-spec.md

Co-Authored-By: Claude <noreply@anthropic.com>"
```

## Step 6: Report Completion

List all created files and their line counts:
```bash
wc -l docs/office/plan.md docs/office/tasks.yaml docs/office/05-implementation-spec.md
```

Say: "War Room complete! Review the artifacts, then run /build when ready."
