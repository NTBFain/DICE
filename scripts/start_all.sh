#!/bin/bash
# start_all.sh - Script to setup and run both DICE Backend and Frontend on Linux

# Stop on first error during setup
set -e

echo "=========================================="
echo "    Starting Setup for DICE Project"
echo "=========================================="

# 1. Setup and Start Backend
echo "--> Setting up Backend..."
cd backend
if [ ! -d ".venv" ]; then
    python3 -m venv .venv
fi
source .venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
mkdir -p uploads/originals uploads/watermarked uploads/slips

echo "--> Starting Backend..."
# Start in background
uvicorn main:app --host 0.0.0.0 --port 8000 --reload &
BACKEND_PID=$!
deactivate
cd ..

# 2. Setup and Start Frontend
echo "--> Setting up Frontend..."
cd frontend
npm install

echo "--> Starting Frontend (Dev mode for live updates)..."
# Start in background
npm run dev &
FRONTEND_PID=$!
cd ..

echo "=========================================="
echo "✅ Both services are now running!"
echo "   - Backend is at http://localhost:8000"
echo "   - Frontend is at http://localhost:3000"
echo "   Press [CTRL+C] to stop both services."
echo "=========================================="

# Cleanup function to kill both processes when script is stopped
cleanup() {
    echo "Stopping services..."
    kill $BACKEND_PID
    kill $FRONTEND_PID
    exit 0
}

# Trap SIGINT (Ctrl+C) and SIGTERM
trap cleanup SIGINT SIGTERM

# Wait indefinitely to keep the script alive and processes running
wait $BACKEND_PID $FRONTEND_PID
