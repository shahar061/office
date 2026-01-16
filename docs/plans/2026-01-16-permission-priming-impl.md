# Permission Priming Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Enable background agents to run shell commands by pre-granting permissions at build startup.

**Architecture:** Extract command prefixes from spec bash blocks during warroom, store in tasks.yaml, prime permissions at build startup by running check commands.

**Tech Stack:** Bash, grep, sed (for extraction); Claude Code permission system (for priming)

---

## Task 1: Add Permission Extraction to Warrooming

**Files:**
- Modify: `skills/warrooming/SKILL.md`

**Step 1: Read the current file**

Read `skills/warrooming/SKILL.md` to understand current structure.

**Step 2: Add Step 3.5 after spec generation**

After the "3f: Report Results" section and before "Step 4: Finalize", add this new section:

```markdown
### 3g: Extract Required Permissions

Extract shell command prefixes from generated specs for build-time permission priming.

**Run extraction command:**

```bash
# Extract unique command prefixes from all bash code blocks in specs
grep -hE '^\s*(npm|npx|yarn|pnpm|git|node|cargo|go|python|pip|pytest|make|tsc|jest|vitest)\b' spec/phase_*/spec.md 2>/dev/null | \
  sed 's/^\s*//' | cut -d' ' -f1 | sort -u
```

**Fallback inference from project files (if no specs or empty result):**

```bash
# Detect from project config files
[ -f package.json ] && echo "npm"
[ -f yarn.lock ] && echo "yarn"
[ -f pnpm-lock.yaml ] && echo "pnpm"
[ -f Cargo.toml ] && echo "cargo"
[ -f go.mod ] && echo "go"
[ -f requirements.txt ] && echo "pip" && echo "python"
[ -f pyproject.toml ] && echo "pip" && echo "python"
```

**Add to tasks.yaml:**

Use sed to insert `required_permissions` at the top of tasks.yaml:

```bash
# Get the extracted permissions as a list
PERMS=$(grep -hE '^\s*(npm|npx|yarn|pnpm|git|node|cargo|go|python|pip|pytest|make|tsc|jest|vitest)\b' spec/phase_*/spec.md 2>/dev/null | sed 's/^\s*//' | cut -d' ' -f1 | sort -u)

# Create YAML list format
YAML_PERMS=$(echo "$PERMS" | sed 's/^/  - /' | tr '\n' '\n')

# Prepend to tasks.yaml
{
  echo "required_permissions:"
  echo "$PERMS" | sed 's/^/  - /'
  echo ""
  cat docs/office/tasks.yaml
} > docs/office/tasks.yaml.tmp && mv docs/office/tasks.yaml.tmp docs/office/tasks.yaml
```
```

**Step 3: Verify the edit**

Ensure the new section is placed between "3f: Report Results" and "Step 4: Finalize".

**Step 4: Commit**

```bash
git add skills/warrooming/SKILL.md
git commit -m "feat(warroom): extract required_permissions from specs for build"
```

---

## Task 2: Add Permission Priming to Building Skill

**Files:**
- Modify: `skills/building/SKILL.md`

**Step 1: Read the current file**

Read `skills/building/SKILL.md` to understand current Step 4 structure.

**Step 2: Replace Step 4 with permission priming**

Find the current Step 4 "Request Permissions" section (lines ~80-110) and replace it entirely with:

```markdown
### 4. Prime Permissions

**CRITICAL:** Task subagents run in background and auto-deny permission prompts. Prime permissions upfront by running check commands.

**4a. Extract permissions from tasks.yaml:**

```bash
# Get required permissions list
grep -A 50 "^required_permissions:" docs/office/tasks.yaml | grep "^  - " | sed 's/^  - //' | head -20
```

**4b. Fallback if no permissions listed:**

If `required_permissions` section is missing (older tasks.yaml), infer from project:

```bash
[ -f package.json ] && echo "npm"
[ -f Cargo.toml ] && echo "cargo"
[ -f go.mod ] && echo "go"
[ -f requirements.txt ] && echo "pip"
```

**4c. Display to user:**

```
Preparing build permissions...

Required commands for this build:
  - npm
  - git

Requesting permissions now. Please approve each prompt.
```

**4d. Run permission check commands:**

For each permission, run the corresponding check command:

| Permission | Check Command |
|------------|---------------|
| npm | `npm --version` |
| npx | `npx --version` |
| yarn | `yarn --version` |
| pnpm | `pnpm --version` |
| git | `git --version` |
| node | `node --version` |
| cargo | `cargo --version` |
| go | `go version` |
| python | `python --version` |
| pip | `pip --version` |
| pytest | `pytest --version` |
| make | `make --version` |
| tsc | `npx tsc --version` |
| jest | `npx jest --version` |
| vitest | `npx vitest --version` |

Run each check command. User will see permission prompts and approve them.

**4e. Confirm and proceed:**

After all check commands complete:

```
All permissions granted. Starting build...
```

**4f. Error handling:**

If a check command fails (command not found), warn but continue:

```
Warning: 'cargo' not found. Tasks requiring Rust may fail.
Continue anyway? [Y/n]
```

If user denies a permission prompt, that command won't work for background agents. Warn and ask whether to continue.
```

**Step 3: Verify the edit**

Ensure:
- Old Step 4 content (settings.local.json instructions) is removed
- New Step 4 content is in place
- Step numbering is preserved (Step 5 "Initialize Build Directory" follows)

**Step 4: Commit**

```bash
git add skills/building/SKILL.md
git commit -m "feat(build): replace settings.json with permission priming at startup"
```

---

## Task 3: Update Design Doc Reference

**Files:**
- Modify: `docs/plans/2026-01-16-permission-priming-design.md`

**Step 1: Add implementation status**

Add at the end of the design document:

```markdown
## Implementation

Implemented in `feature/permission-priming` branch:
- `skills/warrooming/SKILL.md` - Step 3g extracts permissions
- `skills/building/SKILL.md` - Step 4 primes permissions

See `docs/plans/2026-01-16-permission-priming-impl.md` for detailed implementation plan.
```

**Step 2: Commit**

```bash
git add docs/plans/2026-01-16-permission-priming-design.md
git commit -m "docs: link design to implementation"
```

---

## Task 4: Final Verification

**Step 1: Review all changes**

```bash
git log --oneline -5
git diff master..HEAD --stat
```

**Step 2: Verify skill syntax**

Ensure markdown is valid and sections are properly numbered:

```bash
# Check warrooming has 3g section
grep -n "### 3g" skills/warrooming/SKILL.md

# Check building has permission table
grep -n "Check Command" skills/building/SKILL.md
```

**Step 3: Final commit if needed**

If any fixes were made:

```bash
git add -A
git commit -m "fix: address review feedback"
```

---

## Summary

| Task | File | Change |
|------|------|--------|
| 1 | skills/warrooming/SKILL.md | Add Step 3g for permission extraction |
| 2 | skills/building/SKILL.md | Replace Step 4 with permission priming |
| 3 | docs/plans/*-design.md | Add implementation reference |
| 4 | - | Final verification |

**Estimated commits:** 3-4
**Files changed:** 3
