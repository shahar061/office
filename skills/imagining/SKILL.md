---
name: imagining
description: "Use when a user wants to develop a rough idea into a product design. Activates a virtual startup team that guides the user through Discovery, Definition, Validation, and Architecture phases. Creates session.yaml and four design documents."
---

# /imagine

## Step 1: Spawn Agent Organizer for Session Setup

**Do this FIRST, before any dialogue or user interaction.**

Use the Task tool now:

```
Task tool:
  subagent_type: office:agent-organizer
  prompt: |
    Set up the /imagine session.

    1. Run: mkdir -p docs/office
    2. Check if docs/office/session.yaml exists
    3. If exists: Read it and return its status
    4. If not exists: Use the Write tool to create docs/office/session.yaml with:

    created: "[current ISO timestamp]"
    updated: "[current ISO timestamp]"
    topic: "pending"
    status: "in_progress"
    current_phase: "discovery"
    completed_phases: []
    context:
      target_users: ""
      core_problem: ""
      key_decisions: []

    You MUST use Bash and Write tools. Do not just describe what to do.
    Return JSON: {"session_status": "new|resuming|complete", "current_phase": "...", "topic": "..."}
```

## Step 2: Route Based on Agent Organizer Response

After the Agent Organizer task completes:

- **"new"** → Go to Step 3
- **"resuming"** → Spawn the agent for the returned `current_phase`
- **"complete"** → Tell user: "Design phase complete. Run /warroom to continue."

## Step 3: Spawn CEO for Discovery Phase

Use the Task tool:

```
Task tool:
  subagent_type: office:ceo
  prompt: |
    Lead the Discovery phase for /imagine.

    Your job: Understand the user's idea through dialogue.
    - Ask about the problem being solved
    - Identify target users
    - Explore the vision
    - Ask ONE question at a time

    When ready, use the Write tool to create docs/office/01-vision-brief.md.
    Confirm the content with the user before finishing.
```

## Step 4: Phase Transitions

After each phase completes, spawn Agent Organizer for the checkpoint:

```
Task tool:
  subagent_type: office:agent-organizer
  prompt: |
    Checkpoint: [Current Phase] → [Next Phase] transition.

    1. Verify docs/office/[document].md was created
    2. Use Edit tool to update docs/office/session.yaml:
       - current_phase: "[next_phase]"
       - Add "[completed_phase]" to completed_phases
       - Update "updated" timestamp
    3. Return confirmation

    You MUST use the Edit tool. Do not just describe changes.
```

Then spawn the next phase agent with explicit dialogue prompt:

### After Discovery → Spawn Product Manager

```
Task tool:
  subagent_type: office:product-manager
  prompt: |
    Lead the Definition phase for /imagine.

    First, read docs/office/01-vision-brief.md to understand the vision.

    Then ask the user:
    "I've read the Vision Brief. Would you like me to:
    A) Draft the PRD based on the vision (you'll review at the end)
    B) Work through it together (I'll ask 2-3 questions at a time)"

    **If user chooses A (autonomous):**
    - Infer personas, priorities, and scope from the vision brief
    - Write docs/office/02-prd.md directly
    - Show the user: "Here's the PRD I drafted based on the vision. Does this capture it, or should we adjust anything?"

    **If user chooses B (collaborative):**
    Ask questions in batches of 2-3, grouped by topic:

    Batch 1 - Users:
    "Let me understand who we're building for:
    1. Who is the primary user persona?
    2. What's their main goal or job-to-be-done?
    3. Are there secondary users we should consider?"

    Batch 2 - Features:
    "Now let's prioritize:
    1. What are the must-have features for v1?
    2. What's explicitly out of scope?
    3. Any technical constraints I should know about?"

    Batch 3 - Edge cases (if needed based on complexity):
    "A few more details:
    1. How should we handle [specific edge case]?
    2. Any compliance or accessibility requirements?"

    Adapt based on answer depth - skip batches if already covered.
    When ready, use the Write tool to create docs/office/02-prd.md.
    Confirm with user before finishing.
```

### After Definition → Spawn Market Researcher

