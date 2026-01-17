# Dashboard Enhancement Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix dashboard compatibility with new per-phase architecture and add phase-centric visualization features.

**Architecture:** Update server to return correct data structure, add activity parsing from progress.log files, enhance frontend with phase cards, drill-down, and real-time activity feed. Keep lightweight static HTML/JS architecture.

**Tech Stack:** Python/Flask (server), vanilla JavaScript, Tailwind CSS via CDN

---

## Task 1: Fix Server Data Structure Compatibility

**Files:**
- Modify: `dashboard/server.py:131-180`

**Step 1: Update load_state() return structure**

In `server.py`, change the `load_state()` function to rename `build_config` to `build_state` and wrap it correctly for frontend compatibility.

Find this code (around line 139-144):
```python
    data = {
        'tasks': None,
        'phases_state': {},
        'build_config': None,
        'merged': []
    }
```

Replace with:
```python
    data = {
        'tasks': None,
        'phases_state': {},
        'build_state': None,
        'merged': [],
        'activity': [],
    }
```

**Step 2: Update config loading to wrap in build object**

Find this code (around line 154-161):
```python
    # Load build config if exists
    config_file = build_dir / 'config.yaml'
    if config_file.exists():
        try:
            with open(config_file) as f:
                data['build_config'] = yaml.safe_load(f)
        except Exception as e:
            data['config_error'] = str(e)
```

Replace with:
```python
    # Load build config if exists
    config_file = build_dir / 'config.yaml'
    if config_file.exists():
        try:
            with open(config_file) as f:
                config = yaml.safe_load(f)
                # Wrap for frontend compatibility
                data['build_state'] = {
                    'build': {
                        'session_id': config.get('session_id'),
                        'started_at': config.get('started_at'),
                        'status': 'in_progress',
                    },
                    'models': config.get('models'),
                    'retry_limit': config.get('retry_limit'),
                }
        except Exception as e:
            data['config_error'] = str(e)
```

**Step 3: Test manually**

Run: `cd dashboard && python server.py --office-dir /path/to/project/docs/office`

Open: `http://localhost:5050/api/state`

Expected: JSON response with `build_state.build.started_at` field present

**Step 4: Commit**

```bash
git add dashboard/server.py
git commit -m "fix(dashboard): rename build_config to build_state for frontend compatibility"
```

---

## Task 2: Add Activity Parsing from Progress Logs

**Files:**
- Modify: `dashboard/server.py`

**Step 1: Add parse_progress_logs function**

Add this function after the `merge_task_data` function (around line 256):

```python
def parse_progress_logs(build_dir):
    """Parse all progress.log files and return sorted events."""
    events = []

    if not build_dir.exists():
        return events

    for phase_dir in build_dir.glob('phase-*'):
        log_file = phase_dir / 'progress.log'
        if log_file.exists():
            phase_id = phase_dir.name
            try:
                for line in log_file.read_text().splitlines():
                    line = line.strip()
                    if not line:
                        continue
                    # Parse: "2026-01-16T17:22:00+02:00 TASK_DONE:be-005"
                    parts = line.split(' ', 1)
                    if len(parts) == 2:
                        timestamp, event = parts
                        events.append({
                            'timestamp': timestamp,
                            'event': event,
                            'phase': phase_id
                        })
            except Exception as e:
                print(f"Error parsing {log_file}: {e}")

    return sorted(events, key=lambda e: e['timestamp'], reverse=True)[:50]
```

**Step 2: Add calculate_task_durations function**

Add this function after `parse_progress_logs`:

```python
def calculate_task_durations(events):
    """Calculate how long each task took from TASK_START to TASK_DONE."""
    from datetime import datetime

    starts = {}  # task_id -> start_time
    durations = {}  # task_id -> duration_seconds

    def parse_timestamp(ts):
        # Handle ISO format with timezone
        try:
            # Try parsing with timezone
            if '+' in ts or ts.endswith('Z'):
                # Remove timezone for simpler parsing
                ts_clean = ts.replace('Z', '+00:00')
                if '+' in ts_clean:
                    ts_parts = ts_clean.rsplit('+', 1)
                    ts_clean = ts_parts[0]
                return datetime.fromisoformat(ts_clean)
            return datetime.fromisoformat(ts)
        except ValueError:
            return None

    for event in sorted(events, key=lambda e: e['timestamp']):
        if ':' in event['event']:
            event_type, task_id = event['event'].split(':', 1)
            ts = parse_timestamp(event['timestamp'])
            if not ts:
                continue

            if event_type == 'TASK_START':
                starts[task_id] = ts
            elif event_type == 'TASK_DONE':
                if task_id in starts:
                    duration = (ts - starts[task_id]).total_seconds()
                    durations[task_id] = duration

    return durations
```

**Step 3: Call parse functions in load_state**

In `load_state()`, after loading phases_state (around line 176), add:

```python
    # Parse activity from progress.log files
    events = parse_progress_logs(build_dir)
    data['activity'] = events
    data['task_durations'] = calculate_task_durations(events)
```

**Step 4: Test manually**

Run: `python dashboard/server.py --office-dir /path/to/project/docs/office`

Open: `http://localhost:5050/api/state`

Expected: JSON response with `activity` array containing events with timestamp, event, phase fields

**Step 5: Commit**

```bash
git add dashboard/server.py
git commit -m "feat(dashboard): add activity parsing from progress.log files"
```

---

## Task 3: Update HTML Layout

**Files:**
- Modify: `dashboard/static/index.html`

**Step 1: Add phase view button to view toggle**

Find (line 18-25):
```html
                <div class="flex bg-gray-700 rounded-lg p-1">
                    <button id="btn-feature-view" class="view-toggle active px-4 py-1.5 rounded-md text-sm font-medium transition-colors">
                        By Feature
                    </button>
                    <button id="btn-agent-view" class="view-toggle px-4 py-1.5 rounded-md text-sm font-medium transition-colors">
                        By Agent
                    </button>
                </div>
```

Replace with:
```html
                <div class="flex bg-gray-700 rounded-lg p-1">
                    <button id="btn-phase-view" class="view-toggle active px-4 py-1.5 rounded-md text-sm font-medium transition-colors">
                        By Phase
                    </button>
                    <button id="btn-feature-view" class="view-toggle px-4 py-1.5 rounded-md text-sm font-medium transition-colors">
                        By Feature
                    </button>
                    <button id="btn-agent-view" class="view-toggle px-4 py-1.5 rounded-md text-sm font-medium transition-colors">
                        By Agent
                    </button>
                </div>
```

**Step 2: Add build info bar after header**

Find (line 46-48):
```html
    </header>

    <!-- Main Content -->
```

Replace with:
```html
    </header>

    <!-- Build Info Bar -->
    <div id="build-info" class="bg-gray-800/50 border-b border-gray-700 px-6 py-3 hidden">
        <div class="flex items-center justify-between">
            <span id="build-session" class="text-sm text-gray-400">Build: --</span>
            <div class="flex items-center gap-4">
                <div class="flex-1 bg-gray-700 rounded-full h-2 w-48">
                    <div id="build-progress-bar" class="bg-blue-500 h-2 rounded-full transition-all" style="width: 0%"></div>
                </div>
                <span id="build-progress-pct" class="text-sm text-gray-400">0%</span>
            </div>
        </div>
    </div>

    <!-- Main Content -->
```

**Step 3: Add phases section and activity panel**

Find (line 49-68):
```html
    <main class="p-6">
        <!-- Empty State -->
        <div id="empty-state" class="hidden flex flex-col items-center justify-center py-20 text-gray-500">
            ...
        </div>

        <!-- Feature View -->
        <div id="feature-view" class="space-y-6">
            <!-- Features rendered here by JS -->
        </div>

        <!-- Agent View -->
        <div id="agent-view" class="hidden grid grid-cols-6 gap-4">
            <!-- Agent columns rendered here by JS -->
        </div>
    </main>
```

