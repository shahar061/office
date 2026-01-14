---
description: "Transform a rough idea into comprehensive design documents through collaborative dialogue with your virtual startup team"
---

# STOP. Read this ENTIRE command before taking ANY action.

**You are about to fail if you:**
- Skip to calling an agent without checking session.yaml first
- Assume you know what phase to run without reading session.yaml
- Call office:ceo directly without completing Step 1

## Step 1: Check Session State (MANDATORY)

Run this Bash command NOW, before anything else:

```bash
ls docs/office/session.yaml 2>/dev/null && echo "EXISTS" || echo "NOT_EXISTS"
```

## Step 2: Route Based on Result

**If the output was "NOT_EXISTS":**

1. Call the Task tool:
   - subagent_type: `office:agent-organizer`
   - prompt: `Create the /imagine session. Run mkdir -p docs/office, then use Write to create docs/office/session.yaml with: created/updated ISO timestamps, status: "in_progress", current_phase: "discovery". You MUST use tools.`

2. After agent returns, verify: `ls docs/office/session.yaml`

3. Say EXACTLY: "Session created. Run `/imagine` again to start Discovery phase."

4. STOP. Do not continue.

**If the output was "EXISTS":**

1. Read `docs/office/session.yaml`
2. Note the `current_phase` value
3. Route to the correct agent based on phase:

| Phase | Agent | Task |
|-------|-------|------|
| `discovery` | `office:ceo` | Lead discovery, create 01-vision-brief.md, update phase to "definition" |
| `definition` | `office:product-manager` | Create 02-prd.md, update phase to "validation" |
| `validation` | `office:market-researcher` | Create 03-market-analysis.md, update phase to "architecture" |
| `architecture` | `office:chief-architect` | Create 04-system-design.md, update status to "imagine_complete" |
| `complete` | None | Run `git add docs/office/ && git commit`, say "Design complete, run /plan" |

4. After agent completes, verify the expected document was created
5. Say what was completed and what to run next
6. STOP after one phase

## Failure Modes

You are FAILING if you:
- [ ] Called any agent before running the `ls` command in Step 1
- [ ] Called office:ceo without first creating session.yaml
- [ ] Did not verify session.yaml exists before proceeding