```
Task tool:
  subagent_type: office:market-researcher
  prompt: |
    Lead the Validation phase for /imagine.

    **No user interaction needed - run autonomously.**

    Start by telling the user:
    "I'll research the market landscape for this product. Give me a moment to analyze competitors and trends..."

    Then:
    - Read docs/office/01-vision-brief.md and docs/office/02-prd.md
    - Use WebSearch to research competitors, market size, and trends
    - Identify market gaps and unique selling proposition
    - Write docs/office/03-market-analysis.md

    When done, share a brief summary:
    "Here's what I found:
    - Main competitors: [list 2-3]
    - Market opportunity: [one sentence]
    - Recommended USP: [one sentence]

    Full analysis saved to 03-market-analysis.md. Ready for the Chief Architect to design the system."

    Do NOT ask questions or wait for user input - just research and report.
```

### After Validation → Spawn Chief Architect

```
Task tool:
  subagent_type: office:chief-architect
  prompt: |
    Lead the Architecture phase for /imagine.

    First, read all previous docs (01-vision-brief.md, 02-prd.md, 03-market-analysis.md).

    Then ask the user TWO opening questions:
    "Before I design the system:

    1. Tech stack approach:
       A) You decide - I'll choose based on requirements (Recommended for most projects)
       B) Let's decide together - I'll walk you through options

    2. What's your infrastructure budget?
       A) Minimal ($0-50/mo) - Free tiers, serverless
       B) Moderate ($50-200/mo) - Small managed services
       C) Flexible ($200+/mo) - Best tool for the job
       D) Not sure yet - I'll optimize for cost-efficiency"

    **If user chooses "You decide" for tech stack:**
    - Pick the best stack based on requirements + budget
    - Write docs/office/04-system-design.md
    - Show summary: "I chose [stack] because [reasons]. Here's the architecture overview..."
    - Ask: "Does this look good, or should we adjust anything?"

    **If user chooses "Let's decide together":**
    Ask ONE question at a time with multiple options and your recommendation:

    "For the database, I'd recommend:
    A) PostgreSQL (Recommended) - Relational, great for [specific need from PRD]
    B) MongoDB - Flexible schema, good if requirements evolve
    C) SQLite - Simple, free, good for MVP
    What's your preference?"

    Continue through key decisions: frontend framework, hosting/deployment, authentication, real-time (if needed).

    When all decisions made, write docs/office/04-system-design.md.
    Review the architecture with the user before finishing.
```

## Step 5: After Architecture Phase

1. Spawn Agent Organizer to set `status: imagine_complete`
2. Commit all documents:

```bash
git add docs/office/
git commit -m "docs(office): complete imagine phase

Generated design documents:
- 01-vision-brief.md
- 02-prd.md
- 03-market-analysis.md
- 04-system-design.md
- session.yaml

Co-Authored-By: Office Plugin <noreply@anthropic.com>"
```

3. Tell user: "Design phase complete! Documents committed. Ready to run /warroom?"

---

## Reference: Phase Details

### Discovery (CEO)

- Understand core problem
- Identify target users
- Explore vision
- Output: `01-vision-brief.md`

### Definition (Product Manager)

- Review Vision Brief
- Define personas and user stories
- Prioritize features
- Output: `02-prd.md`

### Validation (Market Researcher)

- Research market using WebSearch
- Analyze competitors
- Recommend USP
- Output: `03-market-analysis.md`

### Architecture (Chief Architect)

- Design system components
- Recommend tech stack
- Consult Backend/Frontend/Data/DevOps engineers
- Output: `04-system-design.md`

## Reference: Boardroom Consultations

Phase agents can consult specialists:

1. Agent says: "Let me consult with our [Specialist]..."
2. Spawn specialist agent for input
3. Synthesize response and continue

## Reference: Session State

`docs/office/session.yaml` tracks progress:

```yaml
created: "2026-01-13T10:30:00Z"
updated: "2026-01-13T14:22:00Z"
topic: "project-name"
status: "in_progress"
current_phase: "discovery"
completed_phases: []
context:
  target_users: ""
  core_problem: ""
  key_decisions: []
```

Status values: `in_progress` → `imagine_complete`
