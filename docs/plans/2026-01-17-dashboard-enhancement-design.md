# Dashboard Enhancement - Design

## Problem

The dashboard was designed for the old `build-state.yaml` architecture but the build system now uses:
- `build/config.yaml` - Build configuration
- `build/phase-*/status.yaml` - Per-phase task status
- `build/phase-*/progress.log` - Event timeline

**Current issues:**
1. Server returns `build_config` but frontend expects `build_state`
2. Frontend expects `buildState.build.started_at` but config has `started_at` at root
3. Real-time updates may not be triggering properly
4. No phase-level visualization (only task-level)
5. No activity feed or timing information

## Solution

Fix compatibility issues and add phase-centric features while keeping the lightweight static HTML/JS architecture.

## Design

### Part 1: Compatibility Fixes

#### 1.1 Server Data Structure Fix

Update `server.py` `load_state()` to return correct structure:

```python
data = {
    'tasks': None,
    'build_state': {  # Renamed from build_config
        'build': {    # Wrapped for frontend compatibility
            'session_id': config.get('session_id'),
            'started_at': config.get('started_at'),
            'status': 'in_progress',  # Computed from phases
        },
        'models': config.get('models'),
        'retry_limit': config.get('retry_limit'),
    },
    'phases_state': {},
    'merged': [],
    'activity': [],  # NEW: Recent events from progress.log
}
```

#### 1.2 Real-time Update Fix

Debug and fix the file watcher to ensure:
- Changes to `build/phase-*/status.yaml` trigger WebSocket broadcast
- Changes to `build/phase-*/progress.log` trigger activity updates
- Debouncing doesn't swallow rapid updates

Add logging to trace update flow:
```python
def broadcast_state():
    print(f"Broadcasting state to {len(connected_clients)} clients")
    # ... existing code
```

### Part 2: Phase-Centric Features

#### 2.1 Phase Status Cards

New UI component showing each phase as a card:

```
┌─────────────────────────────────────────────────────────┐
│  PHASES                                                  │
├─────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐   │
│  │ Phase 1      │  │ Phase 2      │  │ Phase 3      │   │
│  │ Backend      │  │ Real-Time    │  │ Trivia API   │   │
│  │ ✅ Complete  │  │ 🔄 Running   │  │ ⏳ Blocked   │   │
│  │ 13/13 tasks  │  │ 3/8 tasks    │  │ 0/5 tasks    │   │
│  │ 45m 23s      │  │ 12m 05s      │  │ waiting...   │   │
│  └──────────────┘  └──────────────┘  └──────────────┘   │
└─────────────────────────────────────────────────────────┘
```

**Status indicators:**
- ⏳ Blocked (waiting on dependencies)
- 🔄 In Progress (worktree active)
- ✅ Complete (merged to build branch)
- ❌ Failed (has failed tasks)

#### 2.2 Parallel Execution Visualization

Show which phases are running simultaneously:

```
Timeline View:
──────────────────────────────────────────────────────────
Phase 1: ████████████████████░░░░░░░░░░░░░░░░░░░░  Complete
Phase 2:                     ████████░░░░░░░░░░░░  Running
Phase 3:                     ████░░░░░░░░░░░░░░░░  Running (parallel)
Phase 4:                              ░░░░░░░░░░░  Blocked
──────────────────────────────────────────────────────────
```

#### 2.3 Phase Dependency Graph

Visual display of phase dependencies:

```
Phase 1 ──┬──► Phase 2 ──┬──► Phase 5 ──► Phase 6
          │              │
          └──► Phase 3 ──┘
          │
          └──► Phase 4 ──┘
```

Implemented as simple text or SVG arrows showing flow.

#### 2.4 Phase Drill-Down

Click on a phase card to expand and see all tasks within that phase:

