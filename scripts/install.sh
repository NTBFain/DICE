#!/bin/bash
# install.sh - Script to setup DICE Project locally

set -e

echo "=========================================="
echo "    Installing DICE Project (Local)"
echo "=========================================="
echo

echo "[1/2] Setting up Backend..."
cd backend
if [ ! -d ".venv" ]; then
    echo "Creating virtual environment..."
    python3 -m venv .venv
fi

echo "Activating virtual environment..."
source .venv/bin/activate

echo "Installing Python dependencies..."
if [ -f "requirements.txt" ]; then
    pip install -r requirements.txt
else
    echo "requirements.txt not found! Trying to run with uv..."
fi

echo "Creating upload directories..."
mkdir -p uploads/originals uploads/watermarked uploads/slips

deactivate
cd ..

echo
echo "[2/2] Setting up Frontend..."
cd frontend
echo "Installing Node modules..."
npm install
cd ..

echo
echo "=========================================="
echo "✅ Installation Complete!"
echo "   You can now run the project using start_all.sh or run.bat"
echo "=========================================="
echo
