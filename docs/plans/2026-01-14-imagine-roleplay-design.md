# Design: Immersive Role-Play for /imagine

## Problem

The current /imagine experience feels mechanical. Users see messages like:

```
⏺ office:ceo(Lead discovery phase)
  ⎿  Done (0 tool uses · 1.1k tokens · 5s)

⏺ The CEO agent is asking: What problem are you trying to solve...
```

Users want to talk directly TO the characters, not through a system that routes messages.

## Solution

Replace subagent spawning with direct role-play. Claude becomes each character in the main conversation, eliminating the "machinery" layer entirely.

## New Flow

```
User: /imagine

CEO: I lead Discovery. Let's turn your idea into a clear vision.
     What problem are you trying to solve?

User: [describes idea]

CEO: [asks follow-up questions, one at a time]
     ...
     [writes 01-vision-brief.md]
     Does this capture your vision?

User: Yes

PM: I'm taking over for Definition. I'll translate this vision
    into concrete requirements.
    [asks questions about users, features, priorities]
    ...
    [writes 02-prd.md]
    Does this cover the key requirements?

User: Yes

Market Researcher: I'll analyze the market and competition for this.
                   Give me a moment...
                   [writes 03-market-analysis.md]
                   Done. Here's what I found: [brief summary]

Chief Architect: Any technologies you want me to use, or should I
                 choose what fits best?

User: [answers]

Chief Architect: Got it. Designing the system now...
                 [writes 04-system-design.md]
                 Architecture complete. Run /plan when ready.
```

## Character Interactions

### CEO (Discovery)

- Opens with brief intro: who they are, what this phase does
- Asks questions one at a time (not a list)
- Adapts based on how much detail the user provides
- Shows the Vision Brief before finalizing, asks for confirmation
- Hands off naturally: "Vision's clear. The PM will take it from here."

### Product Manager (Definition)

- Brief intro, acknowledges the vision
- Focuses on: target users, must-have vs nice-to-have features, success metrics
- Can reference what CEO learned (full context available)
- Shows PRD sections incrementally or as a whole, confirms before moving on
- Hands off: "Requirements locked. Market Researcher will analyze the landscape."

### Market Researcher (Validation)

- Brief intro: "I'll research the market and competition."
- States what they're about to do (no questions)
- Works independently, writes the analysis
- Returns with a 2-3 sentence summary of key findings
- Hands off: "Analysis complete. Chief Architect will design the system."

### Chief Architect (Architecture)

- One question: "Any tech preferences, or should I choose what fits?"
- Takes the answer (or "your call") and works independently
- Writes the system design
- Closes the /imagine phase: "Architecture complete. Run `/plan` when you're ready."

## Character Style

- Generic but warm (no names or backstories)
- Direct speech (no meta-commentary like "The CEO is asking...")
- Natural, conversational tone
- Personality comes through in how they speak, not who they are

## Technical Implementation

### Changes to `commands/imagine.md`

The command becomes a role-play orchestrator instead of a subagent dispatcher:

1. Check/create `session.yaml` (same as today)
2. Read current phase from `session.yaml`
3. Instruct Claude to "become" the appropriate character
4. Provide character guidelines inline (no subagent spawning)
5. After each phase: write the document, update `session.yaml`, transition to next character

### Session Resumption

If the user runs `/imagine` mid-session:
- Read `session.yaml` to find current phase
- Claude resumes as that character, picking up where they left off
- If a document exists for that phase, offer to continue or start fresh

### What Gets Removed

- No more `Task` tool calls to spawn `office:ceo`, `office:product-manager`, etc.
- No more agent routing table in `imagine.md`
- Agent files become reference docs, not subagent prompts

### What Stays

- `session.yaml` for state tracking
- Same 4 documents: `01-vision-brief.md`, `02-prd.md`, `03-market-analysis.md`, `04-system-design.md`
- Git commit at the end

## File Changes

### Modified

- `commands/imagine.md` - Complete rewrite as role-play orchestrator with inline character guidelines

### Kept As-Is

- All agents used by `/plan` and `/build`
- `agents/agent-organizer.md`
- `agents/project-manager.md`
- `agents/team-lead.md`
- `agents/devops.md`
- All engineer agents

### Kept as Reference

These files stay but are no longer spawned as subagents during /imagine:

- `agents/ceo.md`
- `agents/product-manager.md`
- `agents/market-researcher.md`
- `agents/chief-architect.md` (also used by /plan)

## Outputs

Same as today:
- `docs/office/session.yaml`
- `docs/office/01-vision-brief.md`
- `docs/office/02-prd.md`
- `docs/office/03-market-analysis.md`
- `docs/office/04-system-design.md`
