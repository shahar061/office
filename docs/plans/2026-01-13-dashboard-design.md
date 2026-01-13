# Office Dashboard Design

Real-time Kanban board for visualizing `/build` progress during autonomous agent execution.

## Problem

When running autonomous sub-agent fleets during `/build`, users lose track of:
- Overall progress (how much done, how much left)
- Active work (which agents doing what)
- Stuck/blocked tasks (what's been in progress too long)
- Current state (requires reading YAML files)

## Solution

A local web dashboard that watches `build-state.yaml` and displays a Kanban board with real-time updates.

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Browser (localhost:5050)             │
│  ┌───────────────────────────────────────────────────┐  │
│  │  Toggle: [By Feature] [By Agent]                  │  │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐  │  │
│  │  │ Queued  │ │ Active  │ │ Review  │ │  Done   │  │  │
│  │  │ [card]  │ │ [card]  │ │         │ │ [card]  │  │  │
│  │  └─────────┘ └─────────┘ └─────────┘ └─────────┘  │  │
│  └───────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
        ▲ WebSocket (real-time updates)
        │
┌───────┴─────────────────────────────────────────────────┐
│                 Python Server (Flask)                   │
│  - Serves static frontend (HTML/CSS/JS)                 │
│  - Watches build-state.yaml + tasks.yaml                │
│  - Pushes state changes via WebSocket                   │
│  - REST endpoint for initial state load                 │
└─────────────────────────────────────────────────────────┘
        ▲ File watch (watchdog)
        │
┌───────┴─────────────────────────────────────────────────┐
│              docs/office/                               │
│  - build-state.yaml (live state)                        │
│  - tasks.yaml (task definitions)                        │
└─────────────────────────────────────────────────────────┘
```

**Data flow:** Sub-agents update `build-state.yaml` → watchdog detects change → server parses YAML → WebSocket broadcasts to browser → UI re-renders.

## Data Model

### Task Card Data

Derived by joining `tasks.yaml` (static) with `build-state.yaml` (live).

**From tasks.yaml:**
- Task ID and title
- Feature group
- Dependencies (depends_on list)
- Domain (backend, frontend, etc.)

**From build-state.yaml:**
- Status (queued, assigned, in_progress, review, done, failed)
- Assigned agent
- started_at timestamp
- status_changed_at timestamp
- Retry count
- Error message (if failed)

**Computed fields:**
- Time in current state (now - status_changed_at)
- Blocked by (unfinished dependencies)
- Blocking (tasks waiting on this one)

### build-state.yaml Schema Update

Add timestamp fields to task entries:

```yaml
tasks:
  TASK-003:
    status: in_progress
    agent: backend-engineer
    started_at: 2026-01-13T22:15:00Z
    status_changed_at: 2026-01-13T22:15:00Z
    retry_count: 0
    error: null
```

### Task Card Layout

```
┌────────────────────────────────────────┐
│ [feature-tag]              🔄 retry: 1 │
│                                        │
│ TASK-003: Implement user auth API      │
│                                        │
│ 👤 backend-engineer    ⏱ 12m in state  │
│                                        │
│ ⛓ Blocked by: TASK-001, TASK-002      │
│ ⛓ Blocking: TASK-007                  │
└────────────────────────────────────────┘
```

**Visual indicators:**
- Color-coded borders by status (yellow = active, red = failed, green = done)
- Pulsing animation for stuck tasks (> 30 min in same state)
- Retry badge turns red when retry count > 2
- Dependency links expandable on hover

## Views

### Feature View (default)

Swim lanes grouped by feature, columns by status:

```
┌─────────────────────────────────────────────────────────────────┐
│ [By Feature ●]  [By Agent ○]                    🟢 Connected    │
├─────────────────────────────────────────────────────────────────┤
│                 Queued    Active    Review    Done              │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ Feature: User Auth                              [3/5 done]  │ │
│ │           [card]    [card]              [card] [card] [card]│ │
│ └─────────────────────────────────────────────────────────────┘ │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ Feature: Payment Flow                           [0/4 done]  │ │
│ │  [card]   [card]                                            │ │
│ │  [card]   [card]                                            │ │
│ └─────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

### Agent View

Columns per agent, showing current and completed work:

```
┌─────────────────────────────────────────────────────────────────┐
│ [By Feature ○]  [By Agent ●]                    🟢 Connected    │
├─────────────────────────────────────────────────────────────────┤
│  backend-eng   frontend-eng   devops      automation-dev       │
│ ┌───────────┐ ┌───────────┐ ┌───────────┐ ┌───────────┐        │
│ │ Active:   │ │ Active:   │ │ Idle      │ │ Active:   │        │
│ │ [card]    │ │ [card]    │ │           │ │ [card]    │        │
│ ├───────────┤ ├───────────┤ ├───────────┤ ├───────────┤        │
│ │ Done: 3   │ │ Done: 2   │ │ Done: 1   │ │ Done: 0   │        │
│ │ [mini]    │ │ [mini]    │ │ [mini]    │ │           │        │
│ └───────────┘ └───────────┘ └───────────┘ └───────────┘        │
└─────────────────────────────────────────────────────────────────┘
```

### Header Bar (both views)

- View toggle
- Connection status (🟢 connected / 🔴 disconnected)
- Overall progress: "12/20 tasks complete (60%)"
- Elapsed build time

## Integration

### Auto-start with /build

When `/build` begins, before spawning agents:
1. Check if Python 3 is available
2. Create venv if not exists, install deps if needed
3. Start dashboard server in background on port 5050
4. Print: `Dashboard running at http://localhost:5050`
5. Continue with normal build process
6. When build completes (or interrupted), stop the server

### Manual /office:dashboard Skill

```
/office:dashboard              # Start dashboard
/office:dashboard stop         # Stop dashboard
/office:dashboard --port 8080  # Custom port
```

## File Structure

```
office/
├── skills/
│   └── dashboard.md           # Skill definition
├── dashboard/
│   ├── server.py              # Flask app + file watcher
│   ├── requirements.txt       # Flask, flask-sock, watchdog, pyyaml
│   ├── static/
│   │   ├── index.html
│   │   ├── style.css          # Tailwind (CDN)
│   │   └── app.js             # View logic + WebSocket client
│   └── setup.sh               # Venv creation + pip install
└── agents/
    └── ... (existing)
```

## Error Handling

### Stuck Task Detection
- Tasks in active/in_progress > 30 min get pulsing border
- Tooltip: "In this state for 32 minutes"
- Configurable via `?stuck_threshold=15`

### Failed Tasks
- Red border, error icon
- Expandable error message
- Retry count prominent
- Filter: "Show only failed"

### Connection Handling
- WebSocket auto-reconnects (exponential backoff)
- "Reconnecting..." indicator
- Stale data warning if disconnected > 30s
- Full state refresh on reconnect

### File Parse Errors
- Malformed YAML: skip update, retry next change
- Log warning, don't crash
- Browser shows last known good state

### Port Conflicts
- Default: 5050
- Auto-try 5051-5059 if in use
- Print actual port to terminal
- Clear error if all ports in use

### No Build in Progress
- Empty state: "No active build. Run /build to start."
- Can view historical state if build-state.yaml exists

## Graceful Degradation

If dashboard fails to start (no Python, port unavailable), `/build` continues normally with warning. Dashboard is optional visibility, not a blocker.

## Tech Stack

- **Backend:** Python 3.8+, Flask, flask-sock, watchdog, pyyaml
- **Frontend:** HTML, Tailwind CSS (CDN), vanilla JavaScript
- **Distribution:** Assume Python installed, auto-create venv, auto-install deps

## Out of Scope

- Drag-drop task reassignment
- Historical build comparisons
- Persistent dashboard (runs only during builds or manual)
- Authentication (localhost only)

## Implementation Dependencies

1. Update `/build` skill to write timestamps to build-state.yaml
2. Update agent-organizer to include timestamps when updating task status
