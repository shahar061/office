# Office Plugin Design

A Claude Code plugin that simulates a startup team of 13 AI agents working together to transform rough ideas into executable plans.

## Overview

### Three Skills

| Skill | Purpose | Interaction Model |
|-------|---------|-------------------|
| `/imagine` | Discovery and design | Interactive (user ↔ agents) |
| `/plan` | Create execution graph from design docs | Automated (user reviews) |
| `/build` | Execute tasks from plan | Future implementation |

### Core Concepts

| Concept | Description |
|---------|-------------|
| **Boardroom** | During `/imagine`, the CEO consults specialists before responding. User sees summaries of these consultations. |
| **War Room** | During `/plan`, Project Manager leads automated planning with Team Lead, DevOps, and Agent Organizer. |
| **Agent Organizer** | Visible coordinator with its own persona. Manages phase transitions, can be addressed by user. |
| **Hybrid Interaction** | CEO hosts the conversation but brings in specialists for direct Q&A when their expertise is needed. |
| **Collaborative Checkpoints** | Before phase transitions, Agent Organizer summarizes progress and asks user to confirm before proceeding. |
| **Auto-Resume** | Plugin detects incomplete sessions and offers to continue or start fresh. |

---

## Agent Roster

| Agent | Voice/Style | Primary Role |
|-------|-------------|--------------|
| **CEO** | Visionary, big-picture, asks "why" questions | Hosts `/imagine`, owns Vision Brief |
| **Product Manager** | User-focused, prioritizes ruthlessly, thinks in user stories | Owns PRD, clarifies requirements |
| **Chief Architect** | Precise, systems thinker, concerned with scalability and trade-offs | Owns System Design |
| **Market Researcher** | Data-driven, analytical, cites sources, distinguishes fact from inference | Owns Competitive Analysis |
| **Agent Organizer** | Efficient, structured, announces transitions clearly, addressable by user | Orchestrates flow, assigns ownership |
| **Project Manager** | Timeline-focused, milestone-driven, thinks in dependencies | Leads `/plan`, owns plan.md |
| **Team Lead** | Pragmatic, breaks big things into small tasks, estimates effort | Breaks architecture into Claude-tasks |
| **DevOps** | Infrastructure-minded, thinks about CI/CD, environments, deployment | Owns environment plan |
| **Backend Engineer** | API-focused, database-savvy, thinks about data flow | Boardroom consultant, `/build` executor |
| **Frontend Engineer** | Component-oriented, thinks about state and user interaction | Boardroom consultant, `/build` executor |
| **UI/UX Expert** | User-empathetic, thinks in flows and friction points | Boardroom consultant on user experience |
| **Data Engineer** | Pipeline-focused, thinks about data models and analytics | Boardroom consultant on data architecture |
| **Automation Developer** | Efficiency-focused, thinks about testing and repeatability | Boardroom consultant, `/build` executor |

---

## `/imagine` Flow

### Phase 1: Discovery (CEO)

- User runs `/imagine`
- Agent Organizer checks for existing sessions → offers resume or fresh start
- CEO greets user, asks about their idea
- CEO consults Boardroom as needed (user sees: "Consulting Market Researcher..." + summary)
- CEO uses hybrid interaction: brings in specialists for direct Q&A when relevant
- **Checkpoint:** Agent Organizer summarizes the vision, asks user to confirm
- **Output:** `01-vision-brief.md`

### Phase 2: Definition (Product Manager)

- Product Manager takes over, reviews Vision Brief
- Asks clarifying questions about users, features, priorities
- May bring in UI/UX Expert for user flow questions
- **Checkpoint:** Agent Organizer summarizes requirements, asks user to confirm
- **Output:** `02-prd.md`

### Phase 3: Validation (Market Researcher)

- Market Researcher analyzes PRD against market data
- Uses hybrid approach: real web search + synthesized knowledge (clearly labeled)
- Identifies competitors, market gaps, USP recommendations
- **Checkpoint:** Agent Organizer presents findings, asks if user wants to adjust PRD
- **Output:** `03-market-analysis.md`

### Phase 4: Architecture (Chief Architect)

- Chief Architect deep-dives into PRD and market context
- May consult Backend, Frontend, Data Engineer, DevOps in Boardroom
- Defines system components, data flow, tech stack recommendations
- **Checkpoint:** Agent Organizer summarizes design, confirms completion
- **Output:** `04-system-design.md`

**Session marked complete. Agent Organizer offers to start `/plan`.**

---

## `/plan` Flow

### Trigger

Automatic prompt after `/imagine` completes, or user runs `/plan` manually on a completed session.

### Input

The four documents from `/imagine`:
- `01-vision-brief.md`
- `02-prd.md`
- `03-market-analysis.md`
- `04-system-design.md`

