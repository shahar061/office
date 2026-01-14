---
name: imagine
description: "Use when a user wants to develop a rough idea into a product design. Activates a virtual startup team that guides the user through Discovery, Definition, Validation, and Architecture phases. Creates session.yaml and four design documents."
---

# /imagine - Transform Ideas into Designs

## Overview

The `/imagine` skill activates your virtual startup team to transform a rough idea into comprehensive design documents through collaborative dialogue.

## Phases

| Phase | Lead Agent | Output |
|-------|------------|--------|
| Discovery | CEO | `01-vision-brief.md` |
| Definition | Product Manager | `02-prd.md` |
| Validation | Market Researcher | `03-market-analysis.md` |
| Architecture | Chief Architect | `04-system-design.md` |

## Invocation Protocol

**CRITICAL: Follow these steps exactly. Do not skip to dialogue.**

### Step 1: Session Setup (Required)

Before any user interaction, use the Task tool to spawn the Agent Organizer for session management:

```
Task tool:
  subagent_type: office:agent-organizer
  prompt: |
    Set up the /imagine session.

    1. Create docs/office/ directory if it doesn't exist (use Bash: mkdir -p docs/office)
    2. Check if docs/office/session.yaml exists (use Bash: ls docs/office/session.yaml)
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

    You MUST use tools (Bash, Write) to create files. Do not just describe what to do.

    Return JSON: {"session_status": "new|resuming|complete", "current_phase": "...", "topic": "..."}
```

### Step 2: Route Based on Status

After Agent Organizer returns:

- **"new"** → Proceed to Step 3 (Discovery Phase)
- **"resuming"** → Spawn the agent for `current_phase` (CEO, Product Manager, etc.)
- **"complete"** → Tell user: "Design phase complete. Run /plan to continue."

### Step 3: Spawn Phase Agents

Only after session.yaml exists, spawn the phase agent. Example for Discovery:

```
Task tool:
  subagent_type: office:ceo
  prompt: |
    Lead the Discovery phase dialogue for /imagine.

    Engage the user to understand their idea deeply:
    - Understand the core problem being solved
    - Identify target users
    - Explore the vision
    - Ask one question at a time

    When you have enough understanding, use the Write tool to create
    docs/office/01-vision-brief.md with the vision brief.

    End by confirming the vision brief content with the user.
```

## Workflow

### Phase Transitions

Each phase follows the same pattern:

1. **Phase agent dialogue** - Agent engages user, writes output document
2. **Agent Organizer checkpoint** - Spawned to update session.yaml and transition

Between phases, spawn Agent Organizer for the checkpoint:

```
Task tool:
  subagent_type: office:agent-organizer
  prompt: |
    Checkpoint: [Current Phase] → [Next Phase] transition.

    1. Verify docs/office/[document].md exists
    2. Use the Edit tool to update docs/office/session.yaml:
       - Set current_phase to "[next_phase]"
       - Add "[current_phase]" to completed_phases array
       - Update the "updated" timestamp
    3. Return confirmation

    You MUST use the Edit tool to update session.yaml. Do not just describe the changes.
```

### Discovery Phase (CEO)

**CEO leads dialogue with user:**
- Understand the core problem
- Identify target users
- Explore the vision
- Ask one question at a time

**Boardroom consultations** (visible to user):
- Consult Market Researcher for market validation
- Consult UI/UX Expert for user experience questions
- Consult Chief Architect for feasibility checks

**Checkpoint (Agent Organizer):**
- Summarize the vision
- Ask user to confirm
- Write `01-vision-brief.md`
- Update session.yaml: `current_phase: definition`

### 3. Definition Phase (Product Manager)

**Product Manager leads dialogue:**
- Review Vision Brief
- Define user personas
- Write user stories
- Prioritize features

**Boardroom consultations:**
- Consult UI/UX Expert for user flows

**Checkpoint (Agent Organizer):**
- Summarize requirements
- Ask user to confirm
- Write `02-prd.md`
- Update session.yaml: `current_phase: validation`

### 4. Validation Phase (Market Researcher)

**Market Researcher works (less interactive):**
- Use WebSearch for market data
- Label sources: `[Live Data]` vs `[Knowledge Base]`
- Analyze competitors
- Recommend USP

**Checkpoint (Agent Organizer):**
- Present findings
- Ask if PRD needs adjustment
- Write `03-market-analysis.md`
- Update session.yaml: `current_phase: architecture`

### 5. Architecture Phase (Chief Architect)

**Chief Architect leads dialogue:**
- Deep-dive into technical requirements
- Design system components
- Recommend tech stack

**Boardroom consultations:**
- Consult Backend Engineer for API design
- Consult Frontend Engineer for client architecture
- Consult Data Engineer for data models
- Consult DevOps for infrastructure

**Checkpoint (Agent Organizer):**
- Summarize design
- Ask user to confirm
- Write `04-system-design.md`
- Update session.yaml: `status: imagine_complete`

### 6. Commit Documents

After all documents are written, commit them to git:

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

This ensures documents are available when `/build` creates worktrees.

### 7. Completion

Agent Organizer announces:
"Design phase complete! Documents committed to git. Ready to run /plan?"

## Session State

Maintain `docs/office/session.yaml`:

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

## Agent Switching

The primary agent for each phase leads the conversation. When they need specialist input:

1. Agent says: "Let me consult with our [Specialist]..."
2. Agent Organizer announces: "Consulting [Specialist]..."
3. Specialist provides input (not direct dialogue with user)
4. Primary agent synthesizes and continues

For direct specialist Q&A (hybrid mode):
1. Primary agent says: "I'm bringing in [Specialist] for this question..."
2. Specialist speaks directly to user for that exchange
3. Primary agent resumes after

## Files Created

```
docs/
  office/
    session.yaml
    01-vision-brief.md
    02-prd.md
    03-market-analysis.md
    04-system-design.md
```
