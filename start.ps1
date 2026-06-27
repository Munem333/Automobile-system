$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
$BridgeDir = Join-Path $Root "bridge-server"
$Url = "http://localhost:3000"

function Test-PortListening($port) {
  try {
    return [bool](Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue)
  } catch {
    return $false
  }
}

Set-Location $BridgeDir

if (-not (Test-Path (Join-Path $BridgeDir "node_modules"))) {
  Write-Host "Installing bridge-server dependencies..."
  npm install
}

if (Test-PortListening 3000) {
  Write-Host "ERP POS already running on $Url"
  Start-Process $Url
  exit 0
}

Write-Host "Starting ERP POS web UI + bridge server..."
Write-Host "Keep this window open while using the POS."
Start-Process $Url
node server.js
