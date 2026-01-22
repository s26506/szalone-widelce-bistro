@echo off
echo Uruchamianie Szalone Widelce Bistro...
cd /d "%~dp0"
start "" /B node server.js
timeout /t 2 >nul
start "" http://localhost:3000
pause
