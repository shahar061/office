# Office Workflow Diagram

Complete flow from `/imagine` through `/plan` to `/build`.

## /imagine - Design Phase

```
User: "I want to build X"
       │
       ▼
┌─────────────────┐     ┌──────────────────────────────────────────────────┐
│  Agent Organizer │────▶│ Check docs/office/session.yaml                   │
└─────────────────┘     │ • Exists & incomplete? → Resume or start fresh   │
       │                │ • Exists & complete? → Run /plan                  │
       │                │ • Not exists? → Create new session               │
       ▼                └──────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│                         DISCOVERY PHASE                                  │
│  ┌─────┐                                                                 │
│  │ CEO │ ◀─── Leads dialogue with user                                   │
│  └──┬──┘     • Understand core problem                                   │
│     │        • Identify target users                                     │
│     │        • Explore the vision                                        │
│     ▼                                                                    │
│  Boardroom consultations:                                                │
│  ├── Market Researcher (market validation)                               │
│  ├── UI/UX Expert (user experience)                                      │
│  └── Chief Architect (feasibility)                                       │
│     │                                                                    │
│     ▼                                                                    │
│  ✓ Checkpoint: User confirms → 01-vision-brief.md                        │
└──────────────────────────────────────────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                        DEFINITION PHASE                                  │
│  ┌─────────────────┐                                                     │
│  │ Product Manager │ ◀─── Leads dialogue                                 │
│  └────────┬────────┘      • Define user personas                         │
│           │               • Write user stories                           │
│           │               • Prioritize features                          │
│           ▼                                                              │
│  Consults: UI/UX Expert (user flows)                                     │
│           │                                                              │
│           ▼                                                              │
│  ✓ Checkpoint: User confirms → 02-prd.md                                 │
└──────────────────────────────────────────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                       VALIDATION PHASE                                   │
│  ┌───────────────────┐                                                   │
│  │ Market Researcher │ ◀─── Works autonomously                           │
│  └─────────┬─────────┘      • WebSearch for market data                  │
│            │                • Analyze competitors                        │
│            │                • Recommend USP                              │
│            ▼                                                             │
│  ✓ Checkpoint: Present findings → 03-market-analysis.md                  │
└──────────────────────────────────────────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                      ARCHITECTURE PHASE                                  │
│  ┌─────────────────┐                                                     │
│  │ Chief Architect │ ◀─── Leads dialogue                                 │
│  └────────┬────────┘      • Design system components                     │
│           │               • Recommend tech stack                         │
│           ▼                                                              │
│  Boardroom consultations:                                                │
│  ├── Backend Engineer (API design)                                       │
│  ├── Frontend Engineer (client architecture)                             │
│  ├── Data Engineer (data models)                                         │
│  └── DevOps (infrastructure)                                             │
│           │                                                              │
│           ▼                                                              │
│  ✓ Checkpoint: User confirms → 04-system-design.md                       │
└──────────────────────────────────────────────────────────────────────────┘
       │
       ▼
git commit: 01-vision-brief.md, 02-prd.md, 03-market-analysis.md,
            04-system-design.md, session.yaml
       │
       ▼
session.yaml: status = imagine_complete
```

## /plan - War Room Phase

