# Office Dashboard Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a real-time Kanban board that visualizes `/build` progress via file watching and WebSocket updates.

**Architecture:** Python Flask server watches `build-state.yaml`, pushes changes via WebSocket to browser. Two toggle views: Feature (swim lanes) and Agent (columns). Tailwind CSS frontend.

**Tech Stack:** Python 3.8+, Flask, flask-sock, watchdog, pyyaml, Tailwind CSS (CDN), vanilla JavaScript

---

## Task Overview

| Task | Component | Description |
|------|-----------|-------------|
| 1 | requirements.txt | Define Python dependencies |
| 2 | setup.sh | Create venv setup script |
| 3 | server.py (skeleton) | Flask app with routes |
| 4 | server.py (file watcher) | Add watchdog integration |
| 5 | server.py (WebSocket) | Add WebSocket broadcast |
| 6 | index.html | Create HTML structure |
| 7 | style.css | Add Tailwind-based styles |
| 8 | app.js (state) | WebSocket client + state management |
| 9 | app.js (feature view) | Render feature swim lanes |
| 10 | app.js (agent view) | Render agent columns |
| 11 | app.js (task cards) | Render task cards with all info |
| 12 | build-state.yaml schema | Update agent-organizer for timestamps |
| 13 | dashboard skill | Create /office:dashboard skill |
| 14 | build skill update | Auto-start dashboard on /build |
| 15 | Integration test | Manual end-to-end verification |

---

## Task 1: Create requirements.txt

**Files:**
- Create: `dashboard/requirements.txt`

**Step 1: Create dashboard directory**

```bash
mkdir -p dashboard
```

**Step 2: Write requirements file**

```text
flask>=3.0.0
flask-sock>=0.7.0
watchdog>=4.0.0
pyyaml>=6.0.0
```

**Step 3: Verify file exists**

```bash
cat dashboard/requirements.txt
```

Expected: Shows 4 dependencies

**Step 4: Commit**

```bash
git add dashboard/requirements.txt
git commit -m "feat(dashboard): add Python dependencies

Flask server with WebSocket support and file watching"
```

---

## Task 2: Create setup.sh

**Files:**
- Create: `dashboard/setup.sh`

**Step 1: Write setup script**

```bash
#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
VENV_DIR="$SCRIPT_DIR/.venv"

# Check Python 3
if ! command -v python3 &> /dev/null; then
    echo "Error: Python 3 is required but not found."
    echo "Install Python 3.8+ from https://www.python.org/downloads/"
    exit 1
fi

# Create venv if not exists
if [ ! -d "$VENV_DIR" ]; then
    echo "Creating virtual environment..."
    python3 -m venv "$VENV_DIR"
fi

# Activate and install
source "$VENV_DIR/bin/activate"
echo "Installing dependencies..."
pip install -q -r "$SCRIPT_DIR/requirements.txt"

echo "Setup complete. Virtual environment at $VENV_DIR"
```

**Step 2: Make executable**

```bash
chmod +x dashboard/setup.sh
```

**Step 3: Verify script is executable**

```bash
ls -la dashboard/setup.sh | grep -q "x" && echo "Executable" || echo "Not executable"
```

Expected: Executable

**Step 4: Commit**

```bash
git add dashboard/setup.sh
git commit -m "feat(dashboard): add venv setup script

Auto-creates virtual environment and installs dependencies"
```

---

## Task 3: Create Flask Server Skeleton

**Files:**
- Create: `dashboard/server.py`

**Step 1: Write server skeleton**