```
┌─────────────────────────────────────────────────────────────────┐
│  Phase 2 - Real-Time Features                          [Collapse]│
├─────────────────────────────────────────────────────────────────┤
│  Status: 🔄 In Progress    Progress: 3/8 tasks    Duration: 12m │
├─────────────────────────────────────────────────────────────────┤
│  TASKS                                                          │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐           │
│  │ rt-001   │ │ rt-002   │ │ rt-003   │ │ rt-004   │           │
│  │ WebSocket│ │ Events   │ │ Sync     │ │ Reconnect│           │
│  │ ✅ 2m 30s│ │ ✅ 1m 45s│ │ 🔄 Active│ │ ⏳ Queued│           │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘           │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐           │
│  │ rt-005   │ │ rt-006   │ │ rt-007   │ │ rt-008   │           │
│  │ Broadcast│ │ Presence │ │ Heartbeat│ │ Recovery │           │
│  │ ⏳ Queued│ │ ⏳ Queued│ │ ⏳ Queued│ │ ⏳ Queued│           │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘           │
└─────────────────────────────────────────────────────────────────┘
```

**Behavior:**
- Click on collapsed phase card → expands to show tasks
- Click on expanded phase or [Collapse] → collapses back
- Accordion behavior: only one phase expanded at a time
- Tasks show: ID, title, status icon, duration (if completed)

**Implementation:**
- `expandedPhase` state variable tracks which phase is expanded (null or phase ID)
- `renderExpandedPhase(phaseId)` function renders the task grid
- Click handler on phase cards toggles expansion

### Part 3: Activity & Timing Features

#### 3.1 Activity Feed

Real-time event stream from progress.log files:

```
┌─────────────────────────────────────────────────────────┐
│  ACTIVITY                                          Live │
├─────────────────────────────────────────────────────────┤
│  10:46:21  Phase 1 completed                           │
│  10:45:15  Task be-013 done (6m 02s)                   │
│  10:39:13  Task be-013 started                         │
│  10:38:45  Task be-012 done (1m 50s)                   │
│  10:36:55  Task be-012 started                         │
│  ...                                                    │
└─────────────────────────────────────────────────────────┘
```

**Server-side:**
```python
def parse_progress_logs():
    """Parse all progress.log files and return sorted events."""
    events = []
    for phase_dir in build_dir.glob('phase-*'):
        log_file = phase_dir / 'progress.log'
        if log_file.exists():
            phase_id = phase_dir.name
            for line in log_file.read_text().splitlines():
                # Parse: "2026-01-16T17:22:00+02:00 TASK_DONE:be-005"
                parts = line.split(' ', 1)
                if len(parts) == 2:
                    timestamp, event = parts
                    events.append({
                        'timestamp': timestamp,
                        'event': event,
                        'phase': phase_id
                    })
    return sorted(events, key=lambda e: e['timestamp'], reverse=True)[:50]
```

#### 3.2 Task Timing

Calculate duration for completed tasks:

```python
def calculate_task_durations(events):
    """Calculate how long each task took."""
    starts = {}  # task_id -> start_time
    durations = {}  # task_id -> duration_seconds

    for event in sorted(events, key=lambda e: e['timestamp']):
        if 'TASK_START:' in event['event']:
            task_id = event['event'].split(':')[1]
            starts[task_id] = parse_timestamp(event['timestamp'])
        elif 'TASK_DONE:' in event['event']:
            task_id = event['event'].split(':')[1]
            if task_id in starts:
                end_time = parse_timestamp(event['timestamp'])
                durations[task_id] = (end_time - starts[task_id]).total_seconds()

    return durations
```

Display in task cards:
```
┌────────────────────────┐
│ be-007                 │
│ Implement steal logic  │
│ ✅ Completed           │
│ Duration: 2m 34s       │
└────────────────────────┘
```

### Part 4: UI Layout Changes

#### 4.1 New Dashboard Layout

