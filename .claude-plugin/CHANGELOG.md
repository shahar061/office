# Changelog

All notable changes to the Office plugin will be documented in this file.

## [0.2.28] - 2026-01-15

### Changed

- **Refactored /plan skill for progressive disclosure**: Split 313-line SKILL.md into lean structure
  - `SKILL.md` now 84 lines with overview and quick steps
  - `war-room-process.md` contains detailed step-by-step instructions
  - `output-formats.md` contains file format specifications
  - Fixes skill loading issue where content wasn't appearing

## [0.2.27] - 2026-01-15

### Changed

- **Dashboard now required in /build phase**: Changed from optional to mandatory
  - Step 5 now says "You MUST invoke the `/office:dashboard` skill"
  - Uses Skill tool instead of raw bash commands
  - Clearer instructions to not skip this step

## [0.2.26] - 2026-01-15

### Changed

- **Fixed /plan phase execution order**: PM runs first, then Team Lead + DevOps in parallel
  - Step 2: Project Manager creates plan.md (must complete first)
  - Step 3: Team Lead + DevOps run in parallel (DevOps needs plan.md to edit)
  - Resolves dependency: DevOps can't edit plan.md until PM creates it

## [0.2.25] - 2026-01-15

### Fixed

- **Agents not writing files (0 tool uses)**: Made Write tool usage explicit in agent instructions
  - project-manager.md: "You MUST write... using the Write tool"
  - team-lead.md: Same for tasks.yaml and 05-implementation-spec.md
  - devops.md: "You MUST use Edit tool to add to plan.md"
  - Added "Do NOT just generate content - you MUST use Write tool" warnings

## [0.2.24] - 2026-01-15

### Fixed

- **Missing tools key in agent definitions**: Added `tools: required: [...]` to all agents
  - Plan agents (project-manager, team-lead, devops): Read, Write, Edit, Glob, Grep
  - Build agents (backend/frontend/mobile/automation/data): + Bash for code execution
  - Without tools key, agents couldn't write files during /plan and /build

## [0.2.23] - 2026-01-15

### Changed

- **Parallel feature execution in /build phase**: Added explicit instructions for running features concurrently
  - Features with no unmet dependencies start simultaneously via multiple Task tools in single message
  - Clarified rules: features parallel (isolated worktrees), tasks sequential (shared worktree)
  - Same agent type can run in parallel across different features (separate instances)

## [0.2.22] - 2026-01-15

### Changed

- **Parallel agent execution in /plan phase**: Project Manager, Team Lead, and DevOps now run concurrently
  - Collapsed sequential steps 2-4 into single parallel step
  - Added explicit instruction to invoke all three Task tools in one message
  - Reduces plan phase time from 3 sequential rounds to 1 parallel round

## [0.2.21] - 2026-01-15

### Fixed

- **Dashboard static files not loading**: Added explicit routes for style.css and app.js
  - Flask serves static files at /static/ prefix by default
  - HTML referenced files with relative paths (/style.css, /app.js)
  - Added routes to serve these files directly from static folder

## [0.2.20] - 2026-01-15

### Added

- **YAML validation for tasks.yaml**: Prevent invalid YAML from breaking dashboard
  - Added YAML safety rules to Team Lead agent (quote strings with `{}`, `[]`, `:`, `#`)
  - Added validation step in /plan skill to verify tasks.yaml parses correctly
  - Clear error messages with fix instructions if validation fails

## [0.2.19] - 2026-01-14

### Fixed

- **Dashboard skill path resolution**: Fixed skill to find plugin installation in cache directory
  - Uses `find` to locate dashboard in `~/.claude/plugins/cache/`
  - Gets latest version with `sort -V`
  - Correctly passes project's `docs/office` path to server

## [0.2.18] - 2026-01-14

### Fixed

- **Dashboard field mapping for build-state.yaml**: Fixed data merge to handle actual build-state format
  - Maps `pending` status to `queued` for frontend compatibility
  - Maps `attempts` field to `retry_count`
  - Added `review_status` passthrough for code review warnings

## [0.2.17] - 2026-01-14

### Changed

