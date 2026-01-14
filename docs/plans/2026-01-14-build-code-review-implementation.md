# Build Code Review Integration - Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Integrate code review into the /build workflow, replacing local workspace skills with superpowers equivalents.

**Architecture:** After each task completes, request code review via `superpowers:requesting-code-review`. If issues found, process with `office:handling-code-review` skill (max 3 cycles). Replace workspace-prepare/cleanup with `superpowers:using-git-worktrees` and `superpowers:finishing-a-development-branch`.

**Tech Stack:** Markdown skills, YAML state files, JavaScript dashboard

---

## Task 1: Create handling-code-review Skill

**Files:**
- Create: `skills/handling-code-review/SKILL.md`

**Step 1: Create the skill directory**

Run: `mkdir -p skills/handling-code-review`
Expected: Directory created (or already exists)

**Step 2: Write the skill file**

Create `skills/handling-code-review/SKILL.md`:

```markdown
---
name: handling-code-review
description: "Use when code review feedback requires fixes - emphasizes technical verification over performative agreement"
---

# handling-code-review - Process Code Review Feedback

## Overview

Code review requires technical evaluation, not emotional performance.

**Core principle:** Verify before implementing. Ask before assuming. Technical correctness over social comfort.

## The Response Pattern

WHEN receiving code review feedback:

1. **READ:** Complete feedback without reacting
2. **UNDERSTAND:** Restate requirement in own words (or ask)
3. **VERIFY:** Check against codebase reality
4. **EVALUATE:** Technically sound for THIS codebase?
5. **RESPOND:** Technical acknowledgment or reasoned pushback
6. **IMPLEMENT:** One item at a time, test each

## Escalation for Unclear Feedback

If there are open questions in the UNDERSTAND step, ask `@office:team-lead` who has more context on the project to explain it for you.

## YAGNI Check for "Professional" Features

IF reviewer suggests "implementing properly":

1. Grep codebase for actual usage
2. IF unused: "This endpoint isn't called. Remove it (YAGNI)?"
3. IF used: Then implement properly

## Implementation Order

FOR multi-item feedback:

1. Clarify anything unclear FIRST
2. Then implement in this order:
   - Blocking issues (breaks, security)
   - Simple fixes (typos, imports)
   - Complex fixes (refactoring, logic)
3. Test each fix individually
4. Verify no regressions

## When To Push Back

Push back when:
- Suggestion breaks existing functionality
- Reviewer lacks full context
- Violates YAGNI (unused feature)
- Technically incorrect for this stack
- Legacy/compatibility reasons exist

How to push back:
- Use technical reasoning, not defensiveness
- Ask specific questions
- Reference working tests/code
- Involve your human partner if architectural
- Signal if uncomfortable pushing back: "Strange things are afoot at the Circle K"

## Acknowledging Correct Feedback

When feedback IS correct:

- "Fixed. [Brief description of what changed]"
- "Good catch - [specific issue]. Fixed in [location]."
- [Just fix it and show in the code]

**Never use:**
- "You're absolutely right!"
- "Great point!"
- "Thanks for catching that!"
- "Thanks for [anything]"
- ANY gratitude expression

**Why no thanks:** Actions speak. Just fix it. The code itself shows you heard the feedback.

If you catch yourself about to write "Thanks": DELETE IT. State the fix instead.

## Gracefully Correcting Your Pushback

If you pushed back and were wrong:

- "You were right - I checked [X] and it does [Y]. Implementing now."
- "Verified this and you're correct. My initial understanding was wrong because [reason]. Fixing."

No long apology. No defending why you pushed back. No over-explaining. State the correction factually and move on.

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| Performative agreement | State requirement or just act |
| Blind implementation | Verify against codebase first |
| Batch without testing | One at a time, test each |
| Assuming reviewer is right | Check if breaks things |
| Avoiding pushback | Technical correctness > comfort |
| Partial implementation | Clarify all items first |
| Can't verify, proceed anyway | State limitation, ask for direction |

## Real Examples

**Performative Agreement (Bad):**

Reviewer: "Remove legacy code"

"You're absolutely right! Let me remove that..."

**Technical Verification (Good):**

Reviewer: "Remove legacy code"

"Checking... build target is 10.15+, this API needs 13+. Need legacy for backward compat. Current impl has wrong bundle ID - fix it or drop pre-13 support?"

**YAGNI (Good):**

Reviewer: "Implement proper metrics tracking with database, date filters, CSV export"

"Grepped codebase - nothing calls this endpoint. Remove it (YAGNI)? Or is there usage I'm missing?"

**Unclear Item (Good):**

Human partner: "Fix items 1-6"

You understand 1,2,3,6. Unclear on 4,5.

"Understand 1,2,3,6. Need clarification on 4 and 5 before implementing."
```

