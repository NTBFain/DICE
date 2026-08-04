@echo off
title DICE Project Runner
echo ==========================================
echo Starting DICE Project (Local Development)
echo ==========================================

echo.
echo [1/2] Starting Backend (FastAPI)...
start "DICE Backend" cmd /k "cd /d %~dp0..\backend && uv run uvicorn main:app --reload --port 8000"

echo [2/2] Starting Frontend (Next.js)...
start "DICE Frontend" cmd /k "cd /d %~dp0..\frontend && (pnpm dev || npm run dev)"

echo.
echo ==========================================
echo Both servers are starting in separate windows!
echo - Backend will run on http://localhost:8000
echo - Frontend will run on http://localhost:3000
echo ==========================================
echo.
pause