```python
#!/usr/bin/env python3
"""Office Dashboard - Real-time build progress visualization."""

import argparse
import json
import os
import sys
from pathlib import Path

import yaml
from flask import Flask, jsonify, send_from_directory

app = Flask(__name__, static_folder='static')

# Configuration
DEFAULT_PORT = 5050
MAX_PORT_TRIES = 10
WATCH_FILES = ['build-state.yaml', 'tasks.yaml']

# Global state
office_dir = None
connected_clients = set()


def find_office_dir():
    """Find docs/office directory from current working directory."""
    cwd = Path.cwd()
    office_path = cwd / 'docs' / 'office'
    if office_path.exists():
        return office_path
    # Try parent directories
    for parent in cwd.parents:
        office_path = parent / 'docs' / 'office'
        if office_path.exists():
            return office_path
    return None


def load_state():
    """Load and merge tasks.yaml and build-state.yaml."""
    if not office_dir:
        return {'error': 'No docs/office directory found'}

    tasks_file = office_dir / 'tasks.yaml'
    state_file = office_dir / 'build-state.yaml'

    data = {
        'tasks': None,
        'build_state': None,
        'merged': []
    }

    # Load tasks.yaml
    if tasks_file.exists():
        try:
            with open(tasks_file) as f:
                data['tasks'] = yaml.safe_load(f)
        except Exception as e:
            data['tasks_error'] = str(e)

    # Load build-state.yaml
    if state_file.exists():
        try:
            with open(state_file) as f:
                data['build_state'] = yaml.safe_load(f)
        except Exception as e:
            data['build_state_error'] = str(e)

    # Merge data for frontend
    data['merged'] = merge_task_data(data['tasks'], data['build_state'])

    return data


def merge_task_data(tasks_yaml, build_state):
    """Merge static task definitions with live build state."""
    if not tasks_yaml or not build_state:
        return []

    features = tasks_yaml.get('features', [])
    state_features = {f['id']: f for f in build_state.get('features', [])}

    merged = []
    for feature in features:
        feature_id = feature['id']
        feature_state = state_features.get(feature_id, {})

        state_tasks = {t['id']: t for t in feature_state.get('tasks', [])}

        merged_tasks = []
        for task in feature.get('tasks', []):
            task_id = task['id']
            task_state = state_tasks.get(task_id, {})
            merged_tasks.append({
                **task,
                'status': task_state.get('status', 'queued'),
                'agent': task_state.get('agent'),
                'started_at': task_state.get('started_at'),
                'status_changed_at': task_state.get('status_changed_at'),
                'retry_count': task_state.get('retry_count', 0),
                'error': task_state.get('error'),
                'current_step': task_state.get('current_step'),
            })

        merged.append({
            'id': feature_id,
            'name': feature.get('name', feature_id),
            'branch': feature.get('branch'),
            'depends_on': feature.get('depends_on', []),
            'status': feature_state.get('status', 'pending'),
            'started_at': feature_state.get('started_at'),
            'completed_at': feature_state.get('completed_at'),
            'tasks': merged_tasks,
        })

    return merged


@app.route('/')
def index():
    """Serve the dashboard HTML."""
    return send_from_directory(app.static_folder, 'index.html')


@app.route('/api/state')
def api_state():
    """Return current build state as JSON."""
    return jsonify(load_state())


@app.route('/health')
def health():
    """Health check endpoint."""
    return jsonify({'status': 'ok', 'office_dir': str(office_dir)})


def find_available_port(start_port):
    """Find an available port starting from start_port."""
    import socket
    for port in range(start_port, start_port + MAX_PORT_TRIES):
        try:
            with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
                s.bind(('127.0.0.1', port))
                return port
        except OSError:
            continue
    return None


def main():
    global office_dir

    parser = argparse.ArgumentParser(description='Office Dashboard Server')
    parser.add_argument('--port', type=int, default=DEFAULT_PORT, help='Port to run on')
    parser.add_argument('--office-dir', type=str, help='Path to docs/office directory')
    args = parser.parse_args()

    # Set office directory
    if args.office_dir:
        office_dir = Path(args.office_dir)
    else:
        office_dir = find_office_dir()

    if not office_dir or not office_dir.exists():
        print(f"Error: Could not find docs/office directory", file=sys.stderr)
        print("Run from project root or specify --office-dir", file=sys.stderr)
        sys.exit(1)

    print(f"Watching: {office_dir}")

    # Find available port
    port = find_available_port(args.port)
    if not port:
        print(f"Error: No available ports in range {args.port}-{args.port + MAX_PORT_TRIES}", file=sys.stderr)
        sys.exit(1)

    print(f"Dashboard running at http://localhost:{port}")
    app.run(host='127.0.0.1', port=port, debug=False)


if __name__ == '__main__':
    main()
```

**Step 2: Verify file exists**

```bash
head -20 dashboard/server.py
```

Expected: Shows shebang and docstring

**Step 3: Commit**

```bash
git add dashboard/server.py
git commit -m "feat(dashboard): add Flask server skeleton

REST endpoints for state loading and static file serving"
```

---

## Task 4: Add File Watcher

**Files:**
- Modify: `dashboard/server.py`

**Step 1: Add watchdog imports and handler class**

After the existing imports (around line 8), add:

```python
import threading
import time
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler
```

**Step 2: Add FileChangeHandler class**

After the `connected_clients = set()` line (around line 20), add:

```python
class FileChangeHandler(FileSystemEventHandler):
    """Handle file changes and notify connected clients."""

    def __init__(self, callback):
        self.callback = callback
        self._last_modified = {}
        self._debounce_seconds = 0.5

    def on_modified(self, event):
        if event.is_directory:
            return

        filename = os.path.basename(event.src_path)
        if filename not in WATCH_FILES:
            return

        # Debounce rapid changes
        now = time.time()
        last = self._last_modified.get(event.src_path, 0)
        if now - last < self._debounce_seconds:
            return
        self._last_modified[event.src_path] = now

        print(f"File changed: {filename}")
        self.callback()


# File watcher
observer = None


def start_file_watcher(callback):
    """Start watching office directory for changes."""
    global observer
    if not office_dir:
        return

    handler = FileChangeHandler(callback)
    observer = Observer()
    observer.schedule(handler, str(office_dir), recursive=False)
    observer.start()
    print(f"Watching for changes in {office_dir}")


def stop_file_watcher():
    """Stop the file watcher."""
    global observer
    if observer:
        observer.stop()
        observer.join()
```

**Step 3: Verify changes**

```bash
grep "FileChangeHandler" dashboard/server.py
```

Expected: Shows the class definition

**Step 4: Commit**

```bash
git add dashboard/server.py
git commit -m "feat(dashboard): add file watcher with debouncing

Watches build-state.yaml and tasks.yaml for changes"
```

---

## Task 5: Add WebSocket Support

**Files:**
- Modify: `dashboard/server.py`

**Step 1: Add flask-sock import**

After `from flask import Flask, jsonify, send_from_directory`, add:

```python
from flask_sock import Sock
```

**Step 2: Initialize Sock after app creation**

After `app = Flask(__name__, static_folder='static')`, add:

```python
sock = Sock(app)
```

**Step 3: Add WebSocket endpoint and broadcast function**

Before the `@app.route('/')` line, add:

```python
def broadcast_state():
    """Send current state to all connected WebSocket clients."""
    if not connected_clients:
        return

    state = load_state()
    message = json.dumps({'type': 'state_update', 'data': state})

    dead_clients = set()
    for client in connected_clients:
        try:
            client.send(message)
        except Exception:
            dead_clients.add(client)

    connected_clients.difference_update(dead_clients)


@sock.route('/ws')
def websocket(ws):
    """WebSocket endpoint for real-time updates."""
    connected_clients.add(ws)
    print(f"Client connected. Total: {len(connected_clients)}")

    # Send initial state
    try:
        state = load_state()
        ws.send(json.dumps({'type': 'initial_state', 'data': state}))
    except Exception as e:
        print(f"Error sending initial state: {e}")

    # Keep connection alive and handle messages
    try:
        while True:
            message = ws.receive(timeout=30)
            if message is None:
                continue
            # Handle ping/pong for keepalive
            if message == 'ping':
                ws.send('pong')
    except Exception:
        pass
    finally:
        connected_clients.discard(ws)
        print(f"Client disconnected. Total: {len(connected_clients)}")
```

**Step 4: Update main() to start file watcher with broadcast callback**

In the `main()` function, before `print(f"Dashboard running at http://localhost:{port}")`, add:

```python
    # Start file watcher
    start_file_watcher(broadcast_state)
```

And at the end of main(), before `app.run(...)`, add signal handling:

```python
    import signal
    def shutdown(sig, frame):
        print("\nShutting down...")
        stop_file_watcher()
        sys.exit(0)

    signal.signal(signal.SIGINT, shutdown)
    signal.signal(signal.SIGTERM, shutdown)
```

**Step 5: Verify WebSocket endpoint**

```bash
grep "@sock.route" dashboard/server.py
```

Expected: Shows `/ws` route

**Step 6: Commit**

```bash
git add dashboard/server.py
git commit -m "feat(dashboard): add WebSocket broadcast on file changes

Real-time updates pushed to all connected clients"
```

---

## Task 6: Create HTML Structure

**Files:**
- Create: `dashboard/static/index.html`

**Step 1: Create static directory**

```bash
mkdir -p dashboard/static
```

**Step 2: Write HTML file**

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Office Dashboard</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link rel="stylesheet" href="style.css">
</head>
<body class="bg-gray-900 text-gray-100 min-h-screen">
    <!-- Header -->
    <header class="bg-gray-800 border-b border-gray-700 px-6 py-4">
        <div class="flex items-center justify-between">
            <div class="flex items-center gap-6">
                <h1 class="text-xl font-semibold">Office Dashboard</h1>

                <!-- View Toggle -->
                <div class="flex bg-gray-700 rounded-lg p-1">
                    <button id="btn-feature-view" class="view-toggle active px-4 py-1.5 rounded-md text-sm font-medium transition-colors">
                        By Feature
                    </button>
                    <button id="btn-agent-view" class="view-toggle px-4 py-1.5 rounded-md text-sm font-medium transition-colors">
                        By Agent
                    </button>
                </div>
            </div>

            <div class="flex items-center gap-6">
                <!-- Progress -->
                <div id="progress" class="text-sm text-gray-400">
                    <span id="progress-text">Loading...</span>
                </div>

                <!-- Build Time -->
                <div id="build-time" class="text-sm text-gray-400">
                    <span id="elapsed-time"></span>
                </div>

                <!-- Connection Status -->
                <div id="connection-status" class="flex items-center gap-2">
                    <span id="status-indicator" class="w-2 h-2 rounded-full bg-yellow-500"></span>
                    <span id="status-text" class="text-sm">Connecting...</span>
                </div>
            </div>
        </div>
    </header>

    <!-- Main Content -->
    <main class="p-6">
        <!-- Empty State -->
        <div id="empty-state" class="hidden flex flex-col items-center justify-center py-20 text-gray-500">
            <svg class="w-16 h-16 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path>
            </svg>
            <p class="text-lg">No active build</p>
            <p class="text-sm mt-2">Run /build to start</p>
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

    <!-- Reconnecting Overlay -->
    <div id="reconnect-overlay" class="hidden fixed inset-0 bg-gray-900/80 flex items-center justify-center z-50">
        <div class="bg-gray-800 rounded-lg p-6 text-center">
            <div class="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
            <p class="text-gray-300">Reconnecting...</p>
            <p id="reconnect-attempt" class="text-sm text-gray-500 mt-2"></p>
        </div>
    </div>

    <script src="app.js"></script>
</body>
</html>
```

**Step 3: Verify file exists**

```bash
head -10 dashboard/static/index.html
```

Expected: Shows DOCTYPE and html tag

**Step 4: Commit**

```bash
git add dashboard/static/index.html
git commit -m "feat(dashboard): add HTML structure

Header with view toggle, progress, connection status
Main area for feature/agent views"
```

---

## Task 7: Create CSS Styles

**Files:**
- Create: `dashboard/static/style.css`

**Step 1: Write CSS file**

```css
/* View Toggle */
.view-toggle {
    color: #9ca3af;
}

.view-toggle:hover {
    color: #e5e7eb;
}

.view-toggle.active {
    background-color: #3b82f6;
    color: white;
}

/* Task Cards */
.task-card {
    @apply bg-gray-800 rounded-lg p-4 border-l-4 transition-all;
}

.task-card.status-queued {
    @apply border-gray-500;
}

.task-card.status-assigned {
    @apply border-blue-400;
}

.task-card.status-in_progress {
    @apply border-yellow-400;
}

.task-card.status-review {
    @apply border-purple-400;
}

.task-card.status-done,
.task-card.status-completed {
    @apply border-green-500;
}

.task-card.status-failed {
    @apply border-red-500;
}

/* Stuck Animation */
.task-card.stuck {
    animation: pulse-border 2s infinite;
}

@keyframes pulse-border {
    0%, 100% {
        box-shadow: 0 0 0 0 rgba(234, 179, 8, 0.4);
    }
    50% {
        box-shadow: 0 0 0 4px rgba(234, 179, 8, 0.2);
    }
}

/* Feature Lane */
.feature-lane {
    @apply bg-gray-800/50 rounded-lg p-4;
}

