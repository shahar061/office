---
name: warrooming
description: "Use after /imagine completes to create an executable implementation plan (War Room phase)."
---

# War Room Planning

Transform design documents into an executable implementation plan using your virtual startup team.

**Announce at start:** "I'm using the warrooming skill to create the implementation plan."

**Important:** Subagents are ADVISORS - they analyze and return content. YOU (Claude) write the files.

## Prerequisites

Check `docs/office/session.yaml`:
- If `status` is not `imagine_complete`: Stop and say "Run /imagine first."
- If status is valid: Continue.

## Step 1: Gather Context

Read all design documents:

```bash
cat docs/office/01-vision-brief.md
cat docs/office/02-prd.md
cat docs/office/03-market-analysis.md
cat docs/office/04-system-design.md
```

Store contents for filling agent templates.

## Step 2: Consult Project Manager

The PM analyzes docs and returns the plan content.

**Fill the template** at `project-manager-prompt.md` with:
- `{VISION_BRIEF}` - Contents of 01-vision-brief.md
- `{PRD}` - Contents of 02-prd.md
- `{SYSTEM_DESIGN}` - Contents of 04-system-design.md

**Dispatch advisor:**
```
Task tool:
  subagent_type: office:project-manager
  prompt: [filled template]
```

**After agent returns:** Extract the plan content from the agent's response and use the Write tool to save it:

```
Write tool:
  file_path: docs/office/plan.md
  content: [plan content from agent response]
```

**Verify:**
```bash
ls docs/office/plan.md && echo "SUCCESS"
```

## Step 3: Consult Team Lead

The Team Lead analyzes the plan and returns task breakdown.

**Fill the template** at `team-lead-prompt.md` with:
- `{PLAN_MD}` - Contents of docs/office/plan.md (just created)
- `{PRD}` - Contents of 02-prd.md
- `{SYSTEM_DESIGN}` - Contents of 04-system-design.md

**Dispatch advisor:**
```
Task tool:
  subagent_type: office:team-lead
  prompt: [filled template]
```

**After agent returns:** Extract BOTH outputs and write them:

```
Write tool:
  file_path: docs/office/tasks.yaml
  content: [tasks.yaml content from agent response]

Write tool:
  file_path: docs/office/05-implementation-spec.md
  content: [implementation spec content from agent response]
```

**Verify:**
```bash
ls docs/office/tasks.yaml docs/office/05-implementation-spec.md && echo "SUCCESS"
```

## Step 4: Consult DevOps

DevOps analyzes the stack and returns environment setup content.

**Fill the template** at `devops-prompt.md` with:
- `{SYSTEM_DESIGN}` - Contents of 04-system-design.md
- `{PLAN_MD}` - Current contents of docs/office/plan.md

**Dispatch advisor:**
```
Task tool:
  subagent_type: office:devops
  prompt: [filled template]
```

**After agent returns:** Append the environment section to plan.md:

```
Edit tool:
  file_path: docs/office/plan.md
  old_string: [last line of current plan.md]
  new_string: [last line + environment section from agent response]
```

**Verify:**
```bash
grep -q "Environment Setup" docs/office/plan.md && echo "SUCCESS"
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

```bash
wc -l docs/office/plan.md docs/office/tasks.yaml docs/office/05-implementation-spec.md
```

Say: "War Room complete! Review the artifacts, then run /build when ready."
