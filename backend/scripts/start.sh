#!/bin/bash
# start.sh - Script to setup and run the DICE Backend on Linux

# Stop on first error
set -e

echo "=========================================="
echo "    Starting Setup for DICE Backend"
echo "=========================================="

# Check if python3 is installed
if ! command -v python3 &> /dev/null; then
    echo "Python3 is required but not installed. Please install it first."
    exit 1
fi

# Check if python3-venv is installed (Debian/Ubuntu specific)
if ! dpkg -s python3-venv &> /dev/null 2>&1; then
    echo "python3-venv might be missing. If the virtual environment creation fails,"
    echo "try running: sudo apt install python3.12-venv (or the appropriate version)"
fi

# 1. Create a virtual environment if it doesn't exist
if [ ! -d ".venv" ]; then
    echo "Creating virtual environment..."
    python3 -m venv .venv
fi

# 2. Activate virtual environment
echo "Activating virtual environment..."
source .venv/bin/activate

# 3. Upgrade pip and install requirements
echo "Installing dependencies..."
pip install --upgrade pip
if [ -f "requirements.txt" ]; then
    pip install -r requirements.txt
else
    echo "requirements.txt not found! Trying to install from pyproject.toml..."
    pip install -e .
fi

# 4. Create uploads directory if it doesn't exist
mkdir -p uploads/originals
mkdir -p uploads/watermarked
mkdir -p uploads/slips

# 5. Start the application
echo "=========================================="
echo "    Starting Uvicorn Server"
echo "=========================================="
# You can change the port or host if you want to expose it externally
# e.g., --host 0.0.0.0 --port 8000
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