.feature-lane-header {
    @apply flex items-center justify-between mb-4 pb-3 border-b border-gray-700;
}

/* Status Columns */
.status-column {
    @apply flex-1 min-w-0;
}

.status-column-header {
    @apply text-xs font-medium text-gray-500 uppercase tracking-wider mb-3 px-2;
}

/* Agent Column */
.agent-column {
    @apply bg-gray-800/50 rounded-lg p-4;
}

.agent-column-header {
    @apply text-sm font-medium text-gray-300 mb-4 pb-2 border-b border-gray-700;
}

.agent-idle {
    @apply text-gray-500 text-sm italic py-4 text-center;
}

/* Mini Card (for done tasks in agent view) */
.task-card-mini {
    @apply bg-gray-700/50 rounded px-3 py-2 text-sm;
}

/* Retry Badge */
.retry-badge {
    @apply text-xs px-2 py-0.5 rounded-full;
}

.retry-badge.warning {
    @apply bg-yellow-500/20 text-yellow-400;
}

.retry-badge.danger {
    @apply bg-red-500/20 text-red-400;
}

/* Dependency Links */
.dep-link {
    @apply text-xs text-gray-500;
}

.dep-link:hover {
    @apply text-gray-300;
}

/* Scrollable areas */
.tasks-scroll {
    @apply flex gap-2 overflow-x-auto pb-2;
}

/* Tooltip */
.tooltip {
    @apply invisible opacity-0 absolute z-10 bg-gray-700 text-gray-200 text-xs rounded px-2 py-1 -top-8 left-1/2 -translate-x-1/2 transition-all whitespace-nowrap;
}

.has-tooltip:hover .tooltip {
    @apply visible opacity-100;
}

/* Error expandable */
.error-message {
    @apply mt-2 text-xs text-red-400 bg-red-500/10 rounded p-2 hidden;
}

.error-message.expanded {
    @apply block;
}
```

**Step 2: Verify file exists**

```bash
head -20 dashboard/static/style.css
```

Expected: Shows view toggle styles

**Step 3: Commit**

```bash
git add dashboard/static/style.css
git commit -m "feat(dashboard): add Tailwind-based styles

Task card states, stuck animation, feature lanes, agent columns"
```

---

## Task 8: Create JavaScript - State Management

**Files:**
- Create: `dashboard/static/app.js`

**Step 1: Write state management and WebSocket client**

```javascript
/**
 * Office Dashboard - Real-time build progress visualization
 */

// State
let state = {
    features: [],
    buildState: null,
    tasks: null,
    connected: false,
    currentView: 'feature', // 'feature' or 'agent'
    stuckThreshold: 30 * 60 * 1000, // 30 minutes in ms
};

// WebSocket
let ws = null;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 10;
const RECONNECT_BASE_DELAY = 1000;

// DOM Elements
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

// Initialize
function init() {
    // Parse URL params
    const params = new URLSearchParams(window.location.search);
    if (params.has('stuck_threshold')) {
        state.stuckThreshold = parseInt(params.get('stuck_threshold')) * 60 * 1000;
    }

    // Set up view toggle
    elements.btnFeatureView.addEventListener('click', () => setView('feature'));
    elements.btnAgentView.addEventListener('click', () => setView('agent'));

    // Connect WebSocket
    connect();

    // Update elapsed time every second
    setInterval(updateElapsedTime, 1000);
}

// WebSocket Connection
function connect() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;

    try {
        ws = new WebSocket(wsUrl);

        ws.onopen = () => {
            console.log('WebSocket connected');
            state.connected = true;
            reconnectAttempts = 0;
            updateConnectionStatus('connected');
            hideReconnectOverlay();
        };

        ws.onmessage = (event) => {
            try {
                const message = JSON.parse(event.data);
                handleMessage(message);
            } catch (e) {
                console.error('Failed to parse message:', e);
            }
        };

        ws.onclose = () => {
            console.log('WebSocket disconnected');
            state.connected = false;
            updateConnectionStatus('disconnected');
            scheduleReconnect();
        };

        ws.onerror = (error) => {
            console.error('WebSocket error:', error);
        };

        // Keepalive ping
        setInterval(() => {
            if (ws && ws.readyState === WebSocket.OPEN) {
                ws.send('ping');
            }
        }, 25000);

    } catch (e) {
        console.error('Failed to connect:', e);
        scheduleReconnect();
    }
}

function scheduleReconnect() {
    if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
        updateConnectionStatus('failed');
        return;
    }

    reconnectAttempts++;
    const delay = RECONNECT_BASE_DELAY * Math.pow(2, reconnectAttempts - 1);

    showReconnectOverlay();
    elements.reconnectAttempt.textContent = `Attempt ${reconnectAttempts} of ${MAX_RECONNECT_ATTEMPTS}`;

    setTimeout(connect, delay);
}

function handleMessage(message) {
    switch (message.type) {
        case 'initial_state':
        case 'state_update':
            updateState(message.data);
            break;
        default:
            console.log('Unknown message type:', message.type);
    }
}

function updateState(data) {
    state.features = data.merged || [];
    state.buildState = data.build_state;
    state.tasks = data.tasks;

    render();
}

// View Management
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

// Connection Status
function updateConnectionStatus(status) {
    const indicator = elements.statusIndicator;
    const text = elements.statusText;

    switch (status) {
        case 'connected':
            indicator.className = 'w-2 h-2 rounded-full bg-green-500';
            text.textContent = 'Connected';
            break;
        case 'disconnected':
            indicator.className = 'w-2 h-2 rounded-full bg-yellow-500';
            text.textContent = 'Reconnecting...';
            break;
        case 'failed':
            indicator.className = 'w-2 h-2 rounded-full bg-red-500';
            text.textContent = 'Disconnected';
            break;
    }
}

