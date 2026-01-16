# Changelog

All notable changes to the Office plugin will be documented in this file.

## [0.2.53] - 2026-01-16

### Fixed

- **Interactive dialogue for all /imagine phase agents**: Added explicit prompts with dialogue instructions
  - Product Manager now asks about personas, user journeys, feature priorities (one question at a time)
  - Chief Architect now asks about technical constraints and preferences
  - Market Researcher shares key findings before finishing
  - Previously only CEO had explicit dialogue prompt, other agents ran autonomously

## [0.2.52] - 2026-01-16

### Added

- **Permission priming for background agents**: Dynamic permission granting at `/build` startup
  - Warroom now extracts command prefixes from spec files (Step 3g)
  - Adds `required_permissions` section to `tasks.yaml`
  - Build startup primes permissions by running check commands (npm --version, git --version, etc.)
  - Background agents inherit approved permissions from main session
  - Eliminates need for manual `.claude/settings.local.json` editing and Claude Code restart
  - Fallback inference from project files (package.json, Cargo.toml, etc.)

## [0.2.51] - 2026-01-16

### Changed

- **Converted phase-executor to skill**: Background subagents cannot spawn nested subagents (Claude Code limitation), causing tasks to run sequentially. Now `/phase-execution` runs as a skill in main context, enabling parallel task execution.

- **Architecture simplification**:
  - Phases run sequentially (skill in foreground)
  - Tasks run in parallel (skill spawns background subagents)
  - Pipeline stages (implement, review) run inline per task subagent

- **Removed prompt templates**: No longer needed since pipeline stages are inline

### Fixed

- **Dashboard phase lookup**: Fixed bug where phase-1 was looked up as phase-phase-1
- **Dashboard agent names**: Normalized underscore to hyphen (frontend_engineer -> frontend-engineer)
- **Dashboard task titles**: Added title field aliasing from description

## [0.2.50] - 2026-01-16

### Changed

- **DAG-based parallel task execution**: Tasks within a phase now run in parallel based on dependencies
  - Phases still run sequentially (one at a time)
  - Tasks with satisfied dependencies spawn simultaneously
  - Per-task git branches for isolation during parallel execution

- **No more polling**: Orchestrator waits idle while phase executor runs
  - Uses `TaskOutput` with `block: true` instead of polling loop
  - Dramatically reduces context usage (~30k vs 220k+)

- **Per-phase status files**: Each phase executor owns its status file
  - New directory structure: `docs/office/build/phase-{id}/status.yaml`
  - No race conditions from shared state
  - Append-only `progress.log` for event tracking

### Updated

- **Dashboard**: Now watches `build/` directory recursively
  - Handles both `on_modified` and `on_created` events
  - Aggregates per-phase status files for real-time display

- **Phase executor**: Rewritten with DAG execution algorithm
  - Added `TaskOutput` to allowedTools for wait-for-any pattern
  - Status file helpers using sed for atomic updates

## [0.2.49] - 2026-01-16

### Fixed

- **Build skill permission handling**: Added step 5 "Request Permissions" to startup sequence
  - Background subagents auto-deny tool calls requiring permission
  - Uses `ExitPlanMode` with `allowedPrompts` for session-wide permissions
  - Includes fallback with manual `.claude/settings.local.json` configuration
  - Fixed misleading comment that claimed `allowedTools` provides autonomous operation

## [0.2.45] - 2026-01-16

### Changed

- **Terminology: "feature" → "phase"**: Unified terminology across the pipeline
  - Building skill now uses "phase" to match warroom output (plan.md, tasks.yaml, spec folders)
  - `feature-executor` → `phase-executor`
  - `max_parallel_features` → `max_parallel_phases`
  - `build-state.yaml` schema: `features:` → `phases:`

## [0.2.44] - 2026-01-16

### Fixed

- **Build skill spec path**: Updated to use phase-based spec folders instead of single file
  - Prerequisites now expect `spec/phase_*/spec.md` instead of `05-implementation-spec.md`
  - Implementer prompt uses `[spec-file-path]` variable for phase-specific specs
  - Spec-reviewer references phase spec.md for compliance checking

## [0.2.43] - 2026-01-16

### Changed

