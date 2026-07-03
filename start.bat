@echo off
cd /d "%~dp0"
echo Starting AutoHub BD...
echo   Web: http://localhost:3000
echo   API: http://localhost:4000
echo.
call npm run dev
