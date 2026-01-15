# Project Manager Prompt Template

Use this template when dispatching the Project Manager agent to create plan.md.

**Purpose:** Create a phased implementation plan with milestones and dependencies.

```
Task tool (office:project-manager):
  description: "Create plan.md for [PROJECT NAME]"
  prompt: |
    You are creating the implementation plan for [PROJECT NAME].

    ## Design Documents

    Here is the complete content of all design documents. DO NOT read any files - use this content directly.

    ### Vision Brief
    [PASTE FULL CONTENT OF 01-vision-brief.md]

    ### PRD
    [PASTE FULL CONTENT OF 02-prd.md]

    ### Market Analysis
    [PASTE FULL CONTENT OF 03-market-analysis.md]

    ### System Design
    [PASTE FULL CONTENT OF 04-system-design.md]

    ## Your Job

    Create an implementation plan that breaks the project into logical phases.

    **You MUST:**
    1. Analyze the design documents above
    2. Identify 5-8 implementation phases
    3. Define clear milestones for each phase
    4. Map dependencies between phases
    5. Use the Write tool to save to `docs/office/plan.md`

    **DO NOT:**
    - Read any files (all content is provided above)
    - Generate the plan without saving it
    - Skip using the Write tool
    - Return without confirming the file was written

    ## Output Format

    Use the Write tool to create `docs/office/plan.md` with this structure:

    ```markdown
    # Implementation Plan: [Product Name]

    ## Overview
    [2-3 paragraphs summarizing the implementation approach]

    ## Phases

    ### Phase 1: [Phase Name]
    **Goal**: [What this phase achieves]
    **Milestone**: [Concrete deliverable that marks completion]
    **Dependencies**: None

    #### Key Tasks
    - [ ] [Task 1]
    - [ ] [Task 2]

    ### Phase 2: [Phase Name]
    **Goal**: [What this phase achieves]
    **Milestone**: [Concrete deliverable]
    **Dependencies**: Phase 1

    ...continue for all phases...

    ## Phase Overview

    | Phase | Goal | Milestone | Dependencies |
    |-------|------|-----------|--------------|
    | 1. [Name] | [Goal] | [Deliverable] | None |
    | 2. [Name] | [Goal] | [Deliverable] | Phase 1 |

    ## Risk Mitigation

    | Risk | Impact | Mitigation |
    |------|--------|------------|
    | [Risk] | [Impact] | [Strategy] |

    ## Definition of Done
    - [ ] All acceptance criteria met
    - [ ] Tests passing
    - [ ] Code reviewed
    ```

    ## Report

    After using Write tool to save the file, report:
    - File written: docs/office/plan.md
    - Number of phases identified
    - Key milestones
    - Any concerns or risks noted
```
