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

## Step 3 & 4: Team Lead and DevOps (Parallel)

**Run these TWO agents in parallel** - dispatch both in a SINGLE message with multiple Task tool calls.

Both depend on Step 2 (plan.md must exist).

### Step 3: Team Lead Creates Tasks

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

### Step 4: DevOps Adds Environment Setup

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

## Step 5: Finalize

1. Update `docs/office/session.yaml`: status → plan_complete
2. Commit: `git add docs/office/ && git commit -m "docs(office): complete warroom phase"`
3. Say: "War Room complete! Run /build when ready."

---

## Note: Implementation Specs

Detailed TDD implementation specs are generated ON-DEMAND during /build phase, not here.
This keeps /warroom fast and focused on planning structure.
