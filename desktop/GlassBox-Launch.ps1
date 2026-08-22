# GlassBox launcher (PowerShell). Run:  powershell -ExecutionPolicy Bypass -File GlassBox-Launch.ps1
Set-Location -Path $PSScriptRoot
if (-not (Test-Path 'GlassBox.html')) { Write-Host 'GlassBox.html is not next to this script.'; pause; exit 1 }
$python = Get-Command python -ErrorAction SilentlyContinue
if (-not $python) { Write-Host 'Python 3 is required. https://www.python.org/downloads/'; pause; exit 1 }

# Only reuse a port that is actually serving THIS app.
function Serves($p) {
  try { (Invoke-WebRequest "http://127.0.0.1:$p/GlassBox.html" -TimeoutSec 2 -UseBasicParsing).Content `
          -match 'GlassBox . Reasoning Studio' } catch { $false }
}
$port = $null
foreach ($p in 8765,8766,8767,8781,8790) {
  $busy = Get-NetTCPConnection -LocalPort $p -State Listen -ErrorAction SilentlyContinue
  if ($busy) { if (Serves $p) { $port = $p; break }; Write-Host "Port $p is taken - trying the next one."; continue }
  $port = $p; break
}
if (-not $port) { Write-Host 'Every candidate port is busy.'; pause; exit 1 }

if ((Get-Command node -ErrorAction SilentlyContinue) -and (Test-Path 'glassbox-bridge.mjs')) {
  Start-Process node -ArgumentList 'glassbox-bridge.mjs' -WindowStyle Minimized
}
Start-Process python -ArgumentList "-m","http.server","$port","--bind","127.0.0.1" -WindowStyle Minimized
Start-Sleep -Seconds 2
Start-Process "http://localhost:$port/GlassBox.html"
Write-Host "GlassBox is open at http://localhost:$port/GlassBox.html"
Write-Host 'Close the minimised python window to stop the server.'
pause
