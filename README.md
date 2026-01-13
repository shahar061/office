# Office - Your Virtual Startup Team

A Claude Code plugin that simulates a 13-agent startup team to transform rough ideas into executable implementation plans.

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
| UI/UX Expert | User experience |
| Data Engineer | Data architecture |
| Automation Developer | Testing and CI/CD |

## Features

- **Session Resumption** - Automatically continues incomplete sessions
- **Boardroom Consultations** - Specialists provide input when needed
- **Collaborative Checkpoints** - Confirm understanding at each phase
- **Dual Output Format** - Human-readable plans + machine-readable tasks

## License

MIT