function showReconnectOverlay() {
    elements.reconnectOverlay.classList.remove('hidden');
}

function hideReconnectOverlay() {
    elements.reconnectOverlay.classList.add('hidden');
}

// Progress and Time
function updateProgress() {
    if (!state.features.length) {
        elements.progressText.textContent = 'No tasks';
        return;
    }

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
    elements.progressText.textContent = `${completed}/${total} tasks (${percent}%)`;
}

function updateElapsedTime() {
    if (!state.buildState?.build?.started_at) {
        elements.elapsedTime.textContent = '';
        return;
    }

    const started = new Date(state.buildState.build.started_at);
    const now = new Date();
    const elapsed = now - started;

    const hours = Math.floor(elapsed / 3600000);
    const minutes = Math.floor((elapsed % 3600000) / 60000);
    const seconds = Math.floor((elapsed % 60000) / 1000);

    let timeStr = '';
    if (hours > 0) timeStr += `${hours}h `;
    if (minutes > 0 || hours > 0) timeStr += `${minutes}m `;
    timeStr += `${seconds}s`;

    elements.elapsedTime.textContent = timeStr;
}

// Utility
function isTaskStuck(task) {
    if (!task.status_changed_at) return false;
    if (task.status === 'done' || task.status === 'completed' || task.status === 'queued') return false;

    const changed = new Date(task.status_changed_at);
    const now = new Date();
    return (now - changed) > state.stuckThreshold;
}

function formatTimeInState(task) {
    if (!task.status_changed_at) return '';

    const changed = new Date(task.status_changed_at);
    const now = new Date();
    const elapsed = now - changed;

    const minutes = Math.floor(elapsed / 60000);
    if (minutes < 60) return `${minutes}m`;

    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}h ${remainingMinutes}m`;
}

// Main Render
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

// Start the app
document.addEventListener('DOMContentLoaded', init);
```

**Step 2: Verify file exists**

```bash
head -30 dashboard/static/app.js
```

Expected: Shows state object and WebSocket code

**Step 3: Commit**

```bash
git add dashboard/static/app.js
git commit -m "feat(dashboard): add WebSocket client and state management

Auto-reconnect with exponential backoff, progress tracking"
```

---

## Task 9: Add Feature View Rendering

**Files:**
- Modify: `dashboard/static/app.js`

**Step 1: Add renderFeatureView function**

At the end of the file, before the `document.addEventListener` line, add:

```javascript
// Feature View Rendering
function renderFeatureView() {
    const container = elements.featureView;
    container.innerHTML = '';

    const statuses = ['queued', 'assigned', 'in_progress', 'review', 'done', 'completed', 'failed'];

    state.features.forEach(feature => {
        const lane = document.createElement('div');
        lane.className = 'feature-lane';

        // Count tasks by status
        const taskCounts = {};
        statuses.forEach(s => taskCounts[s] = 0);
        feature.tasks.forEach(t => {
            const status = t.status || 'queued';
            taskCounts[status] = (taskCounts[status] || 0) + 1;
        });

        const doneCount = (taskCounts.done || 0) + (taskCounts.completed || 0);
        const totalCount = feature.tasks.length;

        // Header
        lane.innerHTML = `
            <div class="feature-lane-header">
                <div class="flex items-center gap-3">
                    <span class="text-sm font-medium">${escapeHtml(feature.name)}</span>
                    <span class="text-xs px-2 py-0.5 rounded-full bg-gray-700 text-gray-400">${feature.id}</span>
                    ${feature.status === 'in_progress' ? '<span class="text-xs text-yellow-400">In Progress</span>' : ''}
                    ${feature.status === 'completed' ? '<span class="text-xs text-green-400">Completed</span>' : ''}
                </div>
                <span class="text-sm text-gray-500">${doneCount}/${totalCount} done</span>
            </div>
            <div class="grid grid-cols-5 gap-4">
                ${renderStatusColumn('Queued', feature.tasks.filter(t => t.status === 'queued' || !t.status))}
                ${renderStatusColumn('Active', feature.tasks.filter(t => t.status === 'assigned' || t.status === 'in_progress'))}
                ${renderStatusColumn('Review', feature.tasks.filter(t => t.status === 'review'))}
                ${renderStatusColumn('Done', feature.tasks.filter(t => t.status === 'done' || t.status === 'completed'))}
                ${renderStatusColumn('Failed', feature.tasks.filter(t => t.status === 'failed'))}
            </div>
        `;

        container.appendChild(lane);
    });
}

function renderStatusColumn(title, tasks) {
    const tasksHtml = tasks.length > 0
        ? tasks.map(t => renderTaskCard(t)).join('')
        : '<div class="text-xs text-gray-600 italic px-2">No tasks</div>';

    return `
        <div class="status-column">
            <div class="status-column-header">${title} (${tasks.length})</div>
            <div class="space-y-2">
                ${tasksHtml}
            </div>
        </div>
    `;
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
```

**Step 2: Verify function exists**

```bash
grep "renderFeatureView" dashboard/static/app.js
```

Expected: Shows function definition

**Step 3: Commit**

```bash
git add dashboard/static/app.js
git commit -m "feat(dashboard): add feature view with swim lanes

Status columns: Queued, Active, Review, Done, Failed"
```

---

## Task 10: Add Agent View Rendering

**Files:**
- Modify: `dashboard/static/app.js`

**Step 1: Add renderAgentView function**

After the `renderStatusColumn` function, add:

