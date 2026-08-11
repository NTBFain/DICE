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
# Start in background on 0.0.0.0:3000
npx next dev -H 0.0.0.0 -p 3000 &
FRONTEND_PID=$!
cd ..

echo "=========================================="
echo "✅ Both services are now running!"
echo "   - Backend:  http://localhost:8000"
echo "   - Frontend: http://localhost:3000/th"
echo "   - Android Browser: เปิด Chrome/Brave ไปที่ http://localhost:3000/th"
echo "   Press [CTRL+C] to stop both services."
echo "=========================================="

# Automatically try to open Android browser if termux-open-url or am is available
if command -v termux-open-url &> /dev/null; then
    termux-open-url http://localhost:3000/th 2>/dev/null || true
elif command -v am &> /dev/null; then
    am start -a android.intent.action.VIEW -d http://localhost:3000/th 2>/dev/null || true
fi

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