Replace with:
```html
    <main class="p-6">
        <!-- Empty State -->
        <div id="empty-state" class="hidden flex flex-col items-center justify-center py-20 text-gray-500">
            <svg class="w-16 h-16 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path>
            </svg>
            <p class="text-lg">No active build</p>
            <p class="text-sm mt-2">Run /build to start</p>
        </div>

        <!-- Phase View -->
        <div id="phase-view" class="space-y-6">
            <!-- Phase Cards -->
            <div id="phase-cards" class="flex flex-wrap gap-4">
                <!-- Phase cards rendered here by JS -->
            </div>

            <!-- Expanded Phase (drill-down) -->
            <div id="expanded-phase" class="hidden">
                <!-- Expanded phase content rendered here by JS -->
            </div>

            <!-- Activity Feed -->
            <div id="activity-section" class="mt-6">
                <div class="flex items-center justify-between mb-4">
                    <h2 class="text-sm font-medium text-gray-400 uppercase tracking-wider">Activity</h2>
                    <span class="text-xs text-green-400">Live</span>
                </div>
                <div id="activity-feed" class="bg-gray-800/50 rounded-lg p-4 max-h-64 overflow-y-auto">
                    <!-- Activity items rendered here by JS -->
                </div>
            </div>
        </div>

        <!-- Feature View -->
        <div id="feature-view" class="hidden space-y-6">
            <!-- Features rendered here by JS -->
        </div>

        <!-- Agent View -->
        <div id="agent-view" class="hidden grid grid-cols-6 gap-4">
            <!-- Agent columns rendered here by JS -->
        </div>
    </main>
```

**Step 4: Test manually**

Open: `http://localhost:5050`

Expected: See "By Phase" button active, phase-cards container visible, activity section visible

**Step 5: Commit**

```bash
git add dashboard/static/index.html
git commit -m "feat(dashboard): add phase view layout with activity feed"
```

---

## Task 4: Add CSS Styles for New Components

**Files:**
- Modify: `dashboard/static/style.css`

**Step 1: Add phase card styles**

Add at the end of the file:

```css
/* Phase Cards */
.phase-card {
    @apply bg-gray-800 rounded-lg p-4 cursor-pointer transition-all min-w-[140px];
    @apply border-2 border-transparent hover:border-gray-600;
}

.phase-card.status-pending,
.phase-card.status-blocked {
    @apply opacity-60;
}

.phase-card.status-in_progress {
    @apply border-yellow-400/50;
}

.phase-card.status-completed {
    @apply border-green-500/50;
}

.phase-card.status-failed {
    @apply border-red-500/50;
}

.phase-card.expanded {
    @apply ring-2 ring-blue-500;
}

/* Phase Status Icons */
.phase-status-icon {
    @apply text-2xl mb-2;
}

/* Phase Arrow */
.phase-arrow {
    @apply text-gray-500 text-xl self-center;
}

/* Expanded Phase Panel */
.expanded-phase-panel {
    @apply bg-gray-800/50 rounded-lg p-6;
}

.expanded-phase-header {
    @apply flex items-center justify-between mb-4 pb-4 border-b border-gray-700;
}

.expanded-phase-tasks {
    @apply grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3;
}

/* Task Mini Card (for expanded phase) */
.task-mini {
    @apply bg-gray-700 rounded-lg p-3 text-center;
}

.task-mini.status-queued {
    @apply border-l-4 border-gray-500;
}

.task-mini.status-in_progress {
    @apply border-l-4 border-yellow-400;
}

.task-mini.status-completed,
.task-mini.status-done {
    @apply border-l-4 border-green-500;
}

.task-mini.status-failed {
    @apply border-l-4 border-red-500;
}

/* Activity Feed */
.activity-item {
    @apply flex items-start gap-3 py-2 border-b border-gray-700/50 last:border-0;
}

.activity-time {
    @apply text-xs text-gray-500 font-mono w-16 flex-shrink-0;
}

.activity-event {
    @apply text-sm text-gray-300 flex-1;
}

.activity-phase {
    @apply text-xs text-gray-500 px-2 py-0.5 bg-gray-700 rounded;
}

/* Activity event types */
.activity-item.phase-start .activity-event {
    @apply text-blue-400;
}

.activity-item.phase-complete .activity-event {
    @apply text-green-400;
}

.activity-item.task-done .activity-event {
    @apply text-green-300;
}

.activity-item.task-start .activity-event {
    @apply text-yellow-300;
}
```