```javascript
// Agent View Rendering
function renderAgentView() {
    const container = elements.agentView;
    container.innerHTML = '';

    // Collect all agents
    const agents = [
        'backend-engineer',
        'frontend-engineer',
        'ui-ux-expert',
        'data-engineer',
        'automation-developer',
        'devops'
    ];

    // Group tasks by agent
    const tasksByAgent = {};
    agents.forEach(a => tasksByAgent[a] = { active: [], done: [] });

    state.features.forEach(feature => {
        feature.tasks.forEach(task => {
            const agent = task.agent;
            if (agent && tasksByAgent[agent]) {
                if (task.status === 'done' || task.status === 'completed') {
                    tasksByAgent[agent].done.push({ ...task, feature: feature.name });
                } else if (task.status !== 'queued') {
                    tasksByAgent[agent].active.push({ ...task, feature: feature.name });
                }
            }
        });
    });

    // Render columns
    agents.forEach(agent => {
        const data = tasksByAgent[agent];
        const column = document.createElement('div');
        column.className = 'agent-column';

        const displayName = agent.replace('-', ' ').replace(/\b\w/g, c => c.toUpperCase());

        column.innerHTML = `
            <div class="agent-column-header">
                <div class="font-medium">${displayName}</div>
            </div>
            <div class="space-y-4">
                <div>
                    <div class="text-xs text-gray-500 uppercase tracking-wider mb-2">Active</div>
                    ${data.active.length > 0
                        ? data.active.map(t => renderTaskCard(t, true)).join('')
                        : '<div class="agent-idle">Idle</div>'
                    }
                </div>
                <div>
                    <div class="text-xs text-gray-500 uppercase tracking-wider mb-2">Done (${data.done.length})</div>
                    <div class="space-y-1">
                        ${data.done.slice(0, 5).map(t => renderTaskCardMini(t)).join('')}
                        ${data.done.length > 5 ? `<div class="text-xs text-gray-500 px-2">+${data.done.length - 5} more</div>` : ''}
                    </div>
                </div>
            </div>
        `;

        container.appendChild(column);
    });
}

function renderTaskCardMini(task) {
    return `
        <div class="task-card-mini">
            <div class="truncate">${escapeHtml(task.title)}</div>
            <div class="text-xs text-gray-500">${escapeHtml(task.feature)}</div>
        </div>
    `;
}
```

**Step 2: Verify function exists**

```bash
grep "renderAgentView" dashboard/static/app.js
```

Expected: Shows function definition

**Step 3: Commit**

```bash
git add dashboard/static/app.js
git commit -m "feat(dashboard): add agent view with columns

Shows active task and done count per agent"
```

---

## Task 11: Add Task Card Rendering

**Files:**
- Modify: `dashboard/static/app.js`

**Step 1: Add renderTaskCard function**

After `renderTaskCardMini`, add:

```javascript
// Task Card Rendering
function renderTaskCard(task, showFeature = false) {
    const stuck = isTaskStuck(task);
    const stuckClass = stuck ? 'stuck' : '';
    const timeInState = formatTimeInState(task);

    // Retry badge
    let retryBadge = '';
    if (task.retry_count > 0) {
        const badgeClass = task.retry_count > 2 ? 'danger' : 'warning';
        retryBadge = `<span class="retry-badge ${badgeClass}">Retry: ${task.retry_count}</span>`;
    }

    // Dependencies
    let depsHtml = '';
    if (task.depends_on && task.depends_on.length > 0) {
        const blockedBy = task.depends_on.filter(depId => {
            // Find if dependency is not done
            for (const f of state.features) {
                const depTask = f.tasks.find(t => t.id === depId);
                if (depTask && depTask.status !== 'done' && depTask.status !== 'completed') {
                    return true;
                }
            }
            return false;
        });

        if (blockedBy.length > 0) {
            depsHtml = `<div class="dep-link mt-2">Blocked by: ${blockedBy.join(', ')}</div>`;
        }
    }

    // Find tasks blocking this one
    const blocking = [];
    state.features.forEach(f => {
        f.tasks.forEach(t => {
            if (t.depends_on && t.depends_on.includes(task.id)) {
                if (t.status !== 'done' && t.status !== 'completed') {
                    blocking.push(t.id);
                }
            }
        });
    });

    if (blocking.length > 0) {
        depsHtml += `<div class="dep-link">Blocking: ${blocking.join(', ')}</div>`;
    }

    // Error message
    let errorHtml = '';
    if (task.error) {
        const errorId = `error-${task.id}`;
        errorHtml = `
            <button class="text-xs text-red-400 hover:text-red-300 mt-2" onclick="toggleError('${errorId}')">
                Show error
            </button>
            <div id="${errorId}" class="error-message">${escapeHtml(task.error)}</div>
        `;
    }

    // Feature tag (for agent view)
    const featureTag = showFeature && task.feature
        ? `<span class="text-xs px-2 py-0.5 rounded bg-gray-700 text-gray-400">${escapeHtml(task.feature)}</span>`
        : '';

    // Current step
    let stepInfo = '';
    if (task.current_step && task.status === 'in_progress') {
        stepInfo = `<div class="text-xs text-gray-500 mt-1">Step ${task.current_step}/5</div>`;
    }

    return `
        <div class="task-card status-${task.status || 'queued'} ${stuckClass}">
            <div class="flex items-start justify-between gap-2">
                <div class="flex-1 min-w-0">
                    ${featureTag}
                    <div class="font-medium text-sm mt-1">${escapeHtml(task.id)}</div>
                    <div class="text-sm text-gray-300 mt-0.5">${escapeHtml(task.title)}</div>
                </div>
                ${retryBadge}
            </div>

            <div class="flex items-center justify-between mt-3 text-xs text-gray-500">
                <div class="flex items-center gap-2">
                    ${task.agent ? `<span>Agent: ${task.agent}</span>` : ''}
                </div>
                ${timeInState ? `<span class="has-tooltip relative">
                    ${timeInState} in state
                    ${stuck ? '<span class="tooltip">Task may be stuck</span>' : ''}
                </span>` : ''}
            </div>

            ${stepInfo}
            ${depsHtml}
            ${errorHtml}
        </div>
    `;
}

function toggleError(id) {
    const el = document.getElementById(id);
    if (el) {
        el.classList.toggle('expanded');
    }
}
```

