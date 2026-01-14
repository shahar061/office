---
name: imagine
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
- **"complete"** → Tell user: "Design phase complete. Run /plan to continue."

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

Then spawn the next phase agent:

| Completed Phase | Next Agent               | Next Phase   |
| --------------- | ------------------------ | ------------ |
| discovery       | office:product-manager   | definition   |
| definition      | office:market-researcher | validation   |
| validation      | office:chief-architect   | architecture |

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

3. Tell user: "Design phase complete! Documents committed. Ready to run /plan?"

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
