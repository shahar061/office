# Design: Strict Execution for /imagine Skill

## Problem

The `/imagine` skill was being ignored by the assistant. Instead of spawning agents via the Task tool, the assistant:
- Improvised dialogue with made-up experts ("Business Analyst", "UX Designer", "Tech Lead")
- Created documents with wrong names (`01-product-vision.md` instead of `01-vision-brief.md`)
- Roleplayed as multiple experts instead of invoking the defined agents

Root cause: The skill read like documentation/reference material rather than imperative commands.

## Solution

Rewrote the skill with strict enforcement:

### 1. Critical Preamble
Added `<CRITICAL>` block at the top with explicit rules:
- Execute steps IN ORDER
- Use Task tool EXACTLY as specified
- WAIT for each Task to complete
- NEVER improvise

### 2. Imperative Commands
Changed language from reference-style to command-style:
- "DO THIS NOW. Do not greet the user. Do not ask questions."
- "STOP HERE. Wait for X before proceeding."
- "Say EXACTLY this:"

### 3. Table-Driven Routing
Replaced prose descriptions with lookup tables:
- Phase → Agent mapping
- Agent → Prompt mapping
- No room for interpretation

### 4. Explicit Forbidden Actions
Added `FORBIDDEN` blocks listing what NOT to do:
- Do NOT roleplay as the CEO yourself
- Do NOT write the Vision Brief yourself

### 5. Failure Mode Checklist
Added self-check at the end:
- "You are FAILING if you typed dialogue without invoking Task tool first"
- Lists specific failure modes from the original incident

## Changes Made

- `skills/imagine/SKILL.md` - Complete rewrite with strict execution format

## Testing

Run `/imagine` in a new session and verify:
1. First action is Task tool invocation (not dialogue)
2. Agent Organizer creates `session.yaml`
3. CEO agent is spawned for Discovery phase
4. Correct document names are used throughout