- **Immersive role-play for /imagine**: Rewrote the command as a direct role-play experience
  - Users now talk TO characters (CEO, PM, Market Researcher, Architect) instead of through a routing system
  - No more "launching agent" messages or meta-commentary
  - One continuous conversation that flows through all 4 phases
  - Each character has a warm, direct introduction
  - CEO and PM engage in dialogue; Market Researcher and Architect work independently after brief intros

## [0.2.15] - 2026-01-14

### Changed

- **Imagine skill simplified to continuous flow**: Restructured from "one action per invocation" to single-session progression through all phases
  - Removed requirement to run `/imagine` repeatedly for each phase
  - Agent Organizer now handles session setup inline, followed by sequential phase agents
  - Clearer step-by-step instructions with explicit Task tool invocation examples
  - Removed "Failure Modes" section and "STOP. Do not continue." blocks
  - Reference sections moved to bottom for cleaner primary instructions

## [0.2.14] - 2026-01-14

### Fixed

- **Imagine skill made self-contained for external plugin use**: Ensured the skill works independently without requiring parent context

## [0.2.13] - 2026-01-14

### Fixed

- **Agent definitions missing tools key**: Added explicit `tools` key and verification steps to agent configurations

## [0.2.12] - 2026-01-14

### Changed

- **Imagine skill rewritten as minimal orchestrator**: Restructured to one-action-per-invocation pattern with explicit state machine

## [0.2.11] - 2026-01-14

### Fixed

- **Skill still being interpreted as roleplay instead of commands**: Restructured `skills/imagine/SKILL.md` completely
  - Removed descriptive "Overview" and "Phases" sections from top
  - Skill now starts with "Step 1: Spawn Agent Organizer" - imperative command first
  - All reference/descriptive content moved below a `---` separator at bottom
  - Steps are numbered and use imperative verbs: "Use the Task tool now", "Do this FIRST"

## [0.2.10] - 2026-01-14

### Fixed

- **Session setup skipped in /imagine**: The skill documented the workflow but didn't prescribe explicit Task tool invocations, causing Claude to skip directly to CEO dialogue without creating session.yaml
  - `skills/imagine/SKILL.md`: Added "Invocation Protocol" section with explicit Task tool calls for Agent Organizer before spawning phase agents
  - `skills/imagine/SKILL.md`: Added phase transition pattern with Task tool examples
  - `agents/agent-organizer.md`: Added "Tool Usage Requirements" section requiring Bash/Write/Edit tool usage for session setup and phase transitions
  - `agents/agent-organizer.md`: Added "Common Failure Mode" warning about completing with 0 tool uses

## [0.2.9] - 2026-01-14

### Fixed

- **Agent Organizer session.yaml instructions inconsistent**: Applied same imperative pattern for consistency
  - `agents/agent-organizer.md`: Changed "Create it immediately" to "**Write `docs/office/session.yaml`** immediately"
  - `agents/agent-organizer.md`: Changed "Update session.yaml" to "**Write updates to `docs/office/session.yaml`**"

## [0.2.8] - 2026-01-14

### Fixed

- **Plan phase files not being written**: Same passive language issue as imagine phase
  - `skills/plan/SKILL.md`: Changed "Team Lead generates" to "**Team Lead MUST write**"
  - `skills/plan/SKILL.md`: Changed "Produce four files" to "**You MUST write these four files**"
  - `agents/team-lead.md`: Changed "You produce TWO files" to "**You MUST write TWO files to `docs/office/`**"
  - `agents/team-lead.md`: Changed "Produce `tasks.yaml`" to "**Write `docs/office/tasks.yaml`**"
  - `agents/team-lead.md`: Changed "Produce `05-implementation-spec.md`" to "**Write `docs/office/05-implementation-spec.md`**"

## [0.2.7] - 2026-01-14

### Fixed

- **Session check step being skipped**: Step 1 in imagine SKILL.md used passive language ("First, check...") instead of imperative commands, causing Claude to skip directly to Discovery phase
  - Changed to bold imperative: "**BEFORE PROCEEDING TO DISCOVERY, you MUST complete these steps:**"
  - Added numbered action list with explicit directory creation
  - Added blocking statement: "**Do not proceed to Discovery Phase until session.yaml exists.**"