**Step 2: Test manually**

Refresh: `http://localhost:5050`

Expected: Styles loaded without CSS errors in console

**Step 3: Commit**

```bash
git add dashboard/static/style.css
git commit -m "feat(dashboard): add CSS styles for phase cards and activity feed"
```

---

## Task 5: Add Phase Cards Rendering in JavaScript

**Files:**
- Modify: `dashboard/static/app.js`

**Step 1: Update state object**

Find (line 6-13):
```javascript
let state = {
    features: [],
    buildState: null,
    tasks: null,
    connected: false,
    currentView: 'feature', // 'feature' or 'agent'
    stuckThreshold: 30 * 60 * 1000, // 30 minutes in ms
};
```

Replace with:
```javascript
let state = {
    features: [],
    buildState: null,
    tasks: null,
    activity: [],
    taskDurations: {},
    connected: false,
    currentView: 'phase', // 'phase', 'feature', or 'agent'
    expandedPhase: null,
    stuckThreshold: 30 * 60 * 1000, // 30 minutes in ms
};
```

**Step 2: Update elements object**

Find (line 22-34):
```javascript
const elements = {
    featureView: document.getElementById('feature-view'),
    agentView: document.getElementById('agent-view'),
    emptyState: document.getElementById('empty-state'),
    btnFeatureView: document.getElementById('btn-feature-view'),
    btnAgentView: document.getElementById('btn-agent-view'),
    statusIndicator: document.getElementById('status-indicator'),
    statusText: document.getElementById('status-text'),
    progressText: document.getElementById('progress-text'),
    elapsedTime: document.getElementById('elapsed-time'),
    reconnectOverlay: document.getElementById('reconnect-overlay'),
    reconnectAttempt: document.getElementById('reconnect-attempt'),
};
```

Replace with:
```javascript
const elements = {
    phaseView: document.getElementById('phase-view'),
    featureView: document.getElementById('feature-view'),
    agentView: document.getElementById('agent-view'),
    emptyState: document.getElementById('empty-state'),
    btnPhaseView: document.getElementById('btn-phase-view'),
    btnFeatureView: document.getElementById('btn-feature-view'),
    btnAgentView: document.getElementById('btn-agent-view'),
    phaseCards: document.getElementById('phase-cards'),
    expandedPhase: document.getElementById('expanded-phase'),
    activityFeed: document.getElementById('activity-feed'),
    buildInfo: document.getElementById('build-info'),
    buildSession: document.getElementById('build-session'),
    buildProgressBar: document.getElementById('build-progress-bar'),
    buildProgressPct: document.getElementById('build-progress-pct'),
    statusIndicator: document.getElementById('status-indicator'),
    statusText: document.getElementById('status-text'),
    progressText: document.getElementById('progress-text'),
    elapsedTime: document.getElementById('elapsed-time'),
    reconnectOverlay: document.getElementById('reconnect-overlay'),
    reconnectAttempt: document.getElementById('reconnect-attempt'),
};
```

**Step 3: Update init function**

Find (line 44-46):
```javascript
    // Set up view toggle
    elements.btnFeatureView.addEventListener('click', () => setView('feature'));
    elements.btnAgentView.addEventListener('click', () => setView('agent'));
```

Replace with:
```javascript
    // Set up view toggle
    elements.btnPhaseView.addEventListener('click', () => setView('phase'));
    elements.btnFeatureView.addEventListener('click', () => setView('feature'));
    elements.btnAgentView.addEventListener('click', () => setView('agent'));
```

