# AutoHub BD — start web + API dev servers
$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

Write-Host "Starting AutoHub BD..." -ForegroundColor Cyan
Write-Host "  Web: http://localhost:3001"
Write-Host "  API: http://localhost:4000"
Write-Host ""

npm run dev
