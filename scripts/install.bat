@echo off
title DICE Project Installer (Local)
echo ==========================================
echo    Installing DICE Project (Local)
echo ==========================================
echo.

echo [1/2] Setting up Backend...
cd backend
if not exist .venv (
    echo Creating virtual environment...
    python -m venv .venv
)
echo Activating virtual environment...
call .venv\Scripts\activate.bat
echo Installing Python dependencies...
if exist requirements.txt (
    pip install -r requirements.txt
) else (
    echo requirements.txt not found! Trying to run with uv...
)

echo Creating upload directories...
if not exist uploads\originals mkdir uploads\originals
if not exist uploads\watermarked mkdir uploads\watermarked
if not exist uploads\slips mkdir uploads\slips

cd ..

echo.
echo [2/2] Setting up Frontend...
cd frontend
echo Installing Node modules...
call npm install
cd ..

echo.
echo ==========================================
echo ✅ Installation Complete!
echo    You can now run the project by double-clicking 'run.bat'
echo ==========================================
echo.
pause
