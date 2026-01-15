# Build Skill Redesign - Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the 380-line monolithic building skill with a lean orchestrator + 4 subagent prompt templates for autonomous execution with two-stage review.

**Architecture:** Lean orchestrator dispatches background tasks per feature. Each task uses a 4-subagent pipeline: Implementer → Clarifier (if needed) → Spec-Reviewer → Code-Reviewer. Fresh context per subagent.

**Tech Stack:** Markdown (Claude Code plugin skills/prompts)

---

## Task 1: Create Prompts Directory

**Files:**
- Create: `skills/building/prompts/` (directory)

**Step 1: Create the prompts directory**

```bash
mkdir -p skills/building/prompts
```

**Step 2: Verify directory exists**

```bash
ls -la skills/building/
```

Expected: Should show `prompts/` directory

**Step 3: Commit**

```bash
git add skills/building/prompts/.gitkeep 2>/dev/null || touch skills/building/prompts/.gitkeep && git add skills/building/prompts/.gitkeep
git commit -m "chore: create prompts directory for building skill"
```

---

## Task 2: Create Implementer Prompt

**Files:**
- Create: `skills/building/prompts/implementer.md`

**Step 1: Write the implementer prompt template**

Create `skills/building/prompts/implementer.md`:

```markdown
# Implementer Prompt

Use this template when dispatching an implementer subagent for a task.

## Template

~~~
Task tool (general-purpose):
  model: [from config - default: sonnet]
  description: "Implement [task-id]: [task-title]"
  prompt: |
    You are implementing: [task-id] - [task-title]

    Worktree: [worktree-path]
    Spec: Read docs/office/05-implementation-spec.md section "[task-id]"

    Files to modify:
    - [file1]
    - [file2]

    ## Instructions

    1. Read the spec section for this task
    2. Follow TDD steps exactly as written:
       - Write failing test
       - Verify test fails
       - Write implementation
       - Verify test passes
    3. Commit with message: "[task-id]: [description]"

    ## If Unclear

    If you cannot proceed due to missing information, respond EXACTLY:
    NEED_CLARIFICATION: [your specific question]

    Do not guess. Do not assume. Ask.

    ## When Done

    Respond with:
    DONE
    Files changed: [list]
    Test results: [pass/fail counts]
    Commit SHA: [sha]

    ## On Error

    If you encounter an unrecoverable error, respond:
    ERROR: [description of what went wrong]
~~~

## Variables

| Variable | Source |
|----------|--------|
| `[task-id]` | From tasks.yaml |
| `[task-title]` | From tasks.yaml |
| `[worktree-path]` | Feature worktree location |
| `[file1]`, `[file2]` | From implementation-spec.md task section |

## Expected Outputs

- `DONE` - Task completed successfully
- `NEED_CLARIFICATION: <question>` - Needs clarifier subagent
- `ERROR: <description>` - Unrecoverable error, may need flag
```

**Step 2: Verify file content**

```bash
head -20 skills/building/prompts/implementer.md
```

Expected: Should show the template header

**Step 3: Commit**

```bash
git add skills/building/prompts/implementer.md
git commit -m "feat(build): add implementer prompt template"
```

---

## Task 3: Create Clarifier Prompt

**Files:**
- Create: `skills/building/prompts/clarifier.md`

**Step 1: Write the clarifier prompt template**

Create `skills/building/prompts/clarifier.md`:

