# Office - Your Virtual Startup Team

A Claude Code plugin that simulates a 14-agent startup team to transform rough ideas into executable implementation plans.

See the [complete workflow diagram](docs/workflow-diagram.md) for a visual overview of the entire process.

## Installation

```bash
# Add the development marketplace
/plugin marketplace add /path/to/office

# Install the plugin
/plugin install office@office-dev
```

Then restart Claude Code.

## Usage

### /imagine - Design Phase

Start with a rough idea:

```
/imagine
```

Your virtual team will guide you through:

1. **Discovery** (CEO) - Understand your vision
2. **Definition** (Product Manager) - Create requirements
3. **Validation** (Market Researcher) - Analyze market fit
4. **Architecture** (Chief Architect) - Design the system

Produces:
- `docs/office/01-vision-brief.md`
- `docs/office/02-prd.md`
- `docs/office/03-market-analysis.md`
- `docs/office/04-system-design.md`

### /plan - Planning Phase

After design is complete:

```
/plan
```

The War Room automatically creates:
- `docs/office/plan.md` - Human-readable implementation plan
- `docs/office/tasks.yaml` - Machine-readable task manifest

### /build - Build Phase

After planning is complete:

```
/build
```

Configure at startup:
- **Completion policy:** auto-merge | pr | checkpoint
- **Retry limit:** default 3

The build phase:
1. Creates isolated worktrees per feature
2. Agents pick tasks from queue (domain-matched)
3. Each task follows TDD steps from implementation spec
4. Code review after each task (max 3 review cycles)
5. Applies completion policy when feature done
6. Tracks progress in `docs/office/build-state.yaml`

Produces:
- Working code in feature branches
- Merged features or pull requests (based on policy)

## The Team

| Agent | Role |
|-------|------|
| CEO | Visionary leader, hosts Discovery |
| Product Manager | User-focused, leads Definition |
| Market Researcher | Data-driven analyst, leads Validation |
| Chief Architect | Systems thinker, leads Architecture |
| Agent Organizer | Workflow coordinator |
| Project Manager | Timeline and milestones |
| Team Lead | Task breakdown |
| DevOps | Infrastructure planning |
| Backend Engineer | API and data |
| Frontend Engineer | UI and state |
| Mobile Developer | Cross-platform mobile apps |
| UI/UX Expert | User experience |
| Data Engineer | Data architecture |
| Automation Developer | Testing and CI/CD |

*During /build, Backend Engineer, Frontend Engineer, Mobile Developer, UI/UX Expert, Data Engineer, Automation Developer, and DevOps execute tasks in their domains.*

## Features

- **Session Resumption** - Automatically continues incomplete sessions
- **Boardroom Consultations** - Specialists provide input when needed
- **Collaborative Checkpoints** - Confirm understanding at each phase
- **Dual Output Format** - Human-readable plans + machine-readable tasks
- **Code Review Integration** - Automated review after each task with feedback handling
- **Real-time Dashboard** - Kanban board showing task progress at http://localhost:5050

## License

MIT