## [0.2.6] - 2026-01-14

### Fixed

- **Imagine phase agents not writing documents**: All four agents said "produce" but lacked explicit write instructions
  - `ceo.md`: Changed to "**write the Vision Brief to `docs/office/01-vision-brief.md`**"
  - `product-manager.md`: Changed to "**write the PRD to `docs/office/02-prd.md`**"
  - `market-researcher.md`: Changed to "**Write the Market Analysis to `docs/office/03-market-analysis.md`**"
  - `chief-architect.md`: Changed to "**Write the System Design to `docs/office/04-system-design.md`**"

## [0.2.5] - 2026-01-14

### Fixed

- **Agent files missing file creation instructions**: Root cause of session.yaml and 05-implementation-spec.md not being created
  - `agent-organizer.md`: Added explicit session.yaml creation template with full YAML structure
  - `team-lead.md`: Added 05-implementation-spec.md as explicit output file with full format documentation

## [0.2.4] - 2026-01-14

### Fixed

- **Imagine skill session.yaml creation**: Made session.yaml creation explicit in Session Check section with initial file template
- **Plan skill output documentation**: Clarified that plan phase UPDATES (not creates) session.yaml

## [0.2.3] - 2026-01-14

### Fixed

- **Plan skill output documentation**: Added `session.yaml` to output file list in section 8 (now lists all 4 files)

## [0.2.2] - 2026-01-14

### Fixed

- **Plan skill missing 05-implementation-spec.md**: The `/plan` skill only documented 2 output files instead of 3, causing the implementation spec to not be generated. Fixed all references to include `05-implementation-spec.md`.

## [0.2.1] - 2026-01-14

### Added

- **Mobile Developer agent**: New cross-platform mobile specialist (14th agent)
  - Consults during `/imagine` boardroom on platform constraints
  - Executes mobile tasks during `/build` (React Native, Flutter)
  - Advises on app store requirements, offline patterns, push notifications, deep linking
- Updated Team Lead with `mobile_developer` domain for task routing
- Updated Chief Architect to consult Mobile Developer on mobile projects

## [0.2.0] - 2026-01-14

### Added

- **Code review integration**: Automated code review after each task during `/build`
  - New `in_review` task status visible in dashboard
  - Invokes `superpowers:requesting-code-review` after task completion
  - Max 3 review cycles before marking as `has-warnings`
- **handling-code-review skill**: Processes code review feedback with technical rigor
  - READ → UNDERSTAND → VERIFY → EVALUATE → RESPOND → IMPLEMENT pattern
  - Escalates unclear feedback to `@office:team-lead`
  - YAGNI checks for over-engineering suggestions
- **Dashboard enhancements**:
  - "In Review" column in kanban board
  - Orange "CR Warnings" badge for tasks with review warnings
- **Workflow diagram**: Complete visual documentation at `docs/workflow-diagram.md`

### Changed

- Replaced local workspace skills with superpowers equivalents:
  - `workspace-prepare` → `superpowers:using-git-worktrees`
  - `workspace-cleanup` → `superpowers:finishing-a-development-branch`
- Updated `build-state.yaml` schema with `review_attempts` and `review_status` fields

### Removed

- `skills/workspace-prepare/` - replaced by superpowers skill
- `skills/workspace-cleanup/` - replaced by superpowers skill

## [0.1.2] - 2026-01-14

### Fixed

- **Docs not available in /build worktrees**: Documents generated during `/imagine` and `/plan` phases were not committed to git, causing them to be missing when `/build` created isolated worktrees. Added explicit commit steps at the end of both `/imagine` and `/plan` phases to ensure all design documents are tracked in git before `/build` runs.

## [0.1.1] - 2026-01-13

### Added

- Auto-start dashboard on /build

## [0.1.0] - 2026-01-13

### Added

- Initial release with 13 AI agents
- `/imagine` skill for collaborative design phase
- `/plan` skill for automated planning
- `/build` skill for parallel execution in worktrees
- Dashboard for real-time build visualization