```
┌─────────────────────────────────────────────────────────────────┐
│  Office Dashboard                    ● Connected    12m 34s     │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  BUILD: build/20260116-171910              Progress: 13/45 (29%) │
│                                                                  │
├─────────────────────────────────────────────────────────────────┤
│  PHASES                                                          │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐    │
│  │ Phase 1 │→│ Phase 2 │→│ Phase 3 │→│ Phase 5 │→│ Phase 6 │    │
│  │   ✅    │ │   🔄    │ │   ⏳    │ │   ⏳    │ │   ⏳    │    │
│  └─────────┘ └────┬────┘ └─────────┘ └─────────┘ └─────────┘    │
│                   │                                              │
│                   └──────→│ Phase 4 │                           │
│                           │   ⏳    │                           │
│                           └─────────┘                           │
├──────────────────────────────────┬──────────────────────────────┤
│  TASKS (Phase 2 - In Progress)   │  ACTIVITY                    │
│  ┌───────────────────────────┐   │  10:46 Phase 1 complete      │
│  │ Queued    │ Active │ Done │   │  10:45 be-013 done (6m)      │
│  │ ░░░░░░░░░ │ ████   │ ████ │   │  10:39 be-013 started        │
│  │ 3 tasks   │ 2 task │ 3    │   │  10:38 be-012 done (2m)      │
│  └───────────────────────────┘   │  ...                         │
├──────────────────────────────────┴──────────────────────────────┤
│  [Feature View]  [Agent View]  [Phase View]                      │
└─────────────────────────────────────────────────────────────────┘
```

#### 4.2 View Modes

1. **Phase View** (NEW default) - Shows phases with task breakdown
2. **Feature View** - Existing swim lane view (tasks by status)
3. **Agent View** - Existing agent columns view

## File Changes

### Server (server.py)

1. **Fix data structure** - Rename `build_config` to `build_state`, wrap correctly
2. **Add activity parsing** - Parse progress.log files
3. **Add task durations** - Calculate timing from events
4. **Fix real-time updates** - Ensure file watcher broadcasts properly
5. **Add debug logging** - Trace update flow

### Frontend (static/app.js)

1. **Add phase cards** - New `renderPhaseCards()` function
2. **Add activity feed** - New `renderActivityFeed()` function
3. **Add phase drill-down** - New `renderExpandedPhase()` function with click handlers
4. **Add phase view** - New view mode alongside feature/agent
5. **Show task durations** - Display in task cards
6. **Add dependency visualization** - Simple arrow indicators

### Frontend (static/index.html)

1. **Update layout** - Add phase section at top
2. **Add activity panel** - Sidebar or panel for events
3. **Add expanded phase container** - Container for drill-down task grid
4. **Add phase view toggle** - Third view option

### Frontend (static/style.css)

1. **Phase card styles** - Status colors, progress indicators
2. **Activity feed styles** - Scrolling list, timestamps
3. **Expanded phase styles** - Task grid, collapse button
4. **Dependency arrows** - Simple CSS arrows or SVG

## Implementation Notes

### Real-time Architecture

```
File Change → Watchdog → broadcast_state() → WebSocket → All Clients
     ↓
  status.yaml changes
  progress.log appends
  config.yaml changes
```

The watchdog observer already watches recursively. Debug points:
1. `_should_watch()` - Is the file being watched?
2. `on_modified()` - Is the event firing?
3. `broadcast_state()` - Is it being called?
4. WebSocket send - Are clients receiving?

### Keep Lightweight

- No framework changes - vanilla JS only
- Tailwind via CDN (already in place)
- No build step
- Single server.py file
- Static files served directly

## Benefits

1. **Compatibility** - Works with new per-phase architecture
2. **Real-time** - Truly live updates without refresh
3. **Phase visibility** - See parallel execution at a glance
4. **Activity tracking** - Know what's happening right now
5. **Task timing** - Understand performance characteristics
6. **Lightweight** - No added dependencies or build steps