**Step 3: Verify file created**

Run: `cat skills/handling-code-review/SKILL.md | head -10`
Expected: Shows frontmatter with name and description

**Step 4: Commit**

```bash
git add skills/handling-code-review/SKILL.md
git commit -m "feat: add handling-code-review skill

Processes code review feedback with technical rigor:
- READ → UNDERSTAND → VERIFY → EVALUATE → RESPOND → IMPLEMENT
- Escalates unclear items to @office:team-lead
- YAGNI checks for over-engineering suggestions
- No performative agreement, just fix and state"
```

---

## Task 2: Update build/SKILL.md - Replace Workspace Skills

**Files:**
- Modify: `skills/build/SKILL.md:115-116` (workspace:prepare reference)
- Modify: `skills/build/SKILL.md:147-148` (workspace:cleanup reference)

**Step 1: Replace workspace:prepare with superpowers skill**

In `skills/build/SKILL.md`, find line 115:
```
     b. Call workspace:prepare skill
```

Replace with:
```
     b. Invoke superpowers:using-git-worktrees skill
```

**Step 2: Replace workspace:cleanup with superpowers skill**

In `skills/build/SKILL.md`, find line 147-148:
```
       - auto-merge: merge to main, delete branch
       - pr: create PR, wait for approval
       - checkpoint: pause for user review
     - Call workspace:cleanup skill
```

Replace with:
```
       - auto-merge: merge to main, delete branch
       - pr: create PR, wait for approval
       - checkpoint: pause for user review
     - Invoke superpowers:finishing-a-development-branch skill
```

**Step 3: Verify changes**

Run: `grep -n "superpowers:" skills/build/SKILL.md`
Expected: Shows lines with `superpowers:using-git-worktrees` and `superpowers:finishing-a-development-branch`

**Step 4: Commit**

```bash
git add skills/build/SKILL.md
git commit -m "refactor(build): replace workspace skills with superpowers equivalents

- workspace:prepare → superpowers:using-git-worktrees
- workspace:cleanup → superpowers:finishing-a-development-branch"
```

---

## Task 3: Update build/SKILL.md - Add Code Review Flow

**Files:**
- Modify: `skills/build/SKILL.md` (add section after line 135)

**Step 1: Add code review section after task execution**

In `skills/build/SKILL.md`, find the section around line 129-135:
```
  4. Agent executes task:
     - Follows TDD steps from implementation spec
     - Step 1: Write failing test
     - Step 2: Run test, verify failure
     - Step 3: Write implementation
     - Step 4: Run test, verify pass
     - Step 5: Commit
```

Add after it:
```

  4b. Code review (after each task):
     - Update task status to `in_review` in build-state.yaml
     - Invoke superpowers:requesting-code-review
     - If review is clean:
       - Set status to `completed`, review_status to `clean`
     - If review has issues:
       - Invoke office:handling-code-review to process feedback
       - Re-request review (max 3 attempts)
       - After 3 attempts: set status to `completed`, review_status to `has-warnings`
     - Move to next task
```

**Step 2: Update step completion section**

Find the section around line 137-139:
```
  5. On step completion:
     - Update build-state.yaml (step-level)
     - If step 5 done → task complete
     - If all tasks done → feature complete
```

Replace with:
```
  5. On step completion:
     - Update build-state.yaml (step-level)
     - If step 5 done → proceed to code review (step 4b)
     - If code review passes → task complete
     - If all tasks done → feature complete
```

**Step 3: Verify changes**

Run: `grep -n "in_review\|requesting-code-review\|handling-code-review" skills/build/SKILL.md`
Expected: Shows the new code review section

**Step 4: Commit**

```bash
git add skills/build/SKILL.md
git commit -m "feat(build): add code review after each task

- New in_review status before completed
- Invokes superpowers:requesting-code-review
- Uses office:handling-code-review for feedback
- Max 3 review cycles, then has-warnings flag"
```

---

## Task 4: Update build/SKILL.md - Add New State Fields

**Files:**
- Modify: `skills/build/SKILL.md` (update build-state.yaml schema section)

**Step 1: Find the task schema in build-state.yaml section**

Find the section around line 285-303 showing the task structure:
```yaml
      - id: auth-1
        status: completed
        agent: backend-engineer
        attempts: 1
        current_step: 5
        steps:
          ...
```

