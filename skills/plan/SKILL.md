---
name: plan
description: "Use after /imagine completes to create an executable implementation plan. The War Room agents (Project Manager, Team Lead, DevOps) work automatically to produce plan.md, tasks.yaml, 05-implementation-spec.md."
---

# /plan - Create Executable Implementation Plan

## Overview

The `/plan` skill takes design documents from `/imagine` and produces an executable implementation plan through automated agent collaboration.

**Announce at start:** "I'm using the /plan skill to create an implementation plan."

## Prerequisites

Requires completed `/imagine` session with:
- `docs/office/01-vision-brief.md`
- `docs/office/02-prd.md`
- `docs/office/03-market-analysis.md`
- `docs/office/04-system-design.md`
- `docs/office/session.yaml` with `status: imagine_complete`

## The Process

```dot
digraph plan_process {
    rankdir=TB;

    "Step 1: Validate session" [shape=box];
    "Valid?" [shape=diamond];
    "Stop - run /imagine first" [shape=box];
    "Step 2: Read all design docs" [shape=box];
    "Step 3: Spawn PM agent (./project-manager-prompt.md)" [shape=box];
    "PM complete?" [shape=diamond];
    "Wait for PM" [shape=box];
    "Step 4: Spawn Team Lead + DevOps in parallel" [shape=box];
    "Both complete?" [shape=diamond];
    "Wait" [shape=box];
    "Step 5: Validate outputs" [shape=box];
    "Step 6: Update session.yaml" [shape=box];
    "Step 7: Present for review" [shape=box];

    "Step 1: Validate session" -> "Valid?";
    "Valid?" -> "Stop - run /imagine first" [label="no"];
    "Valid?" -> "Step 2: Read all design docs" [label="yes"];
    "Step 2: Read all design docs" -> "Step 3: Spawn PM agent (./project-manager-prompt.md)";
    "Step 3: Spawn PM agent (./project-manager-prompt.md)" -> "PM complete?";
    "PM complete?" -> "Wait for PM" [label="no"];
    "Wait for PM" -> "PM complete?";
    "PM complete?" -> "Step 4: Spawn Team Lead + DevOps in parallel" [label="yes"];
    "Step 4: Spawn Team Lead + DevOps in parallel" -> "Both complete?";
    "Both complete?" -> "Wait" [label="no"];
    "Wait" -> "Both complete?";
    "Both complete?" -> "Step 5: Validate outputs" [label="yes"];
    "Step 5: Validate outputs" -> "Step 6: Update session.yaml";
    "Step 6: Update session.yaml" -> "Step 7: Present for review";
}
```

## Step-by-Step Execution

### Step 1: Validate Session
Read `docs/office/session.yaml`:
- If `status != imagine_complete`: Stop. Say "Run /imagine first to create design documents."
- If any design document missing: Stop. Say "Missing [document]. Run /imagine to complete design."
- If valid: Proceed to Step 2.

### Step 2: Read All Design Documents
Read all 4 documents and keep their content for the agent prompts:
- `docs/office/01-vision-brief.md`
- `docs/office/02-prd.md`
- `docs/office/03-market-analysis.md`
- `docs/office/04-system-design.md`

You will paste this content into the agent prompts (agents should NOT read files themselves).

### Step 3: Spawn Project Manager Agent
Dispatch the Project Manager using the template in `./project-manager-prompt.md`.

**CRITICAL:** Wait for this agent to complete and confirm plan.md was written before proceeding.

### Step 4: Spawn Team Lead + DevOps (Parallel)
**IMPORTANT:** Dispatch BOTH agents in a SINGLE message (parallel execution).

Use templates:
- `./team-lead-prompt.md`
- `./devops-prompt.md`

Wait for BOTH to complete before proceeding.

### Step 5: Validate Outputs
Verify all files were created:
```bash
ls docs/office/plan.md docs/office/tasks.yaml docs/office/05-implementation-spec.md
```

Validate YAML syntax:
```bash
python3 -c "import yaml; yaml.safe_load(open('docs/office/tasks.yaml')); print('Valid YAML')"
```

### Step 6: Update session.yaml
Update `docs/office/session.yaml`:
```yaml
status: plan_complete
current_phase: plan_complete
```

### Step 7: Present for Review
Show summary of created artifacts and say: "Plan complete! Review the artifacts, then /build when ready."

## Prompt Templates

- `./project-manager-prompt.md` - Creates plan.md
- `./team-lead-prompt.md` - Creates tasks.yaml and 05-implementation-spec.md
- `./devops-prompt.md` - Adds environment section to plan.md

## Red Flags

**NEVER:**
- Spawn all 3 agents at once (PM must complete first)
- Let agents read design docs themselves (paste content in prompt)
- Proceed if an agent returns without writing files
- Skip YAML validation

**If agent returns with 0 tool uses:**
- The prompt was not explicit enough
- Re-dispatch with clearer instructions to use Write tool
