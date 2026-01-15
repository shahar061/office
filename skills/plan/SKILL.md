---
name: plan
description: "Use after /imagine completes to create an executable implementation plan."
---

# /plan

## Step 1: Validate Session

Read `docs/office/session.yaml`. If status is not `imagine_complete`, stop and say "Run /imagine first."

## Step 2: Read All Design Documents

Read these files now and store their content:
- `docs/office/01-vision-brief.md`
- `docs/office/02-prd.md`
- `docs/office/03-market-analysis.md`
- `docs/office/04-system-design.md`

You will paste this content into agent prompts.

## Step 3: Spawn Project Manager

**Do NOT proceed to Step 4 until this agent completes.**

Use the Task tool now:

```
Task tool:
  subagent_type: office:project-manager
  prompt: |
    Create the implementation plan for this project.

    ## Design Documents

    [PASTE FULL CONTENT OF ALL 4 DESIGN DOCUMENTS HERE]

    ## Your Job

    1. Analyze the design documents
    2. Identify 5-8 implementation phases
    3. Define milestones for each phase
    4. Use the Write tool to create docs/office/plan.md

    You MUST use the Write tool. Do not just describe what to do.

    Format for plan.md:
    # Implementation Plan: [Name]
    ## Overview
    ## Phases
    ### Phase 1: [Name]
    **Goal**: ...
    **Milestone**: ...
    #### Key Tasks
    - [ ] Task 1
    ### Phase 2: ...
    ## Phase Overview (table)
    ## Risk Mitigation (table)

    When done, confirm: "File written: docs/office/plan.md"
```

## Step 4: After Project Manager Completes

Read the newly created `docs/office/plan.md`.

Then spawn BOTH agents in a SINGLE message:

### Agent 1: Team Lead

Use the Task tool:

```
Task tool:
  subagent_type: office:team-lead
  prompt: |
    Break down the plan into executable tasks.

    ## Plan
    [PASTE FULL CONTENT OF docs/office/plan.md]

    ## System Design
    [PASTE FULL CONTENT OF docs/office/04-system-design.md]

    ## Your Job

    Create TWO files:
    1. docs/office/tasks.yaml - Task manifest
    2. docs/office/05-implementation-spec.md - TDD steps

    You MUST use the Write tool for BOTH files. Do not just describe what to do.

    Format for tasks.yaml:
    version: "1.0"
    project: "[Name]"
    features:
      - id: "feature-1"
        name: "[Name]"
        tasks:
          - id: "task-001"
            description: "[Task]"
            assigned_agent: "backend_engineer"
            acceptance_criteria:
              - "[Criterion]"

    When done, confirm: "Files written: tasks.yaml, 05-implementation-spec.md"
```

### Agent 2: DevOps

Use the Task tool:

```
Task tool:
  subagent_type: office:devops
  prompt: |
    Add environment setup to the plan.

    ## Current Plan
    [PASTE FULL CONTENT OF docs/office/plan.md]

    ## Tech Stack (from System Design)
    [PASTE TECH STACK SECTION]

    ## Your Job

    Use the Edit tool to APPEND to docs/office/plan.md:

    ## Environment Setup
    ### Prerequisites
    ### Local Development
    ### Environment Variables
    ## CI/CD Pipeline
    ## Deployment

    You MUST use the Edit tool. Do not just describe what to do.

    When done, confirm: "File updated: plan.md with environment section"
```

## Step 5: After Both Agents Complete

Validate the outputs:

```bash
ls docs/office/plan.md docs/office/tasks.yaml docs/office/05-implementation-spec.md
python3 -c "import yaml; yaml.safe_load(open('docs/office/tasks.yaml')); print('Valid YAML')"
```

## Step 6: Update Session

Use the Edit tool to update `docs/office/session.yaml`:
- Set `status: plan_complete`
- Set `current_phase: plan_complete`

## Step 7: Present Summary

Show what was created and say: "Plan complete! Review the artifacts, then /build when ready."
