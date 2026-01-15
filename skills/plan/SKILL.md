---
name: plan
description: "Use after /imagine completes to create an executable implementation plan."
---

# /plan - Create Executable Implementation Plan

**Announce:** "I'm using the /plan skill to create an implementation plan."

## Prerequisites

Requires `docs/office/session.yaml` with `status: imagine_complete` and these documents:
- `docs/office/01-vision-brief.md`
- `docs/office/02-prd.md`
- `docs/office/03-market-analysis.md`
- `docs/office/04-system-design.md`

## Execution Steps

### Step 1: Validate
Read `docs/office/session.yaml`. If status is not `imagine_complete`, stop and say "Run /imagine first."

### Step 2: Read All Design Documents
Read ALL 4 design documents now. Store their complete content - you will paste it into agent prompts.

### Step 3: Spawn Project Manager (WAIT FOR COMPLETION)

**CRITICAL: Do NOT proceed to Step 4 until this agent completes and confirms the file was written.**

Call the Task tool with EXACTLY these parameters:

```
subagent_type: "office:project-manager"
description: "Create plan.md for [PROJECT NAME]"
prompt: |
  You are creating the implementation plan.

  ## Design Documents

  [PASTE THE FULL CONTENT OF ALL 4 DESIGN DOCUMENTS HERE]

  ## Your Job

  1. Analyze the design documents above
  2. Identify 5-8 implementation phases
  3. Define clear milestones for each phase
  4. **Use the Write tool to save to `docs/office/plan.md`**

  **YOU MUST USE THE WRITE TOOL. DO NOT just generate content.**

  ## Output Format

  Use Write tool to create `docs/office/plan.md`:

  # Implementation Plan: [Product Name]

  ## Overview
  [2-3 paragraphs]

  ## Phases

  ### Phase 1: [Name]
  **Goal**: [What this achieves]
  **Milestone**: [Deliverable]
  **Dependencies**: None

  #### Key Tasks
  - [ ] Task 1
  - [ ] Task 2

  ### Phase 2: [Name]
  ...continue for all phases...

  ## Phase Overview
  | Phase | Goal | Milestone | Dependencies |
  |-------|------|-----------|--------------|

  ## Risk Mitigation
  | Risk | Impact | Mitigation |

  ## Report
  After writing the file, say: "File written: docs/office/plan.md" and list the phases.
```

**WAIT for this agent to return before proceeding.**

### Step 4: Spawn Team Lead + DevOps (PARALLEL)

**IMPORTANT: Call BOTH Task tools in a SINGLE message.**

First, read `docs/office/plan.md` that was just created. Then spawn both agents:

#### Agent 1: Team Lead

```
subagent_type: "office:team-lead"
description: "Create tasks.yaml and implementation spec"
prompt: |
  You are breaking down the implementation plan into tasks.

  ## Plan Content
  [PASTE THE FULL CONTENT OF docs/office/plan.md HERE]

  ## System Design
  [PASTE THE FULL CONTENT OF docs/office/04-system-design.md HERE]

  ## Your Job

  Create TWO files using the Write tool:
  1. `docs/office/tasks.yaml`
  2. `docs/office/05-implementation-spec.md`

  **YOU MUST USE THE WRITE TOOL FOR BOTH FILES.**

  ## tasks.yaml Format

  ```yaml
  version: "1.0"
  project: "[Name]"
  features:
    - id: "feature-1"
      name: "[Feature]"
      phase: 1
      tasks:
        - id: "task-001"
          description: "[Task]"
          assigned_agent: "backend_engineer"
          dependencies: []
          acceptance_criteria:
            - "[Criterion]"
  ```

  ## 05-implementation-spec.md Format

  # Implementation Specification

  ## Task task-001: [Title]
  **Files:** Create: `src/path/file.ts`, Test: `tests/path/test.ts`
  **Step 1:** Write failing test
  **Step 2:** Implement
  **Step 3:** Verify
  **Step 4:** Commit

  ## Report
  Say: "Files written: tasks.yaml, 05-implementation-spec.md" and list task count.
```

#### Agent 2: DevOps

```
subagent_type: "office:devops"
description: "Add environment setup to plan.md"
prompt: |
  You are adding environment documentation to the plan.

  ## Current Plan
  [PASTE THE FULL CONTENT OF docs/office/plan.md HERE]

  ## System Design (Tech Stack)
  [PASTE THE TECH STACK SECTION FROM 04-system-design.md HERE]

  ## Your Job

  **Use the Edit tool to APPEND to `docs/office/plan.md`**

  Add this section at the END of the file:

  ## Environment Setup

  ### Prerequisites
  - [Runtime] (version)
  - [Package manager]
  - [Database]

  ### Local Development
  ```bash
  git clone [repo]
  cd [project]
  [install command]
  cp .env.example .env
  [dev command]
  ```

  ### Environment Variables
  | Variable | Description | Example |

  ## CI/CD Pipeline
  1. Lint & Type Check
  2. Test
  3. Build
  4. Deploy

  ## Deployment
  - Platform: [Vercel/etc]
  - Production URL: [pattern]

  ## Report
  Say: "File updated: plan.md with environment section"
```

**WAIT for BOTH agents to complete.**

### Step 5: Validate Outputs

Run these commands:
```bash
ls docs/office/plan.md docs/office/tasks.yaml docs/office/05-implementation-spec.md
python3 -c "import yaml; yaml.safe_load(open('docs/office/tasks.yaml')); print('Valid YAML')"
```

### Step 6: Update Session

Update `docs/office/session.yaml` to `status: plan_complete`.

### Step 7: Present Summary

Show what was created and say: "Plan complete! Review the artifacts, then /build when ready."

## Red Flags

**NEVER:**
- Spawn all 3 agents at once (PM must complete FIRST)
- Let agents read files (paste content INTO the prompt)
- Proceed if agent returns without confirming file was written
- Skip the YAML validation
