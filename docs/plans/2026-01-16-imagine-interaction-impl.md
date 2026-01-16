# /imagine Interaction Refinement - Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Refine agent interaction patterns in /imagine for faster, more purposeful dialogue.

**Architecture:** Update three agent prompts in skills/imagining/SKILL.md - PM gets autonomy choice + batching, Market Researcher becomes non-interactive, Architect gets tech stack autonomy + budget questions.

**Tech Stack:** Markdown skill files

---

## Task 1: Update Product Manager Prompt

**Files:**
- Modify: `skills/imagining/SKILL.md` (lines 90-106)

**Step 1: Replace the Product Manager section**

Find the section "### After Discovery → Spawn Product Manager" and replace the entire prompt with:

```markdown
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
```

**Step 2: Verify the edit**

Ensure the Product Manager section is updated and properly formatted.

**Step 3: Commit**

```bash
git add skills/imagining/SKILL.md
git commit -m "feat(imagine): PM gets autonomy choice + batched questions"
```

---

## Task 2: Update Market Researcher Prompt

**Files:**
- Modify: `skills/imagining/SKILL.md` (lines 108-123)

**Step 1: Replace the Market Researcher section**

Find the section "### After Definition → Spawn Market Researcher" and replace with:

```markdown
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
```

**Step 2: Verify the edit**

Ensure the Market Researcher section is updated.

**Step 3: Commit**

```bash
git add skills/imagining/SKILL.md
git commit -m "feat(imagine): Market Researcher runs non-interactively"
```

---

## Task 3: Update Chief Architect Prompt

**Files:**
- Modify: `skills/imagining/SKILL.md` (lines 125-141)

**Step 1: Replace the Chief Architect section**

Find the section "### After Validation → Spawn Chief Architect" and replace with:

```markdown
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
```

**Step 2: Verify the edit**

Ensure the Chief Architect section is updated with the two-phase interaction.

**Step 3: Commit**

```bash
git add skills/imagining/SKILL.md
git commit -m "feat(imagine): Architect gets tech stack autonomy + budget choice"
```

---

## Task 4: Final Verification

**Step 1: Review all changes**

```bash
git log --oneline -5
git diff master..HEAD --stat
```

**Step 2: Verify skill structure**

Ensure all three sections are properly formatted:

```bash
grep -n "After Discovery" skills/imagining/SKILL.md
grep -n "After Definition" skills/imagining/SKILL.md
grep -n "After Validation" skills/imagining/SKILL.md
```

**Step 3: Final commit if needed**

If any formatting fixes:

```bash
git add -A
git commit -m "fix: formatting cleanup"
```

---

## Summary

| Task | Section | Change |
|------|---------|--------|
| 1 | Product Manager | Autonomy choice + 2-3 questions per batch |
| 2 | Market Researcher | Non-interactive (intro → research → summary) |
| 3 | Chief Architect | Tech stack autonomy + budget + conditional dialogue |
| 4 | - | Final verification |

**Estimated commits:** 3-4
**Files changed:** 1 (skills/imagining/SKILL.md)