- **Build skill redesign**: Replaced 380-line monolithic skill with lean orchestrator + 4 subagent prompts
  - New architecture: Implementer → Clarifier → Spec-Reviewer → Code-Reviewer pipeline
  - Autonomous execution with no man-in-loop (flags only for critical blockers)
  - Two-stage review: spec compliance (Haiku) then code quality (Sonnet)
  - Configurable model presets: default (Sonnet/Opus/Haiku/Sonnet), fast, quality
  - ~950 tokens per task (happy path) vs previous monolithic context
  - Parallel features, sequential tasks within each feature

### Added

- **Subagent prompt templates**: New `skills/building/prompts/` directory
  - `implementer.md` - TDD implementation with DONE/NEED_CLARIFICATION/ERROR outputs
  - `clarifier.md` - Opus-powered codebase exploration for blocking questions
  - `spec-reviewer.md` - Haiku-powered spec compliance verification
  - `code-reviewer.md` - Sonnet-powered code quality review

## [0.2.42] - 2026-01-15

### Changed

- **Warrooming context optimization**: Reduced main context usage to near-zero
  - Removed Step 1 (context gathering) - agents now read files directly
  - Agent prompts point to file paths instead of pasting content
  - Main context never holds design document content
  - Reduced from 5 steps to 4 steps

- **Background agents as default**: Made background agents the robust, atomic approach
  - All spec generation agents run with `run_in_background: true`
  - Added "Wait for Completion (Context-Lean)" section - don't pull output back
  - Added "Verify Files (Not Agent Output)" - check existence, don't read contents
  - Added "Handle Failures" with automatic retry (max 2 attempts)
  - Removed split-session fallback - skill is now fully atomic

### Fixed

- **Context overflow during /warrooming**: 127% context usage issue resolved
  - Background agent output stays in separate context windows
  - File verification uses `ls` and `grep -q`, never `cat` or `Read`
  - Skill completes in single session without manual intervention

## [0.2.41] - 2026-01-15

### Added

- **Agent colors for visibility**: All 14 agents now have color tags for better UI distinction
  - Purple: agent-organizer, mobile-developer
  - Blue: ceo, frontend-engineer
  - Cyan: product-manager, project-manager, data-engineer
  - Green: market-researcher, backend-engineer
  - Orange: chief-architect, team-lead, ui-ux-expert
  - Red: devops, automation-developer

## [0.2.40] - 2026-01-15

### Added

- **Parallel implementation spec generation**: New Step 4 in warrooming generates TDD specs in parallel
  - Spawns N Team Lead agents (one per phase) after tasks.yaml is created
  - Each agent writes to `spec/phase_{N}_{name}/spec.md`
  - Runs in parallel with DevOps (env setup)
  - Full TDD format: test → fail → implement → pass → commit
  - 4-5x speedup vs sequential generation
  - Includes error handling and retry for failed phases

### Changed

- **Warrooming flow restructured**: Step 3 (Team Lead) now completes before Step 4
  - Step 3: Team Lead creates tasks.yaml (must finish first)
  - Step 4: DevOps + N Team Leads run in parallel
  - Specs depend on tasks.yaml, so sequential dependency is required

## [0.2.39] - 2026-01-15

### Fixed

- **Agents not writing files**: Changed `tools.required` to `allowedTools` in all 14 agents
  - Correct syntax: `allowedTools:` with YAML array (not `tools: required: [...]`)
  - All agents can now use Write, Edit, Read, and other tools during their phases

### Changed

- **Warrooming skill: agents write directly**: Removed ADVISOR pattern since agents can now write files
  - Agents read files themselves and write directly using Write/Edit tools
  - No more content markers (PLAN_CONTENT_START/END, etc.)
