# Changelog

All notable changes to the Office plugin will be documented in this file.

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
