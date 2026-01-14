# Design: Explicit Agent Invocation for /imagine Session Setup

## Problem

The `/imagine` skill documents a workflow where the Agent Organizer should create `session.yaml` before the CEO starts the Discovery phase. However, in practice, the CEO agent is spawned directly without session setup occurring, resulting in no `session.yaml` being created.

**Observed behavior:**
```
⏺ office:ceo(CEO discovery session)
  ⎿  Done (0 tool uses · 12.5k tokens · 5s)
```

The CEO ran with 0 tool uses and no session file was created.

## Root Cause

The skill describes the workflow but doesn't prescribe explicit agent invocations. Claude interprets the documentation and jumps to the CEO dialogue because that's where user interaction starts.

## Solution

Add explicit Task tool invocation instructions to the skill, ensuring the Agent Organizer runs first and creates `session.yaml` before any other agent is spawned.

## Changes Required

### 1. Update `skills/imagine/SKILL.md`

Add a new "Invocation Protocol" section after the Overview:

```markdown
## Invocation Protocol

**CRITICAL: Follow these steps exactly. Do not skip to dialogue.**

### Step 1: Session Setup (Required)

Before any user interaction, spawn the Agent Organizer to handle session management:

Task tool:
  subagent_type: office:agent-organizer
  prompt: |
    Set up the /imagine session.

    1. Create docs/office/ directory if it doesn't exist
    2. Check if docs/office/session.yaml exists
    3. If exists: Read it and return its status
    4. If not exists: Create it with status "in_progress", current_phase "discovery"

    You MUST use the Write tool to create files. Return JSON:
    {"session_status": "new|resuming|complete", "current_phase": "...", "topic": "..."}

### Step 2: Route Based on Status

- **"new"** → Proceed to Discovery Phase (Step 3)
- **"resuming"** → Spawn the agent for `current_phase`
- **"complete"** → Tell user: "Design phase complete. Run /plan to continue."

### Step 3: Discovery Phase

Only after session.yaml exists, spawn CEO:

Task tool:
  subagent_type: office:ceo
  prompt: |
    Lead the Discovery phase dialogue.
    Session topic: [from session.yaml]

    Engage the user to understand their idea. When ready, use the Write tool
    to create docs/office/01-vision-brief.md with the vision brief.

    Ask questions one at a time. End by confirming the vision brief with the user.
```

Update the Workflow section to include phase transition pattern:

```markdown
## Workflow

### Phase Transitions

Each phase follows the same pattern:

1. **Agent Organizer checkpoint** - Summarize, get user confirmation, write document, update session.yaml
2. **Spawn next phase agent** - Pass context from previous phase

Between phases, always spawn Agent Organizer:

Task tool:
  subagent_type: office:agent-organizer
  prompt: |
    Checkpoint: Discovery → Definition transition.

    1. Confirm 01-vision-brief.md was written
    2. Update session.yaml: current_phase="definition", add "discovery" to completed_phases
    3. Return confirmation

    You MUST use the Edit or Write tool to update session.yaml.
```

### 2. Update `agents/agent-organizer.md`

Add a "Tool Usage Requirements" section:

```markdown
## Tool Usage Requirements

**CRITICAL: You must use tools to create and modify files. Never just describe what should be written.**

### Session Setup

When setting up a session, you MUST:

1. Use Bash or check if `docs/office/` exists
2. Use the **Write tool** to create `docs/office/session.yaml`:

```yaml
created: "2026-01-14T10:00:00Z"
updated: "2026-01-14T10:00:00Z"
topic: "[from user context]"
status: "in_progress"
current_phase: "discovery"
completed_phases: []
context:
  target_users: ""
  core_problem: ""
  key_decisions: []
```

3. Return JSON status to the caller

### Phase Transitions

When handling a checkpoint, you MUST:

1. Verify the phase document exists (e.g., `01-vision-brief.md`)
2. Use the **Edit tool** to update `session.yaml`:
   - Update `current_phase`
   - Append to `completed_phases`
   - Update `updated` timestamp
3. Return confirmation

### Common Failure Mode

If you complete without using Write or Edit tools, the session will not persist.
Always verify your tool usage before returning.
```

## File Structure

```
skills/imagine/SKILL.md     # Add Invocation Protocol section
agents/agent-organizer.md   # Add Tool Usage Requirements section
```

## Expected Behavior After Changes

```
⏺ Skill(office:imagine)
  ⎿  Successfully loaded skill

⏺ office:agent-organizer(Set up session)
  ⎿  Done (2 tool uses)
      - Created docs/office/
      - Wrote docs/office/session.yaml

⏺ office:ceo(Discovery dialogue)
  ⎿  Done (...)

⏺ Welcome to the Imagination Session...
```

## Testing

1. Run `/imagine` on a fresh project (no `docs/office/` directory)
2. Verify `session.yaml` is created before CEO speaks
3. Run `/imagine` again - should detect existing session and offer to resume
4. Complete a full `/imagine` flow - verify all phase transitions update `session.yaml`
