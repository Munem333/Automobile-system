@echo off
setlocal
cd /d "%~dp0bridge-server"

if not exist "node_modules\" (
  echo Installing bridge-server dependencies...
  call npm install
  if errorlevel 1 (
    echo npm install failed. Install Node.js 18+ from https://nodejs.org then run this file again.
    pause
    exit /b 1
  )
)

echo.
echo Starting ERP POS web UI + bridge server...
echo Open http://localhost:3000 in Chrome, then click Connect USB.
echo Keep this window open while using the POS.
echo.

start "" "http://localhost:3000"
node server.js

pause
