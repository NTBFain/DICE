#!/bin/bash
# ==============================================================================
# DICE Platform Runner for Linux
# Usage:
#   ./run.sh          - Run in Development mode (default, hot-reload enabled)
#   ./run.sh dev      - Run in Development mode
#   ./run.sh prod     - Run in Production mode (optimized build)
#   ./run.sh stop     - Stop any running DICE instances
# ==============================================================================

set -e

# Colors for terminal output
CYAN='\033[0;36m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color
BOLD='\033[1m'

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$ROOT_DIR/backend"
FRONTEND_DIR="$ROOT_DIR/frontend"

# --- Function: Stop running services ---
stop_services() {
    echo -e "${YELLOW}Stopping DICE services on ports 8000 and 3000...${NC}"
    
    # Kill backend on port 8000
    if command -v fuser &> /dev/null; then
        fuser -k 8000/tcp &> /dev/null || true
        fuser -k 3000/tcp &> /dev/null || true
    fi
    
    if command -v lsof &> /dev/null; then
        local pids_8000=$(lsof -ti :8000 2>/dev/null || true)
        if [ -n "$pids_8000" ]; then
            kill -9 $pids_8000 2>/dev/null || true
        fi
        local pids_3000=$(lsof -ti :3000 2>/dev/null || true)
        if [ -n "$pids_3000" ]; then
            kill -9 $pids_3000 2>/dev/null || true
        fi
    fi
    echo -e "${GREEN}Ports 8000 and 3000 are cleared.${NC}"
}

# If command is 'stop', stop and exit
if [ "$1" = "stop" ]; then
    stop_services
    exit 0
fi

MODE="${1:-dev}"

echo -e "${CYAN}${BOLD}==================================================${NC}"
echo -e "${CYAN}${BOLD}       🎲 DICE Platform - Linux Runner            ${NC}"
echo -e "${CYAN}${BOLD}==================================================${NC}"
echo -e "Mode: ${BOLD}${MODE^^}${NC}"

# 1. Clean up old processes on ports 8000 & 3000
echo -e "\n${YELLOW}[1/4] Checking and clearing ports 8000 & 3000...${NC}"
stop_services

# 2. Check prerequisites
echo -e "\n${YELLOW}[2/4] Verifying environments...${NC}"

# Backend environment check
BACKEND_CMD=""
if command -v uv &> /dev/null; then
    BACKEND_CMD="uv run uvicorn"
elif [ -f "$BACKEND_DIR/.venv/bin/uvicorn" ]; then
    BACKEND_CMD="$BACKEND_DIR/.venv/bin/uvicorn"
elif command -v uvicorn &> /dev/null; then
    BACKEND_CMD="uvicorn"
else
    echo -e "${RED}Error: Neither 'uv' nor 'uvicorn' found. Please install backend dependencies.${NC}"
    exit 1
fi
echo -e "Backend runner: ${GREEN}${BACKEND_CMD}${NC}"

# Frontend environment check
if ! command -v node &> /dev/null || ! command -v npm &> /dev/null; then
    echo -e "${RED}Error: Node.js and npm are required. Please install them.${NC}"
    exit 1
fi
echo -e "Frontend runner: ${GREEN}Node $(node -v) / npm $(npm -v)${NC}"

# Ensure upload directories exist
mkdir -p "$BACKEND_DIR/uploads/slips" \
         "$BACKEND_DIR/uploads/originals" \
         "$BACKEND_DIR/uploads/watermarked" \
         "$BACKEND_DIR/uploads/portfolio" \
         "$BACKEND_DIR/uploads/characters" \
         "$BACKEND_DIR/uploads/auctions" \
         "$BACKEND_DIR/uploads/watermark_logos"

# 3. Start Backend
echo -e "\n${YELLOW}[3/4] Launching Backend (FastAPI on Port 8000)...${NC}"
cd "$BACKEND_DIR"
if [ "$MODE" = "prod" ]; then
    $BACKEND_CMD main:app --host 0.0.0.0 --port 8000 --workers 2 &
else
    $BACKEND_CMD main:app --host 0.0.0.0 --port 8000 --reload &
fi
BACKEND_PID=$!
cd "$ROOT_DIR"

# 4. Start Frontend
echo -e "\n${YELLOW}[4/4] Launching Frontend (Next.js on Port 3000)...${NC}"
cd "$FRONTEND_DIR"
if [ "$MODE" = "prod" ]; then
    if [ ! -d ".next" ]; then
        echo -e "${YELLOW}Building Next.js production build...${NC}"
        npm run build
    fi
    npm run start -- -H 0.0.0.0 -p 3000 &
else
    npm run dev -- -H 0.0.0.0 -p 3000 &
fi
FRONTEND_PID=$!
cd "$ROOT_DIR"

# Cleanup handler on exit or Ctrl+C
cleanup() {
    echo -e "\n${YELLOW}Shutting down DICE services...${NC}"
    kill $BACKEND_PID 2>/dev/null || true
    kill $FRONTEND_PID 2>/dev/null || true
    stop_services
    echo -e "${GREEN}All services stopped. Goodbye! 👋${NC}"
    exit 0
}

trap cleanup SIGINT SIGTERM

echo -e "\n${GREEN}${BOLD}==================================================${NC}"
echo -e "${GREEN}${BOLD}✅ DICE Platform is running!                      ${NC}"
echo -e "${GREEN}${BOLD}==================================================${NC}"
echo -e "   🌐 Frontend   : ${BOLD}http://localhost:3000/th${NC} (or /en)"
echo -e "   🚀 Backend API : ${BOLD}http://localhost:8000${NC}"
echo -e "   📖 API Docs    : ${BOLD}http://localhost:8000/docs${NC}"
echo -e "--------------------------------------------------"
echo -e "👤 Default Accounts:"
echo -e "   - Admin  : admin@example.com  / password123"
echo -e "   - Artist : artist@example.com / password123"
echo -e "   - Client : client@example.com / password123"
echo -e "--------------------------------------------------"
echo -e "${YELLOW}Press [CTRL+C] anytime to stop all servers.${NC}\n"

# Wait for background processes
wait $BACKEND_PID $FRONTEND_PID