**Step 2: Add review tracking fields**

Update the task example to include new fields:
```yaml
      - id: auth-1
        status: completed
        agent: backend-engineer
        attempts: 1
        current_step: 5
        review_attempts: 1
        review_status: clean
        steps:
          ...
```

**Step 3: Add in_progress task example showing in_review status**

Find the in_progress task example (around line 315-326) and add a new example showing in_review:
```yaml
      - id: dash-2
        status: in_review
        agent: frontend-engineer
        attempts: 1
        current_step: 5
        review_attempts: 2
        steps:
          - step: 1
            status: completed
          - step: 2
            status: completed
          - step: 3
            status: completed
          - step: 4
            status: completed
          - step: 5
            status: completed
```

**Step 4: Add has-warnings example**

Add another task example showing has-warnings:
```yaml
      - id: dash-3
        status: completed
        agent: frontend-engineer
        attempts: 1
        current_step: 5
        review_attempts: 3
        review_status: has-warnings
```

**Step 5: Verify changes**

Run: `grep -n "review_attempts\|review_status\|in_review" skills/build/SKILL.md`
Expected: Shows the new fields in schema documentation

**Step 6: Commit**

```bash
git add skills/build/SKILL.md
git commit -m "docs(build): add review_attempts and review_status to state schema

New task fields:
- review_attempts: count of CR cycles (max 3)
- review_status: clean | has-warnings
- in_review status between in_progress and completed"
```

---

## Task 5: Update agent-organizer.md - Replace Workspace References

**Files:**
- Modify: `agents/agent-organizer.md:60` (workspace:prepare reference)
- Modify: `agents/agent-organizer.md:69` (workspace:cleanup reference)

**Step 1: Replace workspace:prepare reference**

In `agents/agent-organizer.md`, find line 60:
```
- Spawn workspace:prepare for ready features
```

Replace with:
```
- Invoke superpowers:using-git-worktrees for ready features
```

**Step 2: Replace workspace:cleanup reference**

Find line 69:
```
- Trigger workspace:cleanup after merge/PR
```

Replace with:
```
- Invoke superpowers:finishing-a-development-branch after merge/PR
```

**Step 3: Add code review announcement**

Find the Announcements section (around line 71-76). Add new announcement:
```
- "[Task] in code review... (Attempt N/3)"
- "Code review passed for [task]. Moving to next task."
- "Code review has warnings for [task]. Continuing with has-warnings flag."
```

**Step 4: Verify changes**

Run: `grep -n "superpowers:\|code review" agents/agent-organizer.md`
Expected: Shows superpowers skill references and code review announcements

**Step 5: Commit**

```bash
git add agents/agent-organizer.md
git commit -m "refactor(agent-organizer): update for code review workflow

- Replace workspace:prepare → superpowers:using-git-worktrees
- Replace workspace:cleanup → superpowers:finishing-a-development-branch
- Add code review status announcements"
```

---

## Task 6: Update Dashboard - Add Warning Indicator

**Files:**
- Modify: `dashboard/static/app.js:412-508` (renderTaskCard function)
- Modify: `dashboard/static/style.css` (add warning badge style)

Note: The dashboard already has "Review" column and `status-review` styling. Only need to add warning indicator for `review_status: has-warnings`.

**Step 1: Add warning badge to renderTaskCard function**

In `dashboard/static/app.js`, find the renderTaskCard function around line 412. After the retry badge logic (around line 421), add:

```javascript
    // Review warning badge
    let reviewWarningBadge = '';
    if (task.review_status === 'has-warnings') {
        reviewWarningBadge = '<span class="review-warning-badge">CR Warnings</span>';
    }
```

**Step 2: Add badge to card HTML**

Find the return statement in renderTaskCard (around line 482). Add `${reviewWarningBadge}` next to `${retryBadge}`:

```javascript
            <div class="flex items-start justify-between gap-2">
                <div class="flex-1 min-w-0">
                    ${featureTag}
                    <div class="font-medium text-sm mt-1">${escapeHtml(task.id)}</div>
                    <div class="text-sm text-gray-300 mt-0.5">${escapeHtml(task.title)}</div>
                </div>
                <div class="flex flex-col gap-1">
                    ${retryBadge}
                    ${reviewWarningBadge}
                </div>
            </div>
```

**Step 3: Add CSS for warning badge**

In `dashboard/static/style.css`, after the retry badge styles (around line 106), add:

```css
/* Review Warning Badge */
.review-warning-badge {
    @apply text-xs px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-400;
}
```

