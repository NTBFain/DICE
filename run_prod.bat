@echo off
title DICE Platform Runner (Production Mode)
color 0A

echo ==================================================
echo        DICE Platform - Production Runner
echo ==================================================
echo Cleaning up old processes on port 3000 and 8000...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":8000 " ^| findstr "LISTENING"') do taskkill /PID %%a /F >nul 2>&1
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":3000 " ^| findstr "LISTENING"') do taskkill /PID %%a /F >nul 2>&1

echo Starting Backend (Production Mode)...
start "DICE-Backend-Prod" cmd /k "cd backend && uv run uvicorn main:app --port 8000 --workers 2"

echo Starting Frontend (Production Mode)...
start "DICE-Frontend-Prod" cmd /k "cd frontend && npm run start"

echo.
echo All production services launched!
echo Open: http://localhost:3000/th
echo.
pause
