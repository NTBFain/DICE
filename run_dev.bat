@echo off
title DICE Platform Runner (Dev Mode)
color 0B

echo ==================================================
echo        DICE Platform - Local Runner (DEV)
echo ==================================================
echo Cleaning up old processes on port 3000 and 8000...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":8000 " ^| findstr "LISTENING"') do taskkill /PID %%a /F >nul 2>&1
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":3000 " ^| findstr "LISTENING"') do taskkill /PID %%a /F >nul 2>&1

echo Starting Backend...
start "DICE-Backend" cmd /k "cd backend && uv run uvicorn main:app --port 8000 --reload"

echo Starting Frontend (Dev Mode)...
start "DICE-Frontend" cmd /k "cd frontend && npm run dev"

echo.
echo All services launched!
echo Open: http://localhost:3000/en
echo.
pause
