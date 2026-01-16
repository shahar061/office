#!/usr/bin/env python3
"""Office Dashboard - Real-time build progress visualization."""

import argparse
import json
import os
import sys
import threading
import time
from pathlib import Path

import yaml
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler
from flask import Flask, jsonify, send_from_directory
from flask_sock import Sock

app = Flask(__name__, static_folder='static')
sock = Sock(app)

# Configuration
DEFAULT_PORT = 5050
MAX_PORT_TRIES = 10
# Watch tasks.yaml for structure and build/ directory for per-phase status
WATCH_FILES = ['tasks.yaml']
WATCH_DIRS = ['build']  # Recursive watch for build/phase-*/status.yaml

# Global state
office_dir = None
connected_clients = set()


class FileChangeHandler(FileSystemEventHandler):
    """Handle file changes and notify connected clients."""

    def __init__(self, callback, office_path):
        self.callback = callback
        self.office_path = office_path
        self._last_modified = {}
        self._debounce_seconds = 0.5

    def _should_watch(self, path):
        """Check if this path should trigger an update."""
        filename = os.path.basename(path)

        # Watch specific files in office dir
        if filename in WATCH_FILES:
            return True

        # Watch files in build/ subdirectories (status.yaml, progress.log)
        rel_path = os.path.relpath(path, self.office_path)
        for watch_dir in WATCH_DIRS:
            if rel_path.startswith(watch_dir + os.sep):
                # Only watch yaml and log files in build/
                if filename.endswith('.yaml') or filename.endswith('.log'):
                    return True

        return False

    def on_modified(self, event):
        if event.is_directory:
            return

        if not self._should_watch(event.src_path):
            return

        # Debounce rapid changes
        now = time.time()
        last = self._last_modified.get(event.src_path, 0)
        if now - last < self._debounce_seconds:
            return
        self._last_modified[event.src_path] = now

        filename = os.path.basename(event.src_path)
        print(f"File changed: {filename}")
        self.callback()

    def on_created(self, event):
        """Also handle newly created files in build/ directory."""
        if event.is_directory:
            return

        if not self._should_watch(event.src_path):
            return

        filename = os.path.basename(event.src_path)
        print(f"File created: {filename}")
        self.callback()


# File watcher
observer = None


def start_file_watcher(callback):
    """Start watching office directory for changes."""
    global observer
    if not office_dir:
        return

    handler = FileChangeHandler(callback, str(office_dir))
    observer = Observer()
    # Watch recursively to catch build/phase-*/status.yaml changes
    observer.schedule(handler, str(office_dir), recursive=True)
    observer.start()
    print(f"Watching for changes in {office_dir} (recursive)")


def stop_file_watcher():
    """Stop the file watcher."""
    global observer
    if observer:
        observer.stop()
        observer.join()


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
    """Load tasks.yaml and aggregate per-phase status files from build/."""
    if not office_dir:
        return {'error': 'No docs/office directory found'}

    tasks_file = office_dir / 'tasks.yaml'
    build_dir = office_dir / 'build'

    data = {
        'tasks': None,
        'phases_state': {},
        'build_config': None,
        'merged': []
    }

    # Load tasks.yaml for structure
    if tasks_file.exists():
        try:
            with open(tasks_file) as f:
                data['tasks'] = yaml.safe_load(f)
        except Exception as e:
            data['tasks_error'] = str(e)

    # Load build config if exists
    config_file = build_dir / 'config.yaml'
    if config_file.exists():
        try:
            with open(config_file) as f:
                data['build_config'] = yaml.safe_load(f)
        except Exception as e:
            data['config_error'] = str(e)

    # Aggregate all per-phase status files
    if build_dir.exists():
        for phase_dir in build_dir.glob('phase-*'):
            status_file = phase_dir / 'status.yaml'
            if status_file.exists():
                try:
                    with open(status_file) as f:
                        phase_status = yaml.safe_load(f)
                        # Extract phase ID from directory name (phase-1 -> phase-1)
                        phase_id = phase_dir.name
                        data['phases_state'][phase_id] = phase_status
                except Exception as e:
                    print(f"Error loading {status_file}: {e}")

    # Merge data for frontend
    data['merged'] = merge_task_data(data['tasks'], data['phases_state'])

    return data


def merge_task_data(tasks_yaml, phases_state):
    """Merge static task definitions with live per-phase status files.

    Args:
        tasks_yaml: The tasks.yaml content with phase/task structure
        phases_state: Dict of phase_dir_name -> status.yaml content
                      e.g. {'phase-1': {'phase': 'phase-1', 'status': 'in_progress', 'tasks': {...}}}
    """
    if not tasks_yaml:
        return []

    # Support both 'phases' and 'features' keys for flexibility
    phases = tasks_yaml.get('phases', tasks_yaml.get('features', []))

    merged = []
    for phase in phases:
        phase_id = phase['id']
        # Look up status by directory name (phase_id is already like "phase-1")
        # Also try with "phase-" prefix for backwards compatibility
        phase_status = phases_state.get(phase_id, {})
        if not phase_status:
            phase_status = phases_state.get(f"phase-{phase_id}", {})

        # New format: tasks is a dict of task_id -> status string
        # e.g. {'setup-001': 'completed', 'setup-002': 'in_progress'}
        task_statuses = phase_status.get('tasks', {})

        merged_tasks = []
        for task in phase.get('tasks', []):
            task_id = task['id']

            # Get status from per-phase status.yaml
            # New format uses simple string status per task
            status = task_statuses.get(task_id, 'blocked')

            # Map status values for frontend compatibility
            if status == 'pending' or status == 'blocked':
                status = 'queued'
            elif status == 'ready':
                status = 'queued'  # Ready but not started yet

            # Normalize agent name: underscore to hyphen for frontend compatibility
            agent = task.get('assigned_agent', '')
            if agent:
                agent = agent.replace('_', '-')

            merged_tasks.append({
                **task,
                'status': status,
                # Map assigned_agent to agent for frontend compatibility
                'agent': agent or None,
                # Alias description to title for frontend
                'title': task.get('description', task.get('title', '')),
                # These fields may not exist in new format, but keep for compatibility
                'started_at': None,
                'status_changed_at': None,
                'retry_count': 0,
                'error': None,
                'current_step': None,
                'review_status': None,
            })

        merged.append({
            'id': phase_id,
            'name': phase.get('name', phase_id),
            'branch': phase.get('branch'),
            'depends_on': phase.get('depends_on', []),
            'status': phase_status.get('status', 'pending'),
            'started_at': phase_status.get('started_at'),
            'completed_at': None,  # Could be computed from progress.log if needed
            'tasks': merged_tasks,
        })

    return merged


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


@app.route('/')
def index():
    """Serve the dashboard HTML."""
    return send_from_directory(app.static_folder, 'index.html')


@app.route('/style.css')
def style():
    """Serve CSS file."""
    return send_from_directory(app.static_folder, 'style.css')


@app.route('/app.js')
def appjs():
    """Serve JS file."""
    return send_from_directory(app.static_folder, 'app.js')


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

    # Start file watcher
    start_file_watcher(broadcast_state)

    print(f"Dashboard running at http://localhost:{port}")

    import signal
    def shutdown(sig, frame):
        print("\nShutting down...")
        stop_file_watcher()
        sys.exit(0)

    signal.signal(signal.SIGINT, shutdown)
    signal.signal(signal.SIGTERM, shutdown)

    app.run(host='127.0.0.1', port=port, debug=False)


if __name__ == '__main__':
    main()
