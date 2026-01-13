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
