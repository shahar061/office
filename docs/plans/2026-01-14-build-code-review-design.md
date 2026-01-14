# Build Code Review Integration Design

## Overview

Enhance the `/build` workflow with integrated code review after each task, replacing local workspace skills with superpowers equivalents.

## Changes Summary

| Action | Target |
|--------|--------|
| Remove | `skills/workspace-prepare/` |
| Remove | `skills/workspace-cleanup/` |
| Create | `skills/handling-code-review/SKILL.md` |
| Modify | `skills/build/SKILL.md` |
| Modify | Dashboard (add "In Review" column) |

## New Build Flow

```
/build starts
  │
  ├─► Feature starts
  │     └─► superpowers:using-git-worktrees
  │
  ├─► Task executes
  │     └─► superpowers:requesting-code-review
  │           └─► If issues: office:handling-code-review (max 3 cycles)
  │
  ├─► Feature completes
  │     └─► superpowers:finishing-a-development-branch
  │
  └─► Build complete
```

## Worktree Integration

### Replacing Local Skills

| Current | New |
|---------|-----|
| `office:workspace-prepare` | `superpowers:using-git-worktrees` |
| `office:workspace-cleanup` | `superpowers:finishing-a-development-branch` |

### Timing

**Feature start:**
- Invoke `superpowers:using-git-worktrees`
- Creates isolated worktree for the feature branch
- Sets up environment

**Feature complete:**
- Invoke `superpowers:finishing-a-development-branch`
- Presents options based on completion policy (merge/PR/cleanup)
- Cleans up worktree

## Task Execution with Code Review

### Task Status Progression

```
pending → in_progress → in_review → completed
```

### Flow Diagram

```
Agent picks task (status: in_progress)
        │
        ▼
Execute task
        │
        ▼
Request code review (status: in_review)
        │
        ├─► Clean → (status: completed, review_status: clean)
        │
        └─► Issues → Handle CR → Re-request review (stays: in_review)
                                        │
                                        └─► After 3 attempts → (status: completed, review_status: has-warnings)
```

### Review Loop

1. Task completes execution
2. Set task status to `in_review`
3. Invoke `superpowers:requesting-code-review`
4. If review is clean:
   - Set status to `completed`
   - Set `review_status` to `clean`
5. If review has issues:
   - Invoke `office:handling-code-review` to process feedback
   - Re-request review (max 3 attempts)
   - After 3 attempts: set status to `completed`, `review_status` to `has-warnings`
6. Move to next task

## The `handling-code-review` Skill

### Purpose

Process code review feedback with technical rigor. Emphasizes verification over performative agreement.

### Response Pattern

1. **READ:** Complete feedback without reacting
2. **UNDERSTAND:** Restate requirement in own words (or ask)
3. **VERIFY:** Check against codebase reality
4. **EVALUATE:** Technically sound for THIS codebase?
5. **RESPOND:** Technical acknowledgment or reasoned pushback
6. **IMPLEMENT:** One item at a time, test each

### Escalation Path

If unclear on feedback during UNDERSTAND step, ask `@office:team-lead` agent for project context.

### Implementation Order

For multi-item feedback:
1. Clarify anything unclear FIRST
2. Then implement in order:
   - Blocking issues (breaks, security)
   - Simple fixes (typos, imports)
   - Complex fixes (refactoring, logic)
3. Test each fix individually
4. Verify no regressions

### When to Push Back

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
- Signal if uncomfortable: "Strange things are afoot at the Circle K"

### YAGNI Check

If reviewer suggests "implementing properly":
1. Grep codebase for actual usage
2. If unused: "This endpoint isn't called. Remove it (YAGNI)?"
3. If used: Implement properly

### Acknowledgment Style

When feedback IS correct:
- "Fixed. [Brief description of what changed]"
- "Good catch - [specific issue]. Fixed in [location]."
- Just fix it and show in the code

Never use:
- "You're absolutely right!"
- "Great point!"
- "Thanks for catching that!"
- Any gratitude expression

### Correcting Pushback

If you pushed back and were wrong:
- "You were right - I checked [X] and it does [Y]. Implementing now."
- "Verified this and you're correct. My initial understanding was wrong because [reason]. Fixing."

No long apologies. State correction factually and move on.

## State Tracking

### Updated `build-state.yaml` Schema

```yaml
build:
  started_at: "2026-01-14T10:30:00Z"
  status: in_progress
  completion_policy: checkpoint
  retry_limit: 3

features:
  - id: user-auth
    status: in_progress
    branch: feature/user-auth
    worktree: /path/to/.worktrees/user-auth
    tasks:
      - id: auth-1
        status: in_review          # New status
        agent: backend-engineer
        attempts: 1
        review_attempts: 2         # New field
        review_status: null        # New field: clean | has-warnings
        current_step: 5

      - id: auth-2
        status: completed
        agent: backend-engineer
        attempts: 1
        review_attempts: 1
        review_status: clean

      - id: auth-3
        status: completed
        agent: backend-engineer
        attempts: 2
        review_attempts: 3
        review_status: has-warnings  # Flagged for human review
```

### New Fields

| Field | Type | Description |
|-------|------|-------------|
| `review_attempts` | number | Count of code review cycles (max 3) |
| `review_status` | string | `clean` or `has-warnings` |

### Task Statuses

| Status | Description |
|--------|-------------|
| `pending` | Not started |
| `in_progress` | Agent executing |
| `in_review` | Code review in progress |
| `completed` | Done (check review_status for warnings) |

## Dashboard Updates

### New Kanban Column

Add "In Review" column between "In Progress" and "Completed":

```
Pending | In Progress | In Review | Completed
```

### Warning Indicator

Tasks with `review_status: has-warnings` should display a yellow warning indicator in the Completed column, signaling human review needed.

## Files Changed

### Create

- `skills/handling-code-review/SKILL.md`

### Modify

- `skills/build/SKILL.md`
  - Replace `workspace:prepare` with `superpowers:using-git-worktrees`
  - Replace `workspace:cleanup` with `superpowers:finishing-a-development-branch`
  - Add code review step after task execution
  - Add `in_review` status handling
  - Update build-state.yaml schema documentation
- `dashboard/` (add In Review column, warning indicators)
- `agents/agent-organizer.md` (if it references workspace skills)

### Delete

- `skills/workspace-prepare/SKILL.md`
- `skills/workspace-cleanup/SKILL.md`

## Document Availability in Worktrees

Design documents from `/imagine` and `/plan` are committed to git before `/build` runs. Since worktrees are created from the main branch after these commits, all docs are automatically available in every worktree. No gitignore changes needed.
