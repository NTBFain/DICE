@echo off
title DICE Platform Runner
color 0B

echo.
echo ==================================================
echo        DICE Platform - Local Runner
echo ==================================================
echo Backend  : FastAPI   - http://localhost:8000
echo Frontend : Next.js   - http://localhost:3000
echo ==================================================
echo.

:: --- Kill any existing processes on ports 8000 and 3000 ---
echo [0/3] Cleaning up old processes...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":8000 " ^| findstr "LISTENING"') do (
    taskkill /PID %%a /F >nul 2>&1
)
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":3000 " ^| findstr "LISTENING"') do (
    taskkill /PID %%a /F >nul 2>&1
)
echo Ports cleared.
echo.

:: --- Start Backend ---
echo [1/3] Starting Backend (FastAPI on port 8000)...
start "DICE-Backend" cmd /k "cd /d %~dp0..\backend && color 0A && echo Backend starting... && uv run uvicorn main:app --port 8000"
timeout /t 3 /nobreak >nul
echo Backend launched.
echo.

:: --- Build & Start Frontend ---
echo [2/3] Building Frontend (Next.js production build)...
start "DICE-Frontend" cmd /k "cd /d %~dp0..\frontend && color 0D && echo Building... && npx next build && echo Starting production server... && npx next start -p 3000"
echo Frontend build started (takes ~30s).
echo.

:: --- Done ---
echo [3/3] All services launched!
echo.
echo ==================================================
echo Both servers starting in new windows!
echo.
echo Open: http://localhost:3000/en
echo.
echo Admin : admin@example.com / password123
echo Client: client@example.com / password123
echo ==================================================
echo.
pause
