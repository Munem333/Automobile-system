$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot
$Port = 3000
$Url = "http://localhost:$Port"
$BridgeDir = Join-Path (Split-Path $PSScriptRoot -Parent) "bridge-server"

$webRunning = Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue
if (-not $webRunning) {
  Start-Process python -ArgumentList "-m", "http.server", "$Port" -WorkingDirectory $PSScriptRoot -WindowStyle Hidden
  Start-Sleep -Seconds 1
}

$bridgeRunning = Get-NetTCPConnection -LocalPort 8080 -ErrorAction SilentlyContinue
if (-not $bridgeRunning -and (Test-Path (Join-Path $BridgeDir "server.js"))) {
  Start-Process npm -ArgumentList "start" -WorkingDirectory $BridgeDir -WindowStyle Hidden
  Start-Sleep -Seconds 1
}

Start-Process "chrome" $Url