**Step 2: Verify function exists**

```bash
grep "renderTaskCard" dashboard/static/app.js | head -3
```

Expected: Shows function definitions

**Step 3: Commit**

```bash
git add dashboard/static/app.js
git commit -m "feat(dashboard): add task card with all info

Shows status, agent, time in state, retries, dependencies, errors"
```

---

## Task 12: Update Agent Organizer for Timestamps

**Files:**
- Modify: `agents/agent-organizer.md`

**Step 1: Read current file**

```bash
cat agents/agent-organizer.md
```

**Step 2: Add timestamp requirements to build coordination**

In the "Build Coordination" section, after "**Main loop:**", update to include timestamp tracking:

Find the line:
```markdown
- Track feature status (pending, in_progress, completed, failed)
```

And update the entire Main loop section to:

```markdown
**Main loop:**
- Track feature status (pending, in_progress, completed, failed)
- Spawn workspace:prepare for ready features
- Dispatch tasks to domain-matched agents
- Monitor step-level progress
- **Track timestamps:** When updating build-state.yaml:
  - Set `started_at` when task first assigned
  - Set `status_changed_at` on every status change
  - Use ISO 8601 format: `2026-01-13T22:15:00Z`
- Handle failures (retry with context, escalate after limit)
- Apply completion policy when feature done
- Trigger workspace:cleanup after merge/PR
```

**Step 3: Verify changes**

```bash
grep "status_changed_at" agents/agent-organizer.md
```

Expected: Shows timestamp reference

**Step 4: Commit**

```bash
git add agents/agent-organizer.md
git commit -m "feat(agent-organizer): add timestamp tracking to build-state

Track started_at and status_changed_at for dashboard time-in-state"
```

---

## Task 13: Create Dashboard Skill

**Files:**
- Create: `skills/dashboard/SKILL.md`

**Step 1: Create skill directory**

```bash
mkdir -p skills/dashboard
```

**Step 2: Write skill file**

```markdown
---
name: dashboard
description: "Start the Office Dashboard to visualize /build progress in real-time"
---

# /office:dashboard - Build Progress Dashboard

## Overview

Starts a local web dashboard that visualizes `/build` progress in real-time. The dashboard watches `build-state.yaml` and updates automatically via WebSocket.

## Usage

```
/office:dashboard              # Start dashboard on port 5050
/office:dashboard stop         # Stop running dashboard
/office:dashboard --port 8080  # Start on custom port
```

## Process

### Starting the Dashboard

1. **Check Python 3**
   ```bash
   python3 --version
   ```
   If not found, display error with install instructions.

2. **Run Setup (first time)**
   ```bash
   cd dashboard
   ./setup.sh
   ```
   Creates virtual environment and installs dependencies.

3. **Start Server**
   ```bash
   cd dashboard
   source .venv/bin/activate
   python server.py --port ${PORT:-5050}
   ```

4. **Report URL**
   ```
   Dashboard running at http://localhost:5050
   Open in browser to view build progress.
   ```

### Stopping the Dashboard

Find and kill the server process:
```bash
pkill -f "python.*server.py"
```

Or use Ctrl+C in the terminal running the server.

## Features

- **Real-time updates:** WebSocket pushes changes as build-state.yaml updates
- **Two views:** Toggle between Feature (swim lanes) and Agent (columns)
- **Task cards show:** ID, title, status, agent, time in state, retries, dependencies
- **Stuck detection:** Tasks in same state > 30 min get highlighted
- **Auto-reconnect:** Handles connection drops gracefully

## Configuration

**URL parameters:**
- `?stuck_threshold=15` - Set stuck threshold in minutes (default: 30)

**Server arguments:**
- `--port PORT` - Specify port (default: 5050, tries up to 5059 if busy)
- `--office-dir PATH` - Specify docs/office directory path

## Requirements

- Python 3.8+
- Network port available (5050-5059 range)
- Active `/build` session for live data (or historical build-state.yaml)

## Files

```
dashboard/
├── server.py          # Flask server with file watcher
├── requirements.txt   # Python dependencies
├── setup.sh          # Venv setup script
└── static/
    ├── index.html    # Dashboard UI
    ├── style.css     # Tailwind styles
    └── app.js        # Frontend logic
```
```

**Step 3: Verify file exists**

```bash
head -10 skills/dashboard/SKILL.md
```

Expected: Shows frontmatter with name: dashboard

**Step 4: Commit**

```bash
git add skills/dashboard/SKILL.md
git commit -m "feat: add /office:dashboard skill

Manual start/stop for build progress visualization"
```

---

## Task 14: Update Build Skill for Auto-Start

**Files:**
- Modify: `skills/build/SKILL.md`

**Step 1: Read current file**

```bash
cat skills/build/SKILL.md
```

**Step 2: Add dashboard auto-start to startup section**

After "### 4. Initialize State" section, add new section:

```markdown
### 5. Start Dashboard (Optional)

Attempt to start the dashboard for real-time visibility:

```bash
# Check if Python available
if command -v python3 &> /dev/null; then
    # Run setup if needed
    if [ ! -d "dashboard/.venv" ]; then
        cd dashboard && ./setup.sh && cd ..
    fi

    # Start dashboard in background
    cd dashboard
    source .venv/bin/activate
    python server.py &
    DASHBOARD_PID=$!
    cd ..

    echo "Dashboard running at http://localhost:5050"
