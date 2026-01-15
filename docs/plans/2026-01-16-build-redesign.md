# Build Skill Redesign

Redesign of `/build` to use autonomous subagent-driven execution with two-stage review.

## Goals

- **Autonomous execution** - No man-in-loop unless critical blocker
- **Context efficient** - Fresh subagent per task (~950 tokens happy path)
- **Quality results** - Two-stage review (spec compliance + code quality)
- **Time efficient** - Parallel features, configurable models

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Building Skill                        │
│                   (Lean Orchestrator)                    │
│  - Validates prerequisites                               │
│  - Manages feature queue                                 │
│  - Tracks state in build-state.yaml                      │
│  - Dispatches subagents                                  │
│  - Handles flags (human escalation)                      │
└─────────────────────────────────────────────────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        ▼                   ▼                   ▼
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│ Feature A    │    │ Feature B    │    │ Feature C    │
│ (worktree)   │    │ (worktree)   │    │ (worktree)   │
│ background   │    │ background   │    │ blocked...   │
└──────────────┘    └──────────────┘    └──────────────┘
```

**Key principles:**
- Features run in **parallel** (independent worktrees, background tasks)
- Tasks run **sequentially** within a feature
- Each subagent is **fresh** (no inherited context)
- Loops are **automatic** (no human in the loop)
- Flags only for **critical blockers**

## Task Execution Flow

Each task goes through this autonomous pipeline:

```
┌─────────────────────────────────────────────────────────┐
│                  TASK EXECUTION FLOW                     │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  1. DISPATCH IMPLEMENTER (Sonnet)                        │
│     - Reads spec section                                 │
│     - TDD: write test → fail → implement → pass          │
│     - Commits work                                       │
│     - Output: DONE | NEED_CLARIFICATION | ERROR          │
│                          │                               │
│          ┌───────────────┼───────────────┐               │
│          ▼               ▼               ▼               │
│       DONE      NEED_CLARIFICATION     ERROR             │
│          │               │               │               │
│          │               ▼               ▼               │
│          │    2. CLARIFIER (Opus)    Flag if             │
│          │       Explores codebase   attempts >= 3       │
│          │       Answers question                        │
│          │       Output: ANSWERED | FLAG                 │
│          │               │                               │
│          ▼               ▼                               │
│  3. SPEC-REVIEWER (Haiku)                                │
│     - Verifies code matches spec exactly                 │
│     - Output: COMPLIANT | ISSUES                         │
│     - If ISSUES: Implementer fixes (max 3 loops)         │
│                          │                               │
│                          ▼                               │
│  4. CODE-REVIEWER (Sonnet)                               │
│     - Reviews quality, patterns, maintainability         │
│     - Output: APPROVED | ISSUES                          │
│     - If ISSUES: Implementer fixes (max 3 loops)         │
│                          │                               │
│                          ▼                               │
│  5. TASK COMPLETE                                        │
│     - Update build-state.yaml                            │
│     - Proceed to next task                               │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

## Model Selection

| Subagent | Model | Reasoning |
|----------|-------|-----------|
| Implementer | Sonnet | Balanced creativity + speed |
| Clarifier | Opus | Rare but critical - needs deep reasoning |
| Spec-Reviewer | Haiku | Fast, structured comparison task |
| Code-Reviewer | Sonnet | Quality judgment needed |

**Configurable presets:**
- Default: Sonnet / Opus / Haiku / Sonnet
- Fast: Sonnet / Sonnet / Haiku / Haiku
- Quality: Opus / Opus / Sonnet / Sonnet

## Subagent Prompts

### Implementer (~400 tokens)

```markdown
You are implementing: [task-id] - [task-title]

Worktree: [path]
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

If you cannot proceed due to missing information, respond:
NEED_CLARIFICATION: [specific question]

Do not guess. Do not assume. Ask.

## When Done

Report:
- Files changed
- Test results (pass/fail counts)
- Commit SHA
```