**Step 4: Update updateState function**

Find (line 130-136):
```javascript
function updateState(data) {
    state.features = data.merged || [];
    state.buildState = data.build_state;
    state.tasks = data.tasks;

    render();
}
```

Replace with:
```javascript
function updateState(data) {
    state.features = data.merged || [];
    state.buildState = data.build_state;
    state.tasks = data.tasks;
    state.activity = data.activity || [];
    state.taskDurations = data.task_durations || {};

    render();
}
```

**Step 5: Update setView function**

Find (line 139-151):
```javascript
function setView(view) {
    state.currentView = view;

    // Update toggle buttons
    elements.btnFeatureView.classList.toggle('active', view === 'feature');
    elements.btnAgentView.classList.toggle('active', view === 'agent');

    // Show/hide views
    elements.featureView.classList.toggle('hidden', view !== 'feature');
    elements.agentView.classList.toggle('hidden', view !== 'agent');

    render();
}
```

Replace with:
```javascript
function setView(view) {
    state.currentView = view;
    state.expandedPhase = null; // Reset expanded phase when changing views

    // Update toggle buttons
    elements.btnPhaseView.classList.toggle('active', view === 'phase');
    elements.btnFeatureView.classList.toggle('active', view === 'feature');
    elements.btnAgentView.classList.toggle('active', view === 'agent');

    // Show/hide views
    elements.phaseView.classList.toggle('hidden', view !== 'phase');
    elements.featureView.classList.toggle('hidden', view !== 'feature');
    elements.agentView.classList.toggle('hidden', view !== 'agent');

    render();
}
```

**Step 6: Commit**

```bash
git add dashboard/static/app.js
git commit -m "feat(dashboard): update JS state and view management for phase view"
```

---

## Task 6: Add Phase Cards and Activity Feed Rendering

**Files:**
- Modify: `dashboard/static/app.js`

**Step 1: Update render function**

Find (line 252-273):
```javascript
function render() {
    // Check for empty state
    if (!state.features.length) {
        elements.emptyState.classList.remove('hidden');
        elements.featureView.classList.add('hidden');
        elements.agentView.classList.add('hidden');
        return;
    }

    elements.emptyState.classList.add('hidden');

    // Update progress
    updateProgress();

    // Render current view
    if (state.currentView === 'feature') {
        renderFeatureView();
    } else {
        renderAgentView();
    }
}
```

Replace with:
```javascript
function render() {
    // Check for empty state
    if (!state.features.length) {
        elements.emptyState.classList.remove('hidden');
        elements.phaseView.classList.add('hidden');
        elements.featureView.classList.add('hidden');
        elements.agentView.classList.add('hidden');
        elements.buildInfo.classList.add('hidden');
        return;
    }

    elements.emptyState.classList.add('hidden');

    // Update build info bar
    updateBuildInfo();

    // Update progress
    updateProgress();

    // Render current view
    if (state.currentView === 'phase') {
        renderPhaseView();
    } else if (state.currentView === 'feature') {
        renderFeatureView();
    } else {
        renderAgentView();
    }
}
```

**Step 2: Add updateBuildInfo function**

Add after the `render` function:

```javascript
function updateBuildInfo() {
    if (!state.buildState?.build) {
        elements.buildInfo.classList.add('hidden');
        return;
    }

    elements.buildInfo.classList.remove('hidden');

    const sessionId = state.buildState.build.session_id || 'Unknown';
    elements.buildSession.textContent = `Build: ${sessionId}`;

    // Calculate progress
    let total = 0;
    let completed = 0;
    state.features.forEach(feature => {
        feature.tasks.forEach(task => {
            total++;
            if (task.status === 'done' || task.status === 'completed') {
                completed++;
            }
        });
    });

    const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
    elements.buildProgressBar.style.width = `${percent}%`;
    elements.buildProgressPct.textContent = `${percent}%`;
}
```