else
    echo "Note: Python not found. Dashboard unavailable."
    echo "Build will continue without real-time visualization."
fi
```

**Graceful degradation:** If dashboard fails to start, continue build without it. The dashboard is optional visibility, not a blocker.
```

**Step 3: Add dashboard shutdown to completion section**

In the "## Completion" section, after "### Summary", add:

```markdown
### Stop Dashboard

If dashboard was started:

```bash
if [ -n "$DASHBOARD_PID" ]; then
    kill $DASHBOARD_PID 2>/dev/null
    echo "Dashboard stopped."
fi
```
```

**Step 4: Verify changes**

```bash
grep -A 3 "Start Dashboard" skills/build/SKILL.md
```

Expected: Shows dashboard startup section

**Step 5: Commit**

```bash
git add skills/build/SKILL.md
git commit -m "feat(build): auto-start dashboard on /build

Optional real-time visualization, graceful degradation if Python unavailable"
```

---

## Task 15: Integration Test

**Files:**
- None (manual verification)

**Step 1: Create test data**

Create sample build state files in the worktree for testing:

```bash
mkdir -p docs/office

cat > docs/office/tasks.yaml << 'EOF'
features:
  - id: user-auth
    name: User Authentication
    branch: feature/user-auth
    depends_on: []
    tasks:
      - id: auth-1
        title: Create user model
        agent: backend-engineer
        depends_on: []
      - id: auth-2
        title: Build login API
        agent: backend-engineer
        depends_on: [auth-1]
      - id: auth-3
        title: Create login form
        agent: frontend-engineer
        depends_on: [auth-2]

  - id: dashboard
    name: Admin Dashboard
    branch: feature/dashboard
    depends_on: [user-auth]
    tasks:
      - id: dash-1
        title: Dashboard layout
        agent: frontend-engineer
        depends_on: []
      - id: dash-2
        title: Dashboard API
        agent: backend-engineer
        depends_on: []
EOF

cat > docs/office/build-state.yaml << 'EOF'
build:
  started_at: "2026-01-13T10:30:00Z"
  status: in_progress
  completion_policy: checkpoint
  retry_limit: 3

features:
  - id: user-auth
    status: in_progress
    branch: feature/user-auth
    started_at: "2026-01-13T10:30:00Z"
    tasks:
      - id: auth-1
        status: completed
        agent: backend-engineer
        started_at: "2026-01-13T10:30:00Z"
        status_changed_at: "2026-01-13T10:45:00Z"
        retry_count: 0
      - id: auth-2
        status: in_progress
        agent: backend-engineer
        started_at: "2026-01-13T10:46:00Z"
        status_changed_at: "2026-01-13T10:46:00Z"
        retry_count: 1
        current_step: 3
      - id: auth-3
        status: queued
        retry_count: 0
EOF
```

**Step 2: Run setup**

```bash
cd dashboard && ./setup.sh
```

Expected: "Setup complete" message

**Step 3: Start server**

```bash
source .venv/bin/activate
python server.py &
SERVER_PID=$!
sleep 2
```

**Step 4: Test endpoints**

```bash
curl -s http://localhost:5050/health | python3 -m json.tool
curl -s http://localhost:5050/api/state | python3 -m json.tool | head -30
```

Expected: Health shows ok, state shows merged task data

**Step 5: Open in browser**

Open http://localhost:5050 in browser. Verify:
- Header shows "Office Dashboard"
- Feature view shows User Authentication and Admin Dashboard
- Task cards display with proper status colors
- Toggle to Agent view works

**Step 6: Test live updates**

In another terminal, modify build-state.yaml:

```bash
# Change auth-2 status to completed
sed -i '' 's/status: in_progress/status: completed/' docs/office/build-state.yaml
```

Verify: Browser updates automatically without refresh

**Step 7: Cleanup**

```bash
kill $SERVER_PID
rm -rf docs/office
deactivate
```

**Step 8: Commit test data cleanup**

No commit needed - test files were temporary.

---

## Final Steps

**Step 1: Verify all commits**

```bash
git log --oneline -15
```

Expected: ~14 commits for dashboard feature

**Step 2: Push to remote (if ready)**

```bash
git push -u origin feature/dashboard
```

---

## Summary

| Task | Files | Commit Message |
|------|-------|----------------|
| 1 | dashboard/requirements.txt | feat(dashboard): add Python dependencies |
| 2 | dashboard/setup.sh | feat(dashboard): add venv setup script |
| 3 | dashboard/server.py | feat(dashboard): add Flask server skeleton |
| 4 | dashboard/server.py | feat(dashboard): add file watcher |
| 5 | dashboard/server.py | feat(dashboard): add WebSocket broadcast |
| 6 | dashboard/static/index.html | feat(dashboard): add HTML structure |
| 7 | dashboard/static/style.css | feat(dashboard): add Tailwind-based styles |
| 8 | dashboard/static/app.js | feat(dashboard): add WebSocket client |
| 9 | dashboard/static/app.js | feat(dashboard): add feature view |
| 10 | dashboard/static/app.js | feat(dashboard): add agent view |
| 11 | dashboard/static/app.js | feat(dashboard): add task card |
| 12 | agents/agent-organizer.md | feat(agent-organizer): add timestamp tracking |
| 13 | skills/dashboard/SKILL.md | feat: add /office:dashboard skill |
| 14 | skills/build/SKILL.md | feat(build): auto-start dashboard |
| 15 | - | Integration test (no commit) |
