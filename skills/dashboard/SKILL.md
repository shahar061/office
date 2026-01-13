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