```markdown
# Clarifier Prompt

Use this template when an implementer needs clarification. Dispatched with Opus model for deep reasoning.

## Template

~~~
Task tool (general-purpose):
  model: [from config - default: opus]
  description: "Clarify question for [task-id]"
  prompt: |
    An implementer working on [task-id] needs clarification.

    Question: [implementer's question]

    Task context: [task-title]
    Worktree: [worktree-path]

    ## Your Job

    1. Explore the codebase to find the answer
    2. Check existing patterns, interfaces, conventions
    3. Provide a clear, actionable answer

    ## Response Format

    If you can answer from the codebase:
    ANSWERED: [your clear, actionable answer]

    If you cannot determine the answer from the codebase:
    FLAG: [reason - what information is missing that only the user can provide]
~~~

## Variables

| Variable | Source |
|----------|--------|
| `[task-id]` | From current task |
| `[task-title]` | From tasks.yaml |
| `[worktree-path]` | Feature worktree location |
| `[implementer's question]` | From implementer's NEED_CLARIFICATION response |

## Expected Outputs

- `ANSWERED: <answer>` - Re-dispatch implementer with this context
- `FLAG: <reason>` - Escalate to user (clarifier can't resolve)

## Notes

- Clarifier uses Opus model (configurable) for deep codebase reasoning
- Should be invoked rarely if implementation spec is good
- On FLAG, the orchestrator pauses the feature and asks the user
```

**Step 2: Verify file content**

```bash
head -20 skills/building/prompts/clarifier.md
```

**Step 3: Commit**

```bash
git add skills/building/prompts/clarifier.md
git commit -m "feat(build): add clarifier prompt template"
```

---

## Task 4: Create Spec-Reviewer Prompt

**Files:**
- Create: `skills/building/prompts/spec-reviewer.md`

**Step 1: Write the spec-reviewer prompt template**

Create `skills/building/prompts/spec-reviewer.md`:

```markdown
# Spec-Reviewer Prompt

Use this template to verify implementation matches specification exactly. Uses Haiku for fast, structured comparison.

## Template

~~~
Task tool (general-purpose):
  model: [from config - default: haiku]
  description: "Review spec compliance for [task-id]"
  prompt: |
    Review spec compliance for: [task-id] - [task-title]

    ## What Was Requested

    [Full task spec text from implementation-spec.md]

    ## What Was Built

    Files changed: [from implementer report]
    Commit: [commit SHA]
    Worktree: [worktree-path]

    ## Your Job

    Read the actual code in the worktree. Verify:
    - All requirements implemented (nothing missing)
    - No extra work (nothing unneeded)
    - Matches spec intent

    ## CRITICAL: Verify by Reading Code

    Do NOT trust the implementer's report. Read the actual files.
    Check each requirement against the actual implementation.

    ## Response Format

    If fully compliant:
    COMPLIANT

    If issues found:
    ISSUES:
    - [Missing/Extra/Wrong]: [specific issue with file:line reference]
~~~

## Variables

| Variable | Source |
|----------|--------|
| `[task-id]` | From current task |
| `[task-title]` | From tasks.yaml |
| `[Full task spec text]` | Copy from implementation-spec.md |
| `[from implementer report]` | Files from implementer's DONE response |
| `[commit SHA]` | From implementer's DONE response |
| `[worktree-path]` | Feature worktree location |

## Expected Outputs

- `COMPLIANT` - Proceed to code-reviewer
- `ISSUES: <list>` - Re-dispatch implementer to fix (max 3 loops)

## Notes

- Uses Haiku model (configurable) for speed
- Structured comparison task - doesn't need creative reasoning
- On 3 failed attempts, flag to user as `spec_review_exhausted`
```

**Step 2: Verify file content**

```bash
head -20 skills/building/prompts/spec-reviewer.md
```

**Step 3: Commit**

```bash
git add skills/building/prompts/spec-reviewer.md
git commit -m "feat(build): add spec-reviewer prompt template"
```

---

## Task 5: Create Code-Reviewer Prompt

**Files:**
- Create: `skills/building/prompts/code-reviewer.md`

**Step 1: Write the code-reviewer prompt template**

Create `skills/building/prompts/code-reviewer.md`:

```markdown
# Code-Reviewer Prompt

Use this template to review code quality after spec compliance passes. Uses Sonnet for quality judgment.

## Template

~~~
Task tool (general-purpose):
  model: [from config - default: sonnet]
  description: "Review code quality for [task-id]"
  prompt: |
    Review code quality for: [task-id] - [task-title]

    Worktree: [worktree-path]
    Diff: [base-sha]..[head-sha]

    ## Your Job

    Review the diff for:
    - Code quality and readability
    - Test coverage and correctness
    - Consistency with codebase patterns
    - No security issues
    - No obvious bugs

    ## What to Ignore

    - Spec compliance (already verified)
    - Style preferences (unless egregious)
    - Minor naming quibbles

    ## Response Format

    If approved:
    APPROVED

    If issues found:
    ISSUES:
    - [Critical/Important/Minor]: [issue description with file:line reference]

    Critical = must fix (security, data loss, crashes)
    Important = should fix (bugs, bad patterns)
    Minor = nice to fix (readability, minor improvements)
~~~

## Variables

| Variable | Source |
|----------|--------|
| `[task-id]` | From current task |
| `[task-title]` | From tasks.yaml |
| `[worktree-path]` | Feature worktree location |
| `[base-sha]` | Commit before task started |
| `[head-sha]` | Current commit (from implementer) |

## Expected Outputs

- `APPROVED` - Task complete, proceed to next task
- `ISSUES: <list>` - Re-dispatch implementer to fix (max 3 loops)

## Notes

- Uses Sonnet model (configurable) for quality judgment
- Only dispatched AFTER spec-reviewer passes
- On 3 failed attempts, flag to user as `code_review_exhausted` (WARNING severity)
```

**Step 2: Verify file content**

```bash
head -20 skills/building/prompts/code-reviewer.md
```

**Step 3: Commit**

```bash
git add skills/building/prompts/code-reviewer.md
git commit -m "feat(build): add code-reviewer prompt template"
```

---

## Task 6: Rewrite SKILL.md - Part 1 (Header and Prerequisites)

**Files:**
- Modify: `skills/building/SKILL.md`

**Step 1: Backup current skill**

```bash
cp skills/building/SKILL.md skills/building/SKILL.md.bak
```

**Step 2: Write new header and prerequisites section**

Replace `skills/building/SKILL.md` with:

```markdown
---
name: building
description: "Execute implementation plan with autonomous subagent pipeline. Two-stage review (spec + quality). Flags only for critical blockers."
---

# /build - Execute Implementation Plan

## Overview

Autonomous execution of the implementation plan from `/warroom`. Each task runs through a 4-subagent pipeline: Implementer → Clarifier (if needed) → Spec-Reviewer → Code-Reviewer.

**Key principles:**
- Features run in **parallel** (background tasks, isolated worktrees)
- Tasks run **sequentially** within a feature
- Each subagent is **fresh** (no inherited context)
- **No man-in-loop** unless critical blocker (flag)

## Prerequisites

Requires completed `/warroom` session with:
- `docs/office/tasks.yaml` - Feature-grouped task structure
- `docs/office/05-implementation-spec.md` - TDD steps per task
- `docs/office/session.yaml` with `status: plan_complete`

## Startup

### 1. Validate Session

```yaml
Check:
  - session.yaml exists with status: plan_complete
  - tasks.yaml exists
  - 05-implementation-spec.md exists

If any missing:
  "Run /warroom first to create implementation plan."
```

### 2. Check for Resume

```yaml
If docs/office/build-state.yaml exists:
  If status: in_progress
    Ask: "Found in-progress build. Resume or start fresh?"
    If resume: Load state, skip completed tasks
    If fresh: Delete build-state.yaml, start over
```

### 3. Configure Build

Ask user (use AskUserQuestion tool):

**Completion policy:**
- `auto-merge` - Merge to main automatically
- `pr` - Create pull request for review
- `checkpoint` - Pause for human review (default)

**Model preset:**
- `default` - Sonnet/Opus/Haiku/Sonnet (recommended)
- `fast` - Sonnet/Sonnet/Haiku/Haiku
- `quality` - Opus/Opus/Sonnet/Sonnet

**Max parallel features:** (default: 3)

**Retry limit:** (default: 3)

### 4. Initialize State

Create `docs/office/build-state.yaml`:

```yaml
build:
  started_at: "[timestamp]"
  status: in_progress

  config:
    completion_policy: [selected]
    retry_limit: [selected]
    max_parallel_features: [selected]
    models:
      implementer: [from preset]
      clarifier: [from preset]
      spec_reviewer: [from preset]
      code_reviewer: [from preset]

features: []
flags: []
```

### 5. Start Dashboard

**REQUIRED:** Invoke `/office:dashboard` skill to start build dashboard.

```
Use the Skill tool: skill: "office:dashboard"
```
```

**Step 3: Verify header written**

```bash
head -80 skills/building/SKILL.md
```

**Step 4: Commit**

```bash
git add skills/building/SKILL.md
git commit -m "feat(build): rewrite skill header and prerequisites"
```

---

## Task 7: Rewrite SKILL.md - Part 2 (Main Loop)

**Files:**
- Modify: `skills/building/SKILL.md`

**Step 1: Append main loop section**

Append to `skills/building/SKILL.md`:

```markdown

## Main Loop

```
While features remain incomplete:

  1. Find ready features:
     - Status is 'pending'
     - All depends_on features are 'completed'

  2. Dispatch ready features in parallel:
     - Create worktree (superpowers:using-git-worktrees)
     - Start feature-executor as background task
     - Update build-state.yaml: feature status = in_progress

  3. Monitor background tasks:
     - Poll for completion or flags
     - On flag: Handle flag (see Flag Handling)
     - On completion: Check newly unblocked features

  4. Repeat until all features completed or aborted
```

### Dispatching Features

**IMPORTANT:** To run features in parallel, invoke multiple Task tools in a SINGLE message.

```yaml
For each ready feature:
  Task tool:
    subagent_type: general-purpose
    run_in_background: true
    model: sonnet
    description: "Execute feature: [feature-id]"
    prompt: |
      Execute feature [feature-id] in worktree [worktree-path].

      Tasks to complete (in order):
      [list of task-ids from tasks.yaml]

      For EACH task, follow this pipeline:

      1. IMPLEMENTER
         Use prompt template: ./prompts/implementer.md
         Model: [config.models.implementer]

         Dispatch subagent, wait for response:
         - DONE → proceed to step 3
         - NEED_CLARIFICATION → proceed to step 2
         - ERROR → retry up to [retry_limit], then FLAG

      2. CLARIFIER (only if NEED_CLARIFICATION)
         Use prompt template: ./prompts/clarifier.md
         Model: [config.models.clarifier]

         Dispatch subagent, wait for response:
         - ANSWERED → re-dispatch implementer with answer
         - FLAG → exit with flag (clarifier_blocked)

      3. SPEC-REVIEWER
         Use prompt template: ./prompts/spec-reviewer.md
         Model: [config.models.spec_reviewer]

         Dispatch subagent, wait for response:
         - COMPLIANT → proceed to step 4
         - ISSUES → re-dispatch implementer to fix
           - Max 3 loops
           - If exhausted → FLAG (spec_review_exhausted)

      4. CODE-REVIEWER
         Use prompt template: ./prompts/code-reviewer.md
         Model: [config.models.code_reviewer]

         Dispatch subagent, wait for response:
         - APPROVED → task complete, next task
         - ISSUES → re-dispatch implementer to fix
           - Max 3 loops
           - If exhausted → FLAG (code_review_exhausted, WARNING)

      After each task: Update build-state.yaml

      On FLAG: Exit with flag details
      On all tasks complete: Exit with success
```
```

**Step 2: Verify main loop appended**

```bash
grep -n "Main Loop" skills/building/SKILL.md
```

**Step 3: Commit**

```bash
git add skills/building/SKILL.md
git commit -m "feat(build): add main loop and feature dispatch"
```

---

## Task 8: Rewrite SKILL.md - Part 3 (Flag Handling and Completion)

**Files:**
- Modify: `skills/building/SKILL.md`

**Step 1: Append flag handling and completion sections**

Append to `skills/building/SKILL.md`:

```markdown

## Flag Handling

Flags are the **only** time human intervention is needed.

### Flag Types

| Type | Trigger | Severity |
|------|---------|----------|
| `clarifier_blocked` | Clarifier can't answer from codebase | BLOCKING |
| `spec_review_exhausted` | 3 attempts, still not compliant | BLOCKING |
| `code_review_exhausted` | 3 attempts, still has issues | WARNING |
| `implementation_error` | Unrecoverable error | BLOCKING |
| `security_concern` | Potential vulnerability | BLOCKING |

### On Flag Received

```yaml
1. Update build-state.yaml:
   - Task status: flagged
   - Add to flags array

2. Present to user:
   🚩 FLAG: [type]

   Task: [task-id] - [task-title]
   Feature: [feature-id]

   [Context from flag payload]

   Options:
   [1] Provide guidance
   [2] Skip task
   [3] Accept as-is
   [4] Abort feature

3. On user choice:
   - Guidance: Resume feature with user's input
   - Skip: Mark task skipped, continue to next
   - Accept: Mark task completed with warnings
   - Abort: Mark feature aborted, continue others
```

### Severity Behavior

| Severity | Feature | Other Features |
|----------|---------|----------------|
| BLOCKING | Paused until resolved | Continue |
| WARNING | Continues (task has warnings) | Unaffected |

## Completion

### On Feature Complete

```yaml
Apply completion policy:
  auto-merge:
    - Merge feature branch to main
    - Delete worktree
  pr:
    - Create pull request
    - Keep worktree until merged
  checkpoint:
    - Pause for user review
    - Ask: "Feature [id] complete. Review and continue?"

Invoke: superpowers:finishing-a-development-branch
Check: Any blocked features now unblocked?
```

### On All Features Complete

```markdown
## Build Complete!

**Duration:** [time]
**Features:** [N] completed, [M] skipped

| Feature | Tasks | Flags | Status |
|---------|-------|-------|--------|
| [id] | [N/M] | [count] | [status] |

**Next steps:**
- Review merged code
- Run full test suite
- Deploy to staging
```

### Cleanup

```bash
# Stop dashboard
pkill -f "server.py.*office" 2>/dev/null

# Update session.yaml
status: build_complete
```

## Files

**Skill files:**
- `SKILL.md` - This orchestrator
- `prompts/implementer.md` - Implementer subagent template
- `prompts/clarifier.md` - Clarifier subagent template
- `prompts/spec-reviewer.md` - Spec reviewer subagent template
- `prompts/code-reviewer.md` - Code reviewer subagent template

**Runtime files:**
- `docs/office/build-state.yaml` - Build progress state
- `docs/office/session.yaml` - Updated on completion
```

**Step 2: Verify complete skill**

```bash
wc -l skills/building/SKILL.md
```

Expected: ~200 lines (down from ~380)

**Step 3: Remove backup**

```bash
rm skills/building/SKILL.md.bak
```

**Step 4: Commit**

```bash
git add skills/building/SKILL.md
git commit -m "feat(build): add flag handling and completion logic"
```

---

## Task 9: Final Review and Cleanup

**Files:**
- Review: All files in `skills/building/`

**Step 1: Verify directory structure**

```bash
find skills/building -type f | sort
```

Expected:
```
skills/building/SKILL.md
skills/building/prompts/clarifier.md
skills/building/prompts/code-reviewer.md
skills/building/prompts/implementer.md
skills/building/prompts/spec-reviewer.md
```

**Step 2: Verify skill loads correctly**

```bash
head -5 skills/building/SKILL.md
```

Expected: YAML frontmatter with name and description

**Step 3: Final commit with summary**

```bash
git add -A
git status
```

If any uncommitted changes:

```bash
git commit -m "chore(build): cleanup and finalize redesign"
```

**Step 4: Summary**

```
Build skill redesign complete:
- Lean orchestrator: ~200 lines (was ~380)
- 4 subagent prompts: implementer, clarifier, spec-reviewer, code-reviewer
- Autonomous execution with two-stage review
- Flags only for critical blockers
- Configurable models per subagent role
```
