---
name: workspace-cleanup
description: "Remove git worktree when feature work is complete"
---

# workspace-cleanup - Remove Feature Worktree

## Overview

Removes a git worktree after feature completion, with safety checks for uncommitted changes.

## Input

Called by `/build` with:

```yaml
feature_id: user-auth
worktree_path: /path/to/project/.worktrees/user-auth
branch: feature/user-auth
project_root: /path/to/project
delete_branch: false  # Keep branch if PR created
```

## Process

### 1. Safety Checks

```bash
cd "$WORKTREE_PATH"

# Check for uncommitted changes
git status --porcelain
```

If changes found:
- Warn: "Worktree has uncommitted changes"
- Ask: "Discard changes and remove? (y/n)"
- If no: Abort cleanup

### 2. Return to Main Worktree

```bash
cd "$PROJECT_ROOT"
```

### 3. Remove Worktree

```bash
git worktree remove "$WORKTREE_PATH"
```

If fails (e.g., files open):
```bash
git worktree remove --force "$WORKTREE_PATH"
```

### 4. Optionally Delete Branch

If `delete_branch: true` and branch was merged:

```bash
git branch -d "$BRANCH"
```

If not merged, use `-D` with warning.

### 5. Update Build State

Remove worktree entry from `docs/office/build-state.yaml`.

## Output

```yaml
success: true
removed_path: /path/to/project/.worktrees/user-auth
branch_deleted: false
```

## Error Handling

- If worktree doesn't exist: Return success (idempotent)
- If removal fails: Report error, suggest `git worktree remove --force`
- If branch delete fails: Report but don't fail overall cleanup
