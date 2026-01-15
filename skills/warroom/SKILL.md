---
name: warroom
description: "Use after /imagine completes to create an executable implementation plan (War Room phase)."
---

# /warroom

**This skill spawns a single orchestrator agent that handles the entire War Room planning process.**

## Step 1: Validate Prerequisites

Read `docs/office/session.yaml`. If status is not `imagine_complete`, stop and say "Run /imagine first."

## Step 2: Spawn War Room Orchestrator

Use the Task tool now:

```
Task tool:
  subagent_type: office:agent-organizer
  prompt: |
    You are orchestrating the /warroom phase. Execute these steps IN ORDER.

    ## STEP A: Read All Design Documents

    Read these 4 files now:
    - docs/office/01-vision-brief.md
    - docs/office/02-prd.md
    - docs/office/03-market-analysis.md
    - docs/office/04-system-design.md

    Store their content - you will need it for the agent prompts.

    ## STEP B: Create plan.md (Project Manager Work)

    You will now do the Project Manager's job directly.

    Use the Write tool to create docs/office/plan.md with this structure:

    # Implementation Plan: [Product Name from Vision Brief]

    ## Overview
    [2-3 paragraphs summarizing the implementation approach based on the PRD and System Design]

    ## Phases

    ### Phase 1: Project Foundation
    **Goal**: Set up project structure, tooling, and CI/CD
    **Milestone**: Running dev server with linting and tests
    **Dependencies**: None

    #### Key Tasks
    - [ ] Initialize project with chosen framework
    - [ ] Configure TypeScript, ESLint, Prettier
    - [ ] Set up database schema
    - [ ] Configure CI/CD pipeline

    ### Phase 2: Core Backend
    **Goal**: Implement core API and data layer
    **Milestone**: All API endpoints functional with tests
    **Dependencies**: Phase 1

    #### Key Tasks
    - [ ] Implement database models
    - [ ] Create API routes
    - [ ] Add authentication if needed
    - [ ] Write integration tests

    ### Phase 3: Core Frontend
    **Goal**: Build main UI components and screens
    **Milestone**: All screens navigable with mock data
    **Dependencies**: Phase 2

    #### Key Tasks
    - [ ] Create page layouts
    - [ ] Build reusable components
    - [ ] Implement state management
    - [ ] Connect to API

    ### Phase 4: Feature Integration
    **Goal**: Connect all features end-to-end
    **Milestone**: Complete user flows working
    **Dependencies**: Phase 3

    ### Phase 5: Polish & Launch
    **Goal**: Final testing, optimization, deployment
    **Milestone**: Production deployment
    **Dependencies**: Phase 4

    ## Phase Overview

    | Phase | Goal | Milestone | Dependencies |
    |-------|------|-----------|--------------|
    | 1. Foundation | Project setup | Dev server running | None |
    | 2. Backend | Core API | APIs functional | Phase 1 |
    | 3. Frontend | Main UI | Screens working | Phase 2 |
    | 4. Integration | End-to-end | User flows complete | Phase 3 |
    | 5. Launch | Deploy | Production live | Phase 4 |

    ## Risk Mitigation

    | Risk | Impact | Mitigation |
    |------|--------|------------|
    | Scope creep | High | Strict MVP focus |
    | Tech issues | Medium | Proven stack choices |

    Customize this template based on the actual project from the design docs.

    You MUST use the Write tool. Do not just describe what to do.

    After writing, confirm: "plan.md created"

    ## STEP C: Create tasks.yaml (Team Lead Work)

    Now do the Team Lead's job directly.

    Use the Write tool to create docs/office/tasks.yaml:

    version: "1.0"
    project: "[Product Name]"
    features:
      - id: "setup"
        name: "Project Setup"
        phase: 1
        tasks:
          - id: "setup-001"
            description: "Initialize project with framework"
            assigned_agent: "frontend_engineer"
            dependencies: []
            acceptance_criteria:
              - "Project runs with dev command"
              - "TypeScript configured"

          - id: "setup-002"
            description: "Configure database connection"
            assigned_agent: "backend_engineer"
            dependencies: ["setup-001"]
            acceptance_criteria:
              - "Database connects successfully"
              - "Migrations run"

      - id: "backend"
        name: "Backend Implementation"
        phase: 2
        tasks:
          - id: "backend-001"
            description: "Create database schema"
            assigned_agent: "backend_engineer"
            dependencies: ["setup-002"]
            acceptance_criteria:
              - "All tables created"
              - "Relationships defined"

    Create 30-50 tasks covering all phases. Each task should be 5-15 minutes of work.

    You MUST use the Write tool. Do not just describe what to do.

    After writing, confirm: "tasks.yaml created"

    ## STEP D: Create Implementation Spec

    Use the Write tool to create docs/office/05-implementation-spec.md:

    # Implementation Specification

    ## Task setup-001: Initialize Project

    **Files:**
    - Create: `package.json`, `tsconfig.json`
    - Create: `src/index.ts`

    **Steps:**
    1. Run: `npm init -y`
    2. Install dependencies
    3. Configure TypeScript
    4. Verify: `npm run dev` works

    ## Task setup-002: Configure Database
    ...

    Cover the first 10-15 tasks with detailed TDD steps.

    You MUST use the Write tool. Do not just describe what to do.

    After writing, confirm: "05-implementation-spec.md created"

    ## STEP E: Add Environment Setup to plan.md

    Use the Edit tool to APPEND to docs/office/plan.md:

    ## Environment Setup

    ### Prerequisites
    - Node.js 20+
    - pnpm (or npm)
    - PostgreSQL (or configured database)

    ### Local Development

    ```bash
    git clone [repo]
    cd [project]
    pnpm install
    cp .env.example .env
    # Edit .env with your values
    pnpm db:push
    pnpm dev
    ```

    ### Environment Variables

    | Variable | Description | Example |
    |----------|-------------|---------|
    | DATABASE_URL | Database connection | postgresql://... |

    ## CI/CD Pipeline

    1. Lint & Type Check
    2. Test
    3. Build
    4. Deploy

    ## Deployment

    - Platform: Vercel (or chosen platform)
    - Production: Auto-deploy on push to main

    Customize based on the tech stack in System Design.

    You MUST use the Edit tool. Do not just describe what to do.

    After editing, confirm: "Environment section added to plan.md"

    ## STEP F: Update Session

    Use the Edit tool to update docs/office/session.yaml:
    - Change status to: plan_complete
    - Change current_phase to: plan_complete

    You MUST use the Edit tool. Do not just describe what to do.

    ## STEP G: Final Report

    List all files created:
    - docs/office/plan.md
    - docs/office/tasks.yaml
    - docs/office/05-implementation-spec.md
    - docs/office/session.yaml (updated)

    Confirm: "War Room phase complete. Ready for /build"
```

## Step 3: After Orchestrator Completes

Verify the files were created:

```bash
ls docs/office/plan.md docs/office/tasks.yaml docs/office/05-implementation-spec.md
```

Tell the user: "War Room complete! Review the artifacts, then /build when ready."
