# Permission Priming for Background Agents - Design

## Problem

Background agents spawned during `/build` cannot prompt for permissions interactively. When they need to run commands like `npm install` or `git commit`, they auto-deny permission prompts and flag with errors.

Current workaround requires users to manually edit `.claude/settings.local.json` and restart Claude Code - a poor user experience.

## Solution

Pre-grant permissions at build startup using "permission priming" - running harmless check commands in the foreground to trigger permission prompts before spawning any background agents.

## Design

### 1. Warroom Changes

During warroom, the Team Lead extracts command prefixes from spec files and adds them to `tasks.yaml`.

**Extraction logic:**
- Parse bash code blocks from `spec/phase_*/spec.md`
- Extract command prefixes: npm, npx, git, yarn, pnpm, cargo, go, make, python, pip
- Dedupe across all phases

**Fallback inference from project files:**
- `package.json` → npm
- `Cargo.toml` → cargo
- `go.mod` → go
- `requirements.txt` → pip, python

**tasks.yaml format:**
```yaml
required_permissions:
  - npm
  - npx
  - git

phases:
  - id: phase-1
    # ... existing structure
```

### 2. Build Startup - Permission Priming

New step in `/build` startup (replaces current step 4):

**Permission check command mapping:**
| Prefix | Check Command |
|--------|---------------|
| npm | `npm --version` |
| npx | `npx --version` |
| git | `git --version` |
| yarn | `yarn --version` |
| pnpm | `pnpm --version` |
| cargo | `cargo --version` |
| go | `go version` |
| python | `python --version` |
| pip | `pip --version` |
| make | `make --version` |
| node | `node --version` |

**Flow:**
1. Extract permissions: `grep "^  - " docs/office/tasks.yaml | head -20 | sed 's/^  - //'`
2. Display to user what permissions are needed
3. Run each check command (triggers permission prompt)
4. User approves each
5. Confirm all granted before proceeding

**User experience:**
```
Preparing build permissions...

Required commands for this build:
  - npm (install, test, build)
  - git (add, commit)

Requesting permissions now. Please approve each prompt.

[npm --version] → approved
[git --version] → approved

All permissions granted. Starting build...
```

**Error handling:**
- If user denies a permission, warn that tasks may fail
- Ask whether to continue or abort

### 3. Phase Execution

No changes needed. Background agents inherit the parent session's permission context automatically.

**Edge case:** If a task needs a command not in `required_permissions`:
1. Subagent hits permission prompt
2. Auto-denies (background behavior)
3. Flags with `implementation_error`
4. User can approve manually and retry

### 4. Backward Compatibility

If `required_permissions` is missing from tasks.yaml (old plans):
- Fall back to inferring from project files
- Scan for package.json, Cargo.toml, go.mod, etc.
- Use detected toolchain for priming

## File Changes

### `skills/warrooming/SKILL.md`
- Add Team Lead instruction to extract command prefixes from specs
- Add `required_permissions` field to tasks.yaml output format
- Add fallback inference logic

### `skills/building/SKILL.md`
- Replace step 4 with permission priming flow
- Add check command mapping table
- Add user-facing permission request output
- Add error handling for denied permissions

### No changes needed
- `skills/phase-execution/SKILL.md`
- Agent definitions
- Dashboard

## Benefits

1. **No restart required** - permissions granted in current session
2. **Session-scoped** - permissions don't persist permanently
3. **User-friendly** - clear prompts instead of manual file editing
4. **Reliable** - uses Claude Code's native permission system

## Implementation

Implemented in `feature/permission-priming` branch:
- `skills/warrooming/SKILL.md` - Step 3g extracts permissions
- `skills/building/SKILL.md` - Step 4 primes permissions

See `docs/plans/2026-01-16-permission-priming-impl.md` for detailed implementation plan.