### Clarifier (~200 tokens + question)

```markdown
An implementer working on [task-id] needs clarification.

Question: [implementer's question]

Task context: [task-title]
Worktree: [path]

## Your Job

1. Explore the codebase to find the answer
2. Check existing patterns, interfaces, conventions
3. Provide a clear, actionable answer

If you cannot determine the answer from the codebase:
FLAG: [reason - what information is missing]

Otherwise respond with the answer only.
```

### Spec-Reviewer (~300 tokens)

```markdown
Review spec compliance for: [task-id]

## What Was Requested
[Task spec text - copy from implementation-spec]

## What Was Built
[Implementer's report - files changed, commit SHA]

## Your Job

Read the actual code. Verify:
- All requirements implemented (nothing missing)
- No extra work (nothing unneeded)
- Matches spec intent

Output exactly one of:
✅ COMPLIANT
❌ ISSUES:
- [specific issue with file:line reference]
```

### Code-Reviewer (~250 tokens)

```markdown
Review code quality for: [task-id]

Diff: [base-sha]..[head-sha]
Worktree: [path]

## Your Job

Review for:
- Code quality and readability
- Test coverage and correctness
- Patterns consistency with codebase
- No security issues

Output:
✅ APPROVED
❌ ISSUES:
- [Critical/Important/Minor]: [issue with file:line]
```

## Context Cost

| Scenario | Tokens |
|----------|--------|
| Happy path (1 attempt each) | ~950 |
| With clarifier | ~1,450 |
| Worst case (all loops + clarifier) | ~3,350 |

## Flag Conditions

Flags are the **only** time human intervention is needed.

| Condition | Trigger | Severity |
|-----------|---------|----------|
| Clarifier can't answer | Codebase doesn't have the information | BLOCKING |
| Spec-review loop exhausted | 3 attempts, still not compliant | BLOCKING |
| Code-review loop exhausted | 3 attempts, still has issues | WARNING |
| Implementation error | Unrecoverable error | BLOCKING |
| Test infrastructure broken | Tests can't run at all | BLOCKING |
| Security concern | Potential vulnerability detected | BLOCKING |

### Flag Payload

```yaml
flag:
  task_id: "auth-2"
  feature_id: "user-auth"
  type: "spec_review_exhausted"
  severity: "blocking"

  context:
    attempts:
      - attempt: 1
        issue: "Missing token expiry check"
        fix_applied: "Added expiry validation"
      - attempt: 2
        issue: "Still missing refresh logic"
        fix_applied: "Added refresh endpoint"
      - attempt: 3
        issue: "Refresh not integrated with middleware"
        fix_applied: "Attempted integration"

    current_state:
      files_changed: ["src/auth/jwt.ts", "src/middleware/auth.ts"]
      last_commit: "abc123"
      test_results: "8 pass, 1 fail"
```

### User Resolution Options

```
🚩 FLAG: spec_review_exhausted

Task: auth-2 - Implement JWT refresh
Feature: user-auth

After 3 attempts, spec-reviewer still finds issues:
- "Refresh not integrated with middleware"

Options:
[1] Provide guidance (I'll tell you how to fix)
[2] Skip task (mark incomplete, continue)
[3] Accept as-is (good enough, move on)
[4] Abort feature (stop this feature entirely)
```

## State Management

### build-state.yaml Structure