### War Room Process (Automated)

| Step | Agent | Action |
|------|-------|--------|
| 1 | Project Manager | Analyzes docs, defines milestones and timeline |
| 2 | Team Lead | Breaks System Design into discrete tasks with dependencies |
| 3 | DevOps | Creates environment setup plan (CI/CD, infra, local dev) |
| 4 | Agent Organizer | Assigns each task to appropriate agent (Backend, Frontend, Data, Automation) |

User sees progress updates as each agent works.

### Output

- `plan.md` - Human-readable plan with milestones, tasks, dependencies, and assignments
- `tasks.yaml` - Machine-readable execution manifest

### `tasks.yaml` Structure

```yaml
tasks:
  - id: "setup-001"
    description: "Initialize project with Next.js and configure TypeScript"
    phase: "setup"
    assigned_agent: "frontend_engineer"
    dependencies: []
    acceptance_criteria:
      - "Project runs with `npm run dev`"
      - "TypeScript strict mode enabled"
```

User reviews output, can request adjustments before finalizing.

---

## File Structure

```
project-root/
  docs/
    office/
      session.yaml              # Session metadata
      01-vision-brief.md
      02-prd.md
      03-market-analysis.md
      04-system-design.md
      plan.md
      tasks.yaml
      archived/                  # Old sessions if user starts fresh
        2026-01-10/
          ...
```

### `session.yaml` Schema

```yaml
created: "2026-01-13T10:30:00Z"
updated: "2026-01-13T14:22:00Z"
topic: "saas-analytics-dashboard"
status: "in_progress"           # in_progress | imagine_complete | plan_complete
current_phase: "definition"     # discovery | definition | validation | architecture
completed_phases:
  - discovery
context:
  # Key decisions and facts captured during conversation
  # Used for resumption and cross-phase context
  target_users: "small business owners"
  core_problem: "can't visualize their metrics easily"
```

### Session Detection Logic

1. `/imagine` starts → Agent Organizer looks for `docs/office/session.yaml`
2. If found and `status != plan_complete` → "Found incomplete session about [topic]. Continue or start fresh?"
3. If found and `status == plan_complete` → "This project is fully planned. Run `/build` to start implementation or `/imagine --new` for a different idea."
4. If not found → Start fresh session

---

## Technical Implementation

### Plugin Structure

```
office/
  package.json                  # Plugin manifest
  skills/
    imagine.md                  # /imagine skill definition
    plan.md                     # /plan skill definition
  agents/
    prompts/
      ceo.md
      product-manager.md
      chief-architect.md
      market-researcher.md
      agent-organizer.md
      project-manager.md
      team-lead.md
      devops.md
      backend-engineer.md
      frontend-engineer.md
      ui-ux-expert.md
      data-engineer.md
      automation-developer.md
    index.md                    # Agent registry and shared context
```

### Agent Switching

Each agent has a prompt file defining their voice and focus. The skill dynamically injects the relevant agent prompt based on context:

1. Skill reads `session.yaml` to understand current phase
2. Loads primary agent prompt (e.g., CEO for discovery)
3. Agent Organizer logic determines when to bring in specialists
4. Boardroom consultations: skill loads specialist prompt, generates response, summarizes back

### State Management

- `session.yaml` persists phase and key context
- Each completed phase writes its markdown output immediately
- Context summaries stored in `session.yaml` for resumption
- Agent Organizer uses context to provide continuity after resume

### Web Search Integration

Market Researcher uses Claude's `WebSearch` tool with result labeling:
- Results prefixed with `[Live Data]` or `[Knowledge Base]`

---

## Future `/build` Considerations

### Task Schema

```yaml
tasks:
  - id: "setup-001"
    description: "Initialize project with Next.js and TypeScript"
    phase: "setup"
    assigned_agent: "frontend_engineer"
    dependencies: []
    acceptance_criteria:
      - "Project runs with npm run dev"
      - "TypeScript strict mode enabled"

  - id: "backend-001"
    description: "Create user authentication API endpoints"
    phase: "backend"
    assigned_agent: "backend_engineer"
    dependencies: ["setup-001"]
    acceptance_criteria:
      - "POST /auth/login returns JWT"
      - "POST /auth/register creates user"
      - "Tests pass"
```

### Future `/build` Behavior

1. Reads `tasks.yaml`
2. Resolves dependency graph
3. Executes tasks in order, parallelizing where dependencies allow
4. Each task assigned to its agent (who brings their expertise/voice)
5. Marks tasks complete in `tasks.yaml` as they finish
6. Handles failures gracefully (retry, skip, or pause for user input)

### Expansion Points

- Task estimation (story points, complexity)
- Agent collaboration on single tasks
- Progress dashboard / status reports
- Integration with git (auto-commits per task)
