---
name: warrooming
description: "Use after /imagine completes to create an executable implementation plan (War Room phase)."
---

# War Room Planning

Transform design documents into an executable implementation plan.

**Announce at start:** "I'm using the warrooming skill to create the implementation plan."

**Important:** Subagents are ADVISORS - they return content. YOU write the files.

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

## Step 2: Consult Project Manager

PM creates the phased implementation plan.

**Dispatch with LEAN context:**
```
Task tool:
  subagent_type: office:project-manager
  prompt: |
    # Project Manager: Create Implementation Plan

    **Your role:** ADVISOR - return content, don't write files.

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

    ## Output

    Return between markers:
    PLAN_CONTENT_START
    [Your plan.md content]
    PLAN_CONTENT_END
```

**After agent returns:** Write to `docs/office/plan.md`

## Step 3: Consult Team Lead

Team Lead breaks plan into executable tasks.

**Dispatch with LEAN context:**
```
Task tool:
  subagent_type: office:team-lead
  prompt: |
    # Team Lead: Create Task Breakdown

    **Your role:** ADVISOR - return content, don't write files.

    ## Context

    ### Implementation Plan
    [Paste: The plan.md just created]

    ### User Stories Reference
    [Paste: User Stories section from PRD]

    ## Task

    Create tasks.yaml with 20-30 tasks (not 50).
    Each task: id, description, assigned_agent, dependencies, acceptance_criteria.
    Keep it focused - no TDD steps here.

    ## Output

    Return between markers:
    TASKS_YAML_START
    [Your tasks.yaml content]
    TASKS_YAML_END
```

**After agent returns:** Write to `docs/office/tasks.yaml`

## Step 4: Consult DevOps

DevOps adds environment setup.

**Dispatch with LEAN context:**
```
Task tool:
  subagent_type: office:devops
  prompt: |
    # DevOps: Environment Setup

    **Your role:** ADVISOR - return content, don't write files.

    ## Context

    ### Tech Stack
    [Paste: Technology Stack table from system design]

    ### Infrastructure
    [Paste: Deployment section from system design]

    ## Task

    Create environment setup section: Prerequisites, Local Setup, Env Vars, CI/CD, Deployment.
    Be specific to the tech stack above.

    ## Output

    Return between markers:
    ENV_SECTION_START
    [Your environment section - starts with ## Environment Setup]
    ENV_SECTION_END
```

**After agent returns:** Append to `docs/office/plan.md`

## Step 5: Finalize

1. Update `docs/office/session.yaml`: status → plan_complete
2. Commit: `git add docs/office/ && git commit -m "docs(office): complete warroom phase"`
3. Say: "War Room complete! Run /build when ready."

---

## Note: Implementation Specs

Detailed TDD implementation specs are generated ON-DEMAND during /build phase, not here.
This keeps /warroom fast and focused on planning structure.
