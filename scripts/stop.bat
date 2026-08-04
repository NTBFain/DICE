@echo off
title DICE Platform - Stop All
color 0C

echo.
echo ==================================================
echo        DICE Platform - Stopping All
echo ==================================================
echo.

echo Stopping processes on port 8000 (Backend)...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":8000 " ^| findstr "LISTENING"') do (
    taskkill /PID %%a /F >nul 2>&1
)
echo Backend stopped.

echo Stopping processes on port 3000 (Frontend)...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":3000 " ^| findstr "LISTENING"') do (
    taskkill /PID %%a /F >nul 2>&1
)
echo Frontend stopped.

echo.
echo All DICE services have been stopped.
echo.
pause
