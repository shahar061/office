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

1. **Find the plugin installation path**
   ```bash
   DASHBOARD_DIR=$(find ~/.claude/plugins/cache -type f -name "server.py" -path "*/office/*/dashboard/*" 2>/dev/null | sort -V | tail -1 | xargs dirname)
   echo "Dashboard found at: $DASHBOARD_DIR"
   ```
   If empty, the office plugin may not be installed.

2. **Check Python 3**
   ```bash
   python3 --version
   ```
   If not found, display error with install instructions.

3. **Run Setup (first time only)**
   ```bash
   cd "$DASHBOARD_DIR" && ./setup.sh
   ```
   Creates virtual environment and installs dependencies.

4. **Start Server**
   ```bash
   cd "$DASHBOARD_DIR" && source .venv/bin/activate && python server.py --office-dir "$(pwd)/docs/office"
   ```
   Note: `$(pwd)` should be the user's project directory, not the dashboard directory. Run this from the project root:
   ```bash
   PROJECT_DIR=$(pwd)
   cd "$DASHBOARD_DIR" && source .venv/bin/activate && python server.py --office-dir "$PROJECT_DIR/docs/office"
   ```

5. **Report URL**
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