- **Warrooming skill: parallel execution**: Steps 3 & 4 now run in parallel
  - Team Lead and DevOps dispatch in single message (both depend on PM's plan.md)
- **Warrooming skill: no task limit**: Removed arbitrary 20-30 task limit
  - Team Lead creates as many tasks as needed to fully implement the plan

## [0.2.38] - 2026-01-15

### Changed

- **Lean warroom for speed**: Reduced token usage and time significantly
  - Pass KEY SECTIONS to agents, not full documents (~70% token reduction)
  - Removed separate template files - prompts inlined in SKILL.md
  - Reduced tasks from 30-50 to 20-30 (faster generation)
  - Moved implementation specs to /build phase (on-demand per task)
  - Expected: ~15k tokens instead of ~40k, ~3-5 min instead of ~15 min

## [0.2.37] - 2026-01-15

### Changed

- **Agents as advisors, Claude as implementer**: Fixed subagent file write bug (known Claude Code issue)
  - Subagents now RETURN content instead of trying to write files
  - Main Claude agent writes files after receiving advisor output
  - Pattern: Agent analyzes → returns marked content → Claude extracts and writes
  - Output markers: `PLAN_CONTENT_START/END`, `TASKS_YAML_START/END`, etc.
  - References: GitHub issues #7032, #4462, #13890

## [0.2.36] - 2026-01-15

### Changed

- **Rewrite warrooming skill with superpowers pattern**: Sequential specialist agents with placeholder templates
  - SKILL.md now orchestrates: Claude reads docs → fills templates → dispatches agents sequentially
  - `project-manager-prompt.md`: Template with `{VISION_BRIEF}`, `{PRD}`, `{SYSTEM_DESIGN}` placeholders
  - `team-lead-prompt.md`: Template for tasks.yaml and implementation spec
  - `devops-prompt.md`: Template for environment/deployment section
  - Pattern matches superpowers:requesting-code-review (Claude fills placeholders, agent executes)
  - Each agent has ONE focused deliverable instead of multi-step orchestrator

## [0.2.35] - 2026-01-15

### Changed

- **Follow superpowers naming pattern for skills**: Commands are concise stubs, skills have `-ing` suffix
  - Commands: `imagine.md`, `build.md`, `warroom.md` (concise, with `disable-model-invocation: true`)
  - Skills: `skills/imagining/`, `skills/building/`, `skills/warrooming/` (with `-ing` suffix)
  - This ensures Skill tool loads SKILL.md content instead of command stub
  - Pattern matches superpowers plugin (e.g., `brainstorm` command → `brainstorming` skill)

## [0.2.34] - 2026-01-15

### Changed

- **Renamed /plan to /warroom**: Avoid potential conflict with Claude Code's built-in plan mode
  - `commands/plan.md` → `commands/warroom.md`
  - `skills/plan/` → `skills/warroom/`
  - Updated all references in imagine, build, and README
  - Command is now `/office:warroom`

## [0.2.33] - 2026-01-15

### Changed

- **Single orchestrator agent approach**: Instead of skill controlling multiple agents, spawn ONE agent-organizer that executes all steps sequentially
  - Steps A-G executed IN ORDER by single agent
  - Agent does PM, Team Lead, DevOps work directly (no sub-agents)
  - Each step has "You MUST use the Write/Edit tool. Do not just describe what to do."
  - Explicit confirmations after each step

## [0.2.32] - 2026-01-15

### Changed

- **Matched /plan skill format to /imagine**: Copied working patterns from /imagine
  - "Use the Task tool now:" - direct imperative
  - "You MUST use the Write tool. Do not just describe what to do." - anti-passivity
  - Simpler prompt structure, less template noise
  - Clear step routing: "After X completes, do Y"

## [0.2.31] - 2026-01-15

### Changed

- **Inlined all prompts directly in SKILL.md**: Removed external template files that Claude couldn't locate
  - Full prompt content for PM, Team Lead, DevOps now inline in skill
  - Explicit "Call the Task tool with EXACTLY these parameters" format
  - Clear placeholders: [PASTE THE FULL CONTENT OF ... HERE]
  - Explicit "YOU MUST USE THE WRITE TOOL" instructions
  - Report format for each agent to confirm file was written

## [0.2.30] - 2026-01-15

### Changed

- **Restructured /plan skill to follow superpowers pattern**: Separate prompt template files for each agent
  - `SKILL.md` - Process flow with dot diagram, references templates
  - `project-manager-prompt.md` - Complete prompt with context pasting, explicit Write tool instructions
  - `team-lead-prompt.md` - Creates both tasks.yaml and 05-implementation-spec.md
  - `devops-prompt.md` - Appends environment section to plan.md
  - Key fix: Content pasted INTO prompt (agents don't read files themselves)
  - Key fix: Explicit "Use the Write tool" / "Use the Edit tool" instructions
  - Key fix: Report format so we know files were written

## [0.2.29] - 2026-01-15

### Fixed

- **Added explicit Task tool invocations to /plan skill**: Skill was hanging because Claude didn't know HOW to spawn agents
  - Step 2: Explicit `subagent_type="office:project-manager"` with prompt
  - Step 3: Explicit parallel invocation for team-lead and devops
  - Removed vague "Spawn agent" instructions

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
