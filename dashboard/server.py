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
