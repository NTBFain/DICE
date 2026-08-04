@echo off
title Cloudflare Tunnel Host
echo ==========================================
echo Starting Cloudflare Tunnel (Port 3000)
echo ==========================================
echo.
"C:\Program Files (x86)\cloudflared\cloudflared.exe" tunnel --url http://localhost:3000
pause
