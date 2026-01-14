---
name: imagine
description: "Transform rough ideas into design documents. Run multiple times to progress through phases: Discovery → Definition → Validation → Architecture."
---

# /imagine - Minimal Orchestrator

This skill does **ONE action per invocation**. Run `/imagine` repeatedly to progress through phases.

## STEP 1: Determine Current State

**Read the state NOW. Do not skip this step.**

```
Check: Does docs/office/session.yaml exist?
```

Use Bash: `ls docs/office/session.yaml 2>/dev/null && echo "EXISTS" || echo "NOT_EXISTS"`

Based on the result, go to the matching section below:

---

## IF: session.yaml does NOT exist

**Action:** Create the session.

Invoke Task tool:
```
subagent_type: office:agent-organizer
prompt: |
  Create the /imagine session.

  1. Run: mkdir -p docs/office
  2. Write docs/office/session.yaml with:
     created: "[ISO timestamp]"
     updated: "[ISO timestamp]"
     status: "in_progress"
     current_phase: "discovery"
  3. Return: {"status": "created", "current_phase": "discovery"}

  You MUST use Bash and Write tools.
```

**After agent returns, say EXACTLY:**

> Session created. Run `/imagine` again to start Discovery phase with the CEO.

**STOP. Do not continue.**

---

## IF: current_phase is "discovery"

**Action:** Run Discovery with CEO.

Invoke Task tool:
```
subagent_type: office:ceo
prompt: |
  Lead the Discovery phase.

  1. Read docs/office/session.yaml to understand context
  2. Engage user in dialogue to understand their idea:
     - What problem are you solving?
     - Who is this for?
     - What does success look like?
  3. Ask ONE question at a time. Wait for responses.
  4. When you have enough understanding, write docs/office/01-vision-brief.md
  5. Show the user what you wrote and confirm it captures their vision
  6. When confirmed, update session.yaml: current_phase: "definition"
  7. Return: {"status": "complete", "document": "01-vision-brief.md"}
```

**After agent returns, say EXACTLY:**

> Discovery complete. Vision Brief created. Run `/imagine` again for Definition phase with the Product Manager.

**STOP. Do not continue.**

---

## IF: current_phase is "definition"

**Action:** Run Definition with Product Manager.

Invoke Task tool:
```
subagent_type: office:product-manager
prompt: |
  Lead the Definition phase.

  1. Read docs/office/01-vision-brief.md
  2. Define personas based on target users
  3. Create user stories for key capabilities
  4. Prioritize features with user input
  5. Write docs/office/02-prd.md
  6. Confirm with user
  7. When confirmed, update session.yaml: current_phase: "validation"
  8. Return: {"status": "complete", "document": "02-prd.md"}
```

**After agent returns, say EXACTLY:**

> Definition complete. PRD created. Run `/imagine` again for Validation phase with the Market Researcher.

**STOP. Do not continue.**

---

## IF: current_phase is "validation"

**Action:** Run Validation with Market Researcher.

Invoke Task tool:
```
subagent_type: office:market-researcher
prompt: |
  Lead the Validation phase.

  1. Read docs/office/01-vision-brief.md and docs/office/02-prd.md
  2. Use WebSearch to research the market
  3. Identify competitors and alternatives
  4. Analyze market fit and positioning
  5. Write docs/office/03-market-analysis.md
  6. Confirm with user
  7. When confirmed, update session.yaml: current_phase: "architecture"
  8. Return: {"status": "complete", "document": "03-market-analysis.md"}
```

**After agent returns, say EXACTLY:**

> Validation complete. Market Analysis created. Run `/imagine` again for Architecture phase with the Chief Architect.

**STOP. Do not continue.**

---

## IF: current_phase is "architecture"

**Action:** Run Architecture with Chief Architect.

Invoke Task tool:
```
subagent_type: office:chief-architect
prompt: |
  Lead the Architecture phase.

  1. Read all docs in docs/office/
  2. Design system components and data flow
  3. Recommend tech stack
  4. Write docs/office/04-system-design.md
  5. Confirm with user
  6. When confirmed, update session.yaml: status: "imagine_complete", current_phase: "complete"
  7. Return: {"status": "complete", "document": "04-system-design.md"}
```

**After agent returns, say EXACTLY:**

> Architecture complete. System Design created. Run `/imagine` again to finalize.

**STOP. Do not continue.**

---

## IF: current_phase is "complete" OR status is "imagine_complete"

**Action:** Finalize and commit.

Run Bash:
```bash
git add docs/office/ && git commit -m "docs(office): complete imagine phase

- 01-vision-brief.md
- 02-prd.md
- 03-market-analysis.md
- 04-system-design.md

Co-Authored-By: Office Plugin <noreply@anthropic.com>"
```

**Say EXACTLY:**

> Design phase complete! All documents committed.
>
> Ready to run `/plan` to create your implementation plan.

**STOP. This is the end of /imagine.**

---

## Failure Modes

You are FAILING if you:
- [ ] Did more than ONE phase in a single invocation
- [ ] Skipped reading session.yaml state
- [ ] Continued after "STOP. Do not continue."
- [ ] Spawned multiple agents in one invocation

**ONE invocation = ONE action. Then STOP.**