**Step 3: Add renderPhaseView function**

Add after `updateBuildInfo`:

```javascript
function renderPhaseView() {
    renderPhaseCards();
    renderExpandedPhase();
    renderActivityFeed();
}

function renderPhaseCards() {
    const container = elements.phaseCards;
    container.innerHTML = '';

    state.features.forEach((phase, index) => {
        // Add arrow between phases (except first)
        if (index > 0) {
            const arrow = document.createElement('span');
            arrow.className = 'phase-arrow';
            arrow.textContent = '→';
            container.appendChild(arrow);
        }

        // Count tasks
        const totalTasks = phase.tasks.length;
        const doneTasks = phase.tasks.filter(t =>
            t.status === 'done' || t.status === 'completed'
        ).length;

        // Determine status icon
        let statusIcon = '⏳'; // pending/blocked
        if (phase.status === 'in_progress') statusIcon = '🔄';
        else if (phase.status === 'completed') statusIcon = '✅';
        else if (phase.status === 'failed') statusIcon = '❌';

        const card = document.createElement('div');
        card.className = `phase-card status-${phase.status || 'pending'}`;
        if (state.expandedPhase === phase.id) {
            card.classList.add('expanded');
        }

        card.innerHTML = `
            <div class="phase-status-icon">${statusIcon}</div>
            <div class="text-sm font-medium mb-1">${escapeHtml(phase.name)}</div>
            <div class="text-xs text-gray-500">${phase.id}</div>
            <div class="text-xs text-gray-400 mt-2">${doneTasks}/${totalTasks} tasks</div>
        `;

        card.addEventListener('click', () => togglePhaseExpand(phase.id));
        container.appendChild(card);
    });
}

function togglePhaseExpand(phaseId) {
    if (state.expandedPhase === phaseId) {
        state.expandedPhase = null;
    } else {
        state.expandedPhase = phaseId;
    }
    render();
}

function renderExpandedPhase() {
    const container = elements.expandedPhase;

    if (!state.expandedPhase) {
        container.classList.add('hidden');
        return;
    }

    const phase = state.features.find(f => f.id === state.expandedPhase);
    if (!phase) {
        container.classList.add('hidden');
        return;
    }

    container.classList.remove('hidden');

    // Count by status
    const doneTasks = phase.tasks.filter(t => t.status === 'done' || t.status === 'completed').length;
    const activeTasks = phase.tasks.filter(t => t.status === 'in_progress' || t.status === 'assigned').length;

    container.innerHTML = `
        <div class="expanded-phase-panel">
            <div class="expanded-phase-header">
                <div>
                    <h3 class="text-lg font-medium">${escapeHtml(phase.name)}</h3>
                    <p class="text-sm text-gray-400">${phase.id} • ${doneTasks}/${phase.tasks.length} tasks complete</p>
                </div>
                <button onclick="togglePhaseExpand('${phase.id}')" class="text-gray-400 hover:text-white text-sm">
                    [Collapse]
                </button>
            </div>
            <div class="expanded-phase-tasks">
                ${phase.tasks.map(task => renderTaskMini(task)).join('')}
            </div>
        </div>
    `;
}

function renderTaskMini(task) {
    const duration = state.taskDurations[task.id];
    const durationStr = duration ? formatDuration(duration) : '';

    let statusIcon = '⏳';
    if (task.status === 'in_progress') statusIcon = '🔄';
    else if (task.status === 'done' || task.status === 'completed') statusIcon = '✅';
    else if (task.status === 'failed') statusIcon = '❌';

    return `
        <div class="task-mini status-${task.status || 'queued'}">
            <div class="text-lg mb-1">${statusIcon}</div>
            <div class="text-xs font-medium">${escapeHtml(task.id)}</div>
            <div class="text-xs text-gray-400 truncate" title="${escapeHtml(task.title)}">${escapeHtml(task.title)}</div>
            ${durationStr ? `<div class="text-xs text-gray-500 mt-1">${durationStr}</div>` : ''}
        </div>
    `;
}

function formatDuration(seconds) {
    if (seconds < 60) return `${Math.round(seconds)}s`;
    const minutes = Math.floor(seconds / 60);
    const secs = Math.round(seconds % 60);
    if (minutes < 60) return `${minutes}m ${secs}s`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
}
```