**Step 4: Verify changes**

Run: `grep -n "review_status\|review-warning" dashboard/static/app.js dashboard/static/style.css`
Expected: Shows the new badge logic and styling

**Step 5: Commit**

```bash
git add dashboard/static/app.js dashboard/static/style.css
git commit -m "feat(dashboard): add warning indicator for review_status

Shows orange 'CR Warnings' badge on tasks that exhausted
3 code review attempts without clean pass"
```

---

## Task 7: Delete Workspace Skills

**Files:**
- Delete: `skills/workspace-prepare/SKILL.md`
- Delete: `skills/workspace-cleanup/SKILL.md`

**Step 1: Verify files exist**

Run: `ls -la skills/workspace-prepare/ skills/workspace-cleanup/`
Expected: Shows the SKILL.md files in each directory

**Step 2: Remove workspace-prepare directory**

Run: `rm -rf skills/workspace-prepare`
Expected: Directory removed

**Step 3: Remove workspace-cleanup directory**

Run: `rm -rf skills/workspace-cleanup`
Expected: Directory removed

**Step 4: Verify removal**

Run: `ls skills/`
Expected: Shows remaining skills without workspace-prepare and workspace-cleanup

**Step 5: Commit**

```bash
git add -A
git commit -m "chore: remove workspace-prepare and workspace-cleanup skills

Replaced by:
- superpowers:using-git-worktrees
- superpowers:finishing-a-development-branch"
```

---

## Task 8: Update Task Status in Feature View

**Files:**
- Modify: `dashboard/static/app.js:280` (statuses array)
- Modify: `dashboard/static/app.js:308-314` (grid columns)

Note: Current code already has 'review' in statuses and a Review column. Need to update to use 'in_review' to match the new status name.

**Step 1: Update statuses array**

In `dashboard/static/app.js`, find line 280:
```javascript
    const statuses = ['queued', 'assigned', 'in_progress', 'review', 'done', 'completed', 'failed'];
```

Replace with:
```javascript
    const statuses = ['queued', 'assigned', 'in_progress', 'in_review', 'done', 'completed', 'failed'];
```

**Step 2: Update review column filter**

Find line 311:
```javascript
                ${renderStatusColumn('Review', feature.tasks.filter(t => t.status === 'review'))}
```

Replace with:
```javascript
                ${renderStatusColumn('In Review', feature.tasks.filter(t => t.status === 'in_review'))}
```

**Step 3: Update isTaskStuck function**

Find line 230:
```javascript
    if (task.status === 'done' || task.status === 'completed' || task.status === 'queued') return false;
```

Update to exclude in_review from stuck check (reviews can take time):
```javascript
    if (task.status === 'done' || task.status === 'completed' || task.status === 'queued' || task.status === 'in_review') return false;
```

**Step 4: Verify changes**

Run: `grep -n "in_review" dashboard/static/app.js`
Expected: Shows updated statuses array and review column filter

**Step 5: Commit**

```bash
git add dashboard/static/app.js
git commit -m "fix(dashboard): use in_review status consistently

- Update statuses array to use in_review
- Rename Review column to In Review
- Exclude in_review from stuck detection"
```

---

## Task 9: Add in_review Status Styling

**Files:**
- Modify: `dashboard/static/style.css:32-34` (status-review class)

**Step 1: Update review status class name**

In `dashboard/static/style.css`, find lines 32-34:
```css
.task-card.status-review {
    @apply border-purple-400;
}
```

Replace with:
```css
.task-card.status-in_review {
    @apply border-purple-400;
}
```

**Step 2: Verify change**

Run: `grep -n "status-in_review" dashboard/static/style.css`
Expected: Shows the updated class name

**Step 3: Commit**

```bash
git add dashboard/static/style.css
git commit -m "fix(dashboard): rename status-review to status-in_review

Matches the actual task status value in build-state.yaml"
```

---

## Summary

After completing all tasks:

| Created | Path |
|---------|------|
| New skill | `skills/handling-code-review/SKILL.md` |

| Modified | Changes |
|----------|---------|
| `skills/build/SKILL.md` | Superpowers refs, code review flow, state schema |
| `agents/agent-organizer.md` | Superpowers refs, CR announcements |
| `dashboard/static/app.js` | Warning badge, in_review status |
| `dashboard/static/style.css` | Warning badge style, in_review class |

| Deleted | Path |
|---------|------|
| Skill | `skills/workspace-prepare/` |
| Skill | `skills/workspace-cleanup/` |

Total commits: 9