```yaml
build:
  started_at: "2026-01-16T10:30:00Z"
  status: in_progress  # pending | in_progress | paused | completed

  config:
    completion_policy: checkpoint  # auto-merge | pr | checkpoint
    retry_limit: 3
    max_parallel_features: 3
    models:
      implementer: sonnet
      clarifier: opus
      spec_reviewer: haiku
      code_reviewer: sonnet

features:
  - id: user-auth
    status: in_progress
    branch: feature/user-auth
    worktree: .worktrees/user-auth
    started_at: "2026-01-16T10:31:00Z"

    tasks:
      - id: auth-1
        title: "Setup auth middleware"
        status: completed

        execution:
          implementer_attempts: 1
          clarifier_invoked: false
          spec_review_attempts: 1
          code_review_attempts: 2

        result:
          commit: "abc1234"
          review_status: clean

      - id: auth-2
        title: "Implement JWT refresh"
        status: flagged

        execution:
          implementer_attempts: 3
          clarifier_invoked: true
          clarifier_question: "Token storage strategy?"
          clarifier_answer: "Use httpOnly cookies"
          spec_review_attempts: 3
          code_review_attempts: 0

        flag:
          type: spec_review_exhausted
          severity: blocking
          waiting_since: "2026-01-16T11:15:00Z"

  - id: dashboard
    status: pending
    depends_on: [user-auth]

flags:
  - feature: user-auth
    task: auth-2
    type: spec_review_exhausted
    created_at: "2026-01-16T11:15:00Z"
    resolved: false
```

### State Transitions

```
Task states:
  pending → in_progress → spec_review → code_review → completed
                ↓              ↓              ↓
             flagged        flagged        flagged

Feature states:
  pending → in_progress → completed
       ↓         ↓
    blocked    paused (has flagged task)
```

## Parallel Execution

### Background Tasks with Exit-and-Resume

```
Orchestrator (foreground)
     │
     │  Dispatch ready features in parallel
     │
     ├──────────────────┬──────────────────┐
     ▼                  ▼                  ▼
┌─────────┐       ┌─────────┐       ┌─────────┐
│Feature A│       │Feature B│       │Feature C│
│background│      │background│      │ blocked │
│         │       │         │       │         │
│ task1 ✓ │       │ task1 ✓ │       │         │
│ task2 ✓ │       │ task2 ⚑ │       │         │
│ task3.. │       │ (flag)  │       │         │
└────┬────┘       └────┬────┘       └─────────┘
     │                 │
     │            exits with flag
     │                 │
     ▼                 ▼
┌─────────────────────────────────────────────┐
│              Orchestrator                    │
│                                              │
│  - Feature A: still running                  │
│  - Feature B: flagged → present to user      │
│  - Feature C: blocked (waiting on A)         │
│                                              │
│  On user resolution:                         │
│  - Resume Feature B with new context         │
└─────────────────────────────────────────────┘
```

### Concurrency Limits

| Setting | Default | Purpose |
|---------|---------|---------|
| max_parallel_features | 3 | Prevent overwhelming system |

## Configuration

### Startup Options

```
Completion policy:
[1] auto-merge - Merge to main automatically
[2] pr - Create pull request for review
[3] checkpoint - Pause for human review (default)

Model configuration:
[1] Default (Sonnet/Opus/Haiku/Sonnet)
[2] Fast (Sonnet/Sonnet/Haiku/Haiku)
[3] Quality (Opus/Opus/Sonnet/Sonnet)
[4] Custom

Max parallel features: [3]
Retry limit: [3]
```

## File Structure

### New Files

```
skills/
└── building/
    ├── SKILL.md                      # Lean orchestrator (~100 lines)
    └── prompts/
        ├── implementer.md            # ~400 tokens
        ├── clarifier.md              # ~200 tokens
        ├── spec-reviewer.md          # ~300 tokens
        └── code-reviewer.md          # ~250 tokens
```

### Changes from Current Design

| Current | New |
|---------|-----|
| 380-line monolithic skill | ~100-line orchestrator + prompt templates |
| Single code-reviewer | Two-stage: spec-reviewer → code-reviewer |
| Man-in-loop for questions | Clarifier subagent (Opus) |
| Fixed model (Sonnet) | Configurable models per role |
| Review in main context | Fresh subagent per review |

## Implementation Plan

1. Create prompt templates in `skills/building/prompts/`
2. Rewrite SKILL.md as lean orchestrator
3. Update build-state.yaml schema
4. Test with single feature (no parallelism)
5. Enable parallel feature execution
6. Add model configuration options