```
┌─────────────────┐
│ Agent Organizer │────▶ Validate: status == imagine_complete
└────────┬────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  ┌─────────────────┐                                                     │
│  │ Project Manager │ ◀─── Define milestones                              │
│  └────────┬────────┘      • Identify implementation phases               │
│           │               • Define deliverables                          │
│           │               • Establish dependencies                       │
│           ▼                                                              │
│  ┌───────────┐                                                           │
│  │ Team Lead │ ◀─── Break down tasks                                     │
│  └─────┬─────┘      • Create discrete tasks (5-15 min each)              │
│        │            • Define acceptance criteria                         │
│        │            • Set task dependencies                              │
│        ▼                                                                 │
│  ┌────────┐                                                              │
│  │ DevOps │ ◀─── Environment plan                                        │
│  └────┬───┘       • Local dev setup                                      │
│       │           • CI/CD pipeline                                       │
│       │           • Deployment strategy                                  │
│       ▼                                                                  │
│  ┌─────────────────┐                                                     │
│  │ Agent Organizer │ ◀─── Assign tasks to agents                         │
│  └────────┬────────┘      • Validate dependency graph (no cycles)        │
│           │               • Produce tasks.yaml                           │
│           ▼                                                              │
│  ┌───────────┐                                                           │
│  │ Team Lead │ ◀─── Generate implementation spec                         │
│  └───────────┘      • TDD steps for each task                            │
│                     • Exact file paths                                   │
│                     • Complete code snippets                             │
└──────────────────────────────────────────────────────────────────────────┘
         │
         ▼
✓ User review: plan.md, tasks.yaml, 05-implementation-spec.md
         │
         ▼
git commit: plan.md, tasks.yaml, 05-implementation-spec.md
         │
         ▼
session.yaml: status = plan_complete
```

## /build - Execution Phase

```
┌─────────────────┐
│ Agent Organizer │────▶ Validate: status == plan_complete
└────────┬────────┘      • Ask: completion policy (auto-merge/pr/checkpoint)
         │               • Ask: retry limit (default 3)
         ▼
Create: docs/office/build-state.yaml
Start: Dashboard (http://localhost:5050)
         │
         ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         MAIN BUILD LOOP                                  │
│                                                                          │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │                    PER FEATURE (parallel)                         │   │
│  │                                                                   │   │
│  │  Feature ready? (depends_on features complete)                    │   │
│  │         │                                                         │   │
│  │         ▼                                                         │   │
│  │  ┌──────────────────────────────────────────┐                     │   │
│  │  │ superpowers:using-git-worktrees          │                     │   │
│  │  │ • Create feature branch                  │                     │   │
│  │  │ • Create isolated worktree               │                     │   │
│  │  │ • Setup environment                      │                     │   │
│  │  └──────────────────┬───────────────────────┘                     │   │
│  │                     │                                             │   │
│  │                     ▼                                             │   │
│  │  ┌──────────────────────────────────────────────────────────┐    │   │
│  │  │                  PER TASK (sequential)                    │    │   │
│  │  │                                                           │    │   │
│  │  │  Agent picks task (domain-matched)                        │    │   │
│  │  │         │                                                 │    │   │
│  │  │         ▼                                                 │    │   │
│  │  │  ┌─────────────────────────────────────────────────────┐ │    │   │
│  │  │  │ Step 4: Execute Task (TDD)                          │ │    │   │
│  │  │  │   1. Write failing test                             │ │    │   │
│  │  │  │   2. Run test, verify failure                       │ │    │   │
│  │  │  │   3. Write implementation                           │ │    │   │
│  │  │  │   4. Run test, verify pass                          │ │    │   │
│  │  │  │   5. Commit                                         │ │    │   │
│  │  │  └────────────────────┬────────────────────────────────┘ │    │   │
│  │  │                       │                                  │    │   │
│  │  │                       ▼                                  │    │   │
│  │  │  ┌─────────────────────────────────────────────────────┐ │    │   │
│  │  │  │ Step 4b: Code Review                                │ │    │   │
│  │  │  │   status → in_review                                │ │    │   │
│  │  │  │         │                                           │ │    │   │
│  │  │  │         ▼                                           │ │    │   │
│  │  │  │   superpowers:requesting-code-review                │ │    │   │
│  │  │  │         │                                           │ │    │   │
│  │  │  │    ┌────┴────┐                                      │ │    │   │
│  │  │  │    ▼         ▼                                      │ │    │   │
│  │  │  │  Clean    Issues                                    │ │    │   │
│  │  │  │    │         │                                      │ │    │   │
│  │  │  │    │         ▼                                      │ │    │   │
│  │  │  │    │   office:handling-code-review                  │ │    │   │
│  │  │  │    │   • READ → UNDERSTAND → VERIFY                 │ │    │   │
│  │  │  │    │   • EVALUATE → RESPOND → IMPLEMENT             │ │    │   │
│  │  │  │    │   • Escalate unclear → @team-lead              │ │    │   │
│  │  │  │    │         │                                      │ │    │   │
│  │  │  │    │         ▼                                      │ │    │   │
│  │  │  │    │   Re-request review (max 3 attempts)           │ │    │   │
│  │  │  │    │         │                                      │ │    │   │
│  │  │  │    │    ┌────┴────┐                                 │ │    │   │
│  │  │  │    │    ▼         ▼                                 │ │    │   │
│  │  │  │    │  Clean   Still issues (attempt 3)              │ │    │   │
│  │  │  │    │    │         │                                 │ │    │   │
│  │  │  │    ▼    ▼         ▼                                 │ │    │   │
│  │  │  │  ┌──────────┐  ┌─────────────────────┐              │ │    │   │
│  │  │  │  │completed │  │completed            │              │ │    │   │
│  │  │  │  │review:   │  │review: has-warnings │              │ │    │   │
│  │  │  │  │clean     │  │(logged for human)   │              │ │    │   │
│  │  │  │  └──────────┘  └─────────────────────┘              │ │    │   │
│  │  │  └─────────────────────────────────────────────────────┘ │    │   │
│  │  │                       │                                  │    │   │
│  │  │                       ▼                                  │    │   │
│  │  │                 Next task                                │    │   │
│  │  └──────────────────────────────────────────────────────────┘    │   │
│  │                     │                                             │   │
│  │                     ▼                                             │   │
│  │         All tasks complete                                        │   │
│  │                     │                                             │   │
│  │                     ▼                                             │   │
│  │  ┌──────────────────────────────────────────┐                     │   │
│  │  │ superpowers:finishing-a-development-     │                     │   │
│  │  │              branch                      │                     │   │
│  │  │ • Apply completion policy:               │                     │   │
│  │  │   - auto-merge → merge to main           │                     │   │
│  │  │   - pr → create pull request             │                     │   │
│  │  │   - checkpoint → pause for human         │                     │   │
│  │  │ • Cleanup worktree                       │                     │   │
│  │  └──────────────────────────────────────────┘                     │   │
│  └───────────────────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────────────────┘
                                │
                                ▼
                    All features complete
                                │
                                ▼
session.yaml: status = build_complete
```

