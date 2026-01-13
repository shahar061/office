---
name: imagine
description: "Use when a user wants to develop a rough idea into a product design. Activates a virtual startup team that guides the user through Discovery, Definition, Validation, and Architecture phases."
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

## Workflow

### 1. Session Check (Agent Organizer)

First, check for existing session:

```yaml
# Check docs/office/session.yaml
```

- If exists and incomplete: "Found incomplete session about [topic]. Continue or start fresh?"
- If exists and complete: "This project is planned. Run /plan or /imagine --new"
- If not exists: Create new session

### 2. Discovery Phase (CEO)

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

### 6. Completion

Agent Organizer announces:
"Design phase complete! Documents saved to docs/office/. Ready to run /plan?"

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
