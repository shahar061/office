---
name: workspace-prepare
description: "Create isolated git worktree with full environment setup for a feature"
---

# workspace-prepare - Create Feature Worktree

## Overview

Creates an isolated git worktree for a feature with full environment setup and verification.

## Input

Called by `/build` with:

```yaml
feature_id: user-auth
branch: feature/user-auth
base_branch: main
project_root: /path/to/project
```

## Process

### 1. Check Existing Worktree

```bash
# Check if worktree already exists (resume support)
git worktree list | grep "feature/$FEATURE_ID"
```

If exists: Return existing path (resume scenario)

### 2. Create Worktree

```bash
# Determine worktree location
WORKTREE_PATH="$PROJECT_ROOT/.worktrees/$FEATURE_ID"

# Create worktree with new branch from base
git worktree add "$WORKTREE_PATH" -b "$BRANCH" "$BASE_BRANCH"
```

### 3. Run Environment Setup

Auto-detect and run setup based on project files:

```bash
cd "$WORKTREE_PATH"

# Node.js
if [ -f package.json ]; then
  npm install
fi

# Python
if [ -f requirements.txt ]; then
  pip install -r requirements.txt
elif [ -f pyproject.toml ]; then
  poetry install
fi

# Go
if [ -f go.mod ]; then
  go mod download
fi

# Rust
if [ -f Cargo.toml ]; then
  cargo build
fi
```

### 4. Verify Environment

Run initial verification:

```bash
# Build (if applicable)
npm run build 2>/dev/null || cargo build 2>/dev/null || go build ./... 2>/dev/null || true

# Run tests (smoke test)
npm test 2>/dev/null || pytest 2>/dev/null || go test ./... 2>/dev/null || cargo test 2>/dev/null || true
```

Report any failures but don't block.

### 5. Report Result

```yaml
success: true
worktree_path: /path/to/project/.worktrees/user-auth
branch: feature/user-auth
setup_completed:
  - npm install
  - npm run build
tests_passed: true
```

## Error Handling

- If `git worktree add` fails: Report error, suggest manual cleanup
- If setup fails: Report which step failed, continue anyway
- If tests fail: Report failures, ask whether to proceed

## Output

Returns to `/build`:

```yaml
success: true|false
worktree_path: string
error: string (if failed)
```
