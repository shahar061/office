# Worktree per Phase - Design

## Problem

The current `/build` architecture has tasks running in parallel on the same branch. This causes:
- **Git conflicts** when multiple tasks commit simultaneously
- **Race conditions** in git add/commit sequences
- **No isolation** - half-done changes visible to other tasks

The original design (v0.2.17) used worktrees per feature, but this was lost when the architecture evolved to DAG-based parallel task execution.

## Solution

Restore worktree isolation at the **phase level**:
- Each phase gets its own worktree
- Tasks within a phase run **sequentially** (safe)
- Independent phases run **in parallel** (separate worktrees)
- All phases merge to a build branch, then PR to main

## Design

### Build Flow

```
1. Startup
   ├── Validate session (tasks.yaml, specs exist)
   ├── Create build branch: git checkout -b build/{session-id}
   └── Push build branch to origin

2. Phase Execution (respecting depends_on)
   ├── Identify ready phases (dependencies met)
   ├── For each ready phase IN PARALLEL:
   │   ├── Create worktree: .worktrees/phase-{id}
   │   ├── Checkout from build branch
   │   ├── Run tasks SEQUENTIALLY
   │   └── Signal completion
   │
   └── When phase completes:
       ├── Merge phase branch to build branch
       ├── If conflict: orchestrator resolves
       ├── Delete worktree
       └── Check if new phases are now ready

3. Completion
   └── Create PR: build/{session-id} → main
```

### Phase Dependency Resolution

Phase dependencies are already tracked in tasks.yaml:

```yaml
phases:
  - id: user-auth
    depends_on: []          # Can start immediately

  - id: payments
    depends_on: [user-auth] # Must wait for user-auth

  - id: notifications
    depends_on: []          # Can run parallel with user-auth
```

**Execution order:**
- `user-auth` and `notifications` start in parallel (both have `depends_on: []`)
- `payments` waits until `user-auth` completes and merges

### Worktree Lifecycle

```bash
# 1. Create worktree from build branch
git worktree add .worktrees/phase-{id} -b phase/{id} build/{session-id}

# 2. Tasks run sequentially in worktree
cd .worktrees/phase-{id}
# ... task execution ...

# 3. After phase completes, merge to build branch
git checkout build/{session-id}
git merge phase/{id} --no-ff -m "Merge phase: {name}"

# 4. If conflict, orchestrator resolves
# ... conflict resolution ...
git add -A && git commit -m "Resolve merge conflicts for phase: {name}"

# 5. Cleanup
git worktree remove .worktrees/phase-{id}
git branch -d phase/{id}
```

### Conflict Resolution

When merging a phase to build branch:

1. Attempt merge
2. If clean → continue to next phase
3. If conflict:
   - Orchestrator (main Claude Code agent) receives conflict details
   - Reads conflicting files
   - Makes informed resolution based on full context
   - Commits resolution
   - Continues build

The orchestrator is best suited for conflict resolution because:
- Has context of all phases
- Can see the bigger picture
- Phase subagents only know their scope

### Sequential Tasks Within Phase

Tasks run one at a time within a phase worktree:

```
Phase 1 worktree:
  task-001 → commit
  task-002 → commit
  task-003 → commit
  (all on phase/1 branch)
```

This sacrifices some parallelism but guarantees:
- No git conflicts within phase
- No race conditions
- Clean commit history

### Parallel Phases

Independent phases run simultaneously in separate worktrees:

```
.worktrees/
├── phase-user-auth/    (phase/user-auth branch)
├── phase-notifications/ (phase/notifications branch)
└── (payments waits - depends on user-auth)
```

Each worktree is completely isolated. No interference possible.

## File Changes

### Modified: `skills/building/SKILL.md`

- Add build branch creation at startup
- Add worktree creation per phase
- Change task execution from parallel to sequential
- Add merge step after each phase
- Add conflict resolution logic
- Add PR creation at completion

### Modified: `skills/phase-execution/SKILL.md`

- Remove DAG-based parallel task execution
- Run tasks sequentially
- Work within provided worktree path
- Signal completion (don't merge - orchestrator does that)

### Possibly Modified: `skills/warrooming/SKILL.md`

- Ensure phase-level `depends_on` is always populated
- May need to infer from task dependencies if not explicit

## Benefits

1. **Safety** - No git conflicts or race conditions
2. **Isolation** - Phases can't interfere with each other
3. **Parallelism preserved** - Independent phases still run in parallel
4. **Clean history** - One merge commit per phase
5. **Human review** - PR at end allows verification before main

## Tradeoffs

1. **Slower task execution** - Sequential within phase vs parallel
2. **More disk space** - Multiple worktrees active simultaneously
3. **Merge complexity** - Orchestrator must handle conflicts
4. **Setup overhead** - Creating/destroying worktrees takes time

## Migration

The change is backwards compatible:
- tasks.yaml structure unchanged
- Phase dependencies already exist
- Build configuration options remain the same