**Step 4: Add renderActivityFeed function**

Add after `formatDuration`:

```javascript
function renderActivityFeed() {
    const container = elements.activityFeed;

    if (!state.activity.length) {
        container.innerHTML = '<div class="text-sm text-gray-500 italic">No activity yet</div>';
        return;
    }

    container.innerHTML = state.activity.slice(0, 20).map(event => {
        const time = formatActivityTime(event.timestamp);
        const { text, type } = formatActivityEvent(event.event);

        return `
            <div class="activity-item ${type}">
                <span class="activity-time">${time}</span>
                <span class="activity-event">${escapeHtml(text)}</span>
                <span class="activity-phase">${event.phase}</span>
            </div>
        `;
    }).join('');
}

function formatActivityTime(timestamp) {
    try {
        const date = new Date(timestamp);
        return date.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
        });
    } catch {
        return '--:--';
    }
}

function formatActivityEvent(event) {
    if (event === 'PHASE_START') {
        return { text: 'Phase started', type: 'phase-start' };
    }
    if (event === 'PHASE_COMPLETE') {
        return { text: 'Phase completed', type: 'phase-complete' };
    }
    if (event.startsWith('TASK_START:')) {
        const taskId = event.split(':')[1];
        return { text: `Task ${taskId} started`, type: 'task-start' };
    }
    if (event.startsWith('TASK_DONE:')) {
        const taskId = event.split(':')[1];
        const duration = state.taskDurations[taskId];
        const durationStr = duration ? ` (${formatDuration(duration)})` : '';
        return { text: `Task ${taskId} done${durationStr}`, type: 'task-done' };
    }
    return { text: event, type: '' };
}

// Make togglePhaseExpand available globally for onclick
window.togglePhaseExpand = togglePhaseExpand;
```

**Step 5: Test manually**

Refresh: `http://localhost:5050`

Expected:
- Phase cards displayed with status icons
- Clicking a phase expands to show tasks
- Activity feed shows recent events
- Duration shown for completed tasks

**Step 6: Commit**

```bash
git add dashboard/static/app.js
git commit -m "feat(dashboard): add phase cards, drill-down, and activity feed rendering"
```

---

## Task 7: Final Testing and Version Bump

**Files:**
- Modify: `.claude-plugin/plugin.json`
- Modify: `.claude-plugin/marketplace.json`

**Step 1: Full manual test**

1. Start server: `cd dashboard && python server.py --office-dir /path/to/project/docs/office`
2. Open: `http://localhost:5050`
3. Verify:
   - [ ] Connection status shows "Connected"
   - [ ] Phase view is default view
   - [ ] Phase cards show with correct status icons
   - [ ] Clicking phase expands to show tasks
   - [ ] Task durations shown for completed tasks
   - [ ] Activity feed shows recent events
   - [ ] Progress bar updates correctly
   - [ ] Elapsed time updates every second
   - [ ] Switching to Feature view works
   - [ ] Switching to Agent view works

**Step 2: Bump version**

Update version in both files from `0.2.58` to `0.2.59`.

**Step 3: Commit and push**

```bash
git add .claude-plugin/plugin.json .claude-plugin/marketplace.json
git commit -m "chore: bump version to 0.2.59"
git push
```

---

## Summary

| Task | Description | Files |
|------|-------------|-------|
| 1 | Fix server data structure | server.py |
| 2 | Add activity parsing | server.py |
| 3 | Update HTML layout | index.html |
| 4 | Add CSS styles | style.css |
| 5 | Update JS state/views | app.js |
| 6 | Add phase rendering | app.js |
| 7 | Test and version bump | plugin.json, marketplace.json |
