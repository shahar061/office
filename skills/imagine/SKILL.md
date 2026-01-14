---
name: imagine
description: "Use when a user wants to develop a rough idea into a product design. Activates a virtual startup team that guides the user through Discovery, Definition, Validation, and Architecture phases. Creates session.yaml and four design documents."
---

# /imagine - STRICT EXECUTION REQUIRED

<CRITICAL>
This skill uses EXPLICIT Task tool invocations. You MUST:
1. Execute steps IN ORDER - no skipping
2. Use the Task tool EXACTLY as specified
3. WAIT for each Task to complete before proceeding
4. NEVER improvise dialogue, agents, or document names

If you find yourself typing dialogue without having invoked a Task tool first, STOP. You are doing it wrong.
</CRITICAL>

---

## STEP 1: Spawn Agent Organizer

**DO THIS NOW. Do not greet the user. Do not ask questions. Invoke the Task tool.**

```
Task tool parameters:
  subagent_type: office:agent-organizer
  prompt: |
    Set up the /imagine session.

    1. Run: mkdir -p docs/office
    2. Check if docs/office/session.yaml exists
    3. If exists: Read it, return {"session_status": "resuming", "current_phase": "...", "topic": "..."}
    4. If not exists: Write docs/office/session.yaml with initial state, return {"session_status": "new", "current_phase": "discovery", "topic": "pending"}

    You MUST use Bash and Write tools. Return JSON only.
```

**STOP HERE.** Wait for the Agent Organizer to return before proceeding to Step 2.

---

## STEP 2: Route Based on Response

Read the JSON returned by Agent Organizer. Take EXACTLY ONE of these actions:

| session_status | Action |
|----------------|--------|
| `"new"` | Proceed to STEP 3 |
| `"resuming"` | Spawn the agent for `current_phase` (see Phase Agent Table below) |
| `"complete"` | Tell user: "Design phase complete. Run `/plan` to continue." Then STOP. |

**Phase Agent Table:**

| current_phase | subagent_type |
|---------------|---------------|
| discovery | office:ceo |
| definition | office:product-manager |
| validation | office:market-researcher |
| architecture | office:chief-architect |

**DO NOT** add your own commentary. Just route.

---

## STEP 3: Spawn CEO for Discovery

**Invoke the Task tool NOW:**

```
Task tool parameters:
  subagent_type: office:ceo
  prompt: |
    Lead the Discovery phase for /imagine.

    Your job: Understand the user's idea through collaborative dialogue.
    - Ask about the problem being solved
    - Identify target users
    - Explore the vision
    - Ask ONE question at a time

    When you have enough understanding:
    1. Use the Write tool to create docs/office/01-vision-brief.md
    2. Show the user what you wrote
    3. Ask: "Does this capture your vision?"

    Return when user confirms the Vision Brief is complete.
```

**STOP HERE.** Wait for the CEO agent to complete before proceeding to Step 4.

**FORBIDDEN:**
- Do NOT roleplay as the CEO yourself
- Do NOT write the Vision Brief yourself
- Do NOT ask discovery questions yourself

---

## STEP 4: Phase Transition Loop

After each phase agent completes, do EXACTLY this sequence:

### 4A: Checkpoint with Agent Organizer

**Invoke the Task tool:**

```
Task tool parameters:
  subagent_type: office:agent-organizer
  prompt: |
    Checkpoint: [COMPLETED_PHASE] → [NEXT_PHASE] transition.

    1. Verify docs/office/[DOCUMENT].md exists
    2. Edit docs/office/session.yaml:
       - Set current_phase: "[NEXT_PHASE]"
       - Append "[COMPLETED_PHASE]" to completed_phases
       - Update "updated" timestamp
    3. Return confirmation

    You MUST use Edit tool. Do not describe changes.
```

### 4B: Spawn Next Phase Agent

**Use this table - no exceptions:**

| Completed Phase | Document to Verify | Next Agent | Next Phase |
|-----------------|-------------------|------------|------------|
| discovery | 01-vision-brief.md | office:product-manager | definition |
| definition | 02-prd.md | office:market-researcher | validation |
| validation | 03-market-analysis.md | office:chief-architect | architecture |

**Invoke the Task tool for the next agent:**

| Agent | Prompt |
|-------|--------|
| office:product-manager | "Lead the Definition phase. Review docs/office/01-vision-brief.md. Define personas, user stories, prioritize features. Write docs/office/02-prd.md. Confirm with user before completing." |
| office:market-researcher | "Lead the Validation phase. Review docs/office/02-prd.md. Use WebSearch to research market. Analyze competitors. Write docs/office/03-market-analysis.md. Confirm with user before completing." |
| office:chief-architect | "Lead the Architecture phase. Review all docs in docs/office/. Design system components, recommend tech stack. Consult specialists if needed. Write docs/office/04-system-design.md. Confirm with user before completing." |

**STOP after each agent.** Wait for completion before next checkpoint.

---

## STEP 5: Complete Imagine Phase

After the Chief Architect agent completes:

### 5A: Final Checkpoint

**Invoke the Task tool:**

```
Task tool parameters:
  subagent_type: office:agent-organizer
  prompt: |
    Final checkpoint: Mark imagine phase complete.

    1. Verify docs/office/04-system-design.md exists
    2. Edit docs/office/session.yaml:
       - Set status: "imagine_complete"
       - Set current_phase: "complete"
       - Append "architecture" to completed_phases
       - Update "updated" timestamp
    3. Return confirmation
```

### 5B: Commit Documents

**Run this Bash command:**

```bash
git add docs/office/ && git commit -m "docs(office): complete imagine phase

Generated design documents:
- 01-vision-brief.md
- 02-prd.md
- 03-market-analysis.md
- 04-system-design.md
- session.yaml

Co-Authored-By: Office Plugin <noreply@anthropic.com>"
```

### 5C: Notify User

**Say EXACTLY this:**

> Design phase complete! All documents committed to git.
>
> Ready to run `/plan` to create your implementation plan?

**DONE.** Do not continue beyond this point.

---

## Failure Modes to Avoid

You are FAILING if you:
- [ ] Typed "Let me ask you some questions..." without invoking Task tool first
- [ ] Described what an agent would do instead of spawning it
- [ ] Used agent names not in the table (e.g., "Business Analyst", "UX Designer", "Tech Lead")
- [ ] Created documents with wrong names (e.g., "01-product-vision.md" instead of "01-vision-brief.md")
- [ ] Roleplayed as multiple experts yourself instead of spawning agents

If ANY of these are true, STOP and start over from STEP 1.