## Dashboard View

```
Kanban Board: http://localhost:5050

┌─────────┐  ┌───────────┐  ┌───────────┐  ┌───────────┐  ┌────────┐
│ Queued  │  │  Active   │  │ In Review │  │   Done    │  │ Failed │
├─────────┤  ├───────────┤  ├───────────┤  ├───────────┤  ├────────┤
│ task-5  │  │ task-3    │  │ task-2    │  │ task-1 ✓  │  │        │
│ task-6  │  │ ░░░░░░░░░ │  │ ████████  │  │           │  │        │
│         │  │ Step 3/5  │  │ Attempt   │  │ task-4    │  │        │
│         │  │           │  │   2/3     │  │ ⚠ CR Warn │  │        │
└─────────┘  └───────────┘  └───────────┘  └───────────┘  └────────┘

Legend: ████ = purple border (in review)
        ⚠ CR Warn = orange badge (has-warnings)
```

## Agents by Domain

```
Agent Pool (picks tasks by domain):

backend-engineer ──── api, database, models, migrations, server
frontend-engineer ─── ui, components, pages, state, client
ui-ux-expert ──────── styling, ux-review, design
data-engineer ─────── data-pipeline, analytics, etl
automation-developer  tests, ci-cd, scripts, automation
devops ────────────── infrastructure, deployment, docker
```

## Output Files

```
docs/office/
├── session.yaml            ← tracks phase status
├── 01-vision-brief.md      ← /imagine: Discovery
├── 02-prd.md               ← /imagine: Definition
├── 03-market-analysis.md   ← /imagine: Validation
├── 04-system-design.md     ← /imagine: Architecture
├── plan.md                 ← /plan: human-readable
├── tasks.yaml              ← /plan: machine-readable
├── 05-implementation-spec.md ← /plan: TDD steps
└── build-state.yaml        ← /build: progress tracking
```
