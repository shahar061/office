# Changelog

All notable changes to the Office plugin will be documented in this file.

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
