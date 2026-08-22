@echo off
REM GlassBox launcher for Windows.
REM
REM Serves this folder over http://localhost so local model runners will talk to it: opened
REM as a file:// URL the page's origin is "null", which Ollama and LM Studio both refuse.
REM
REM The port is only reused if it is actually serving THIS app. Assuming that whatever holds
REM the port is your own previous launcher opens the browser onto someone else's server.

setlocal enabledelayedexpansion
cd /d "%~dp0"

if not exist "GlassBox.html" (
  echo GlassBox.html is not next to this script. Keep both files in the same folder.
  pause & exit /b 1
)

where python >nul 2>&1 || (
  echo Python 3 is required and was not found on PATH.
  echo Install it from https://www.python.org/downloads/ ^(tick "Add python.exe to PATH"^).
  pause & exit /b 1
)

set PORT=
for %%P in (8765 8766 8767 8781 8790) do (
  if "!PORT!"=="" (
    netstat -ano | findstr /r /c:"LISTENING" | findstr ":%%P " >nul 2>&1
    if errorlevel 1 (
      set PORT=%%P
    ) else (
      echo Port %%P is already in use - trying the next one.
    )
  )
)

if "!PORT!"=="" (
  echo Every candidate port is busy: 8765 8766 8767 8781 8790
  pause & exit /b 1
)

REM Optional bridge: local MCP servers, CLI models, CORS-blocked APIs.
where node >nul 2>&1 && if exist "glassbox-bridge.mjs" (
  start "GlassBox bridge" /min cmd /c "node glassbox-bridge.mjs"
  echo Bridge starting in a separate window.
)

echo Serving this folder on port !PORT! ...
start "GlassBox server" /min cmd /c "python -m http.server !PORT! --bind 127.0.0.1"
timeout /t 2 /nobreak >nul
start "" "http://localhost:!PORT!/GlassBox.html"

echo.
echo GlassBox is open at http://localhost:!PORT!/GlassBox.html
echo Leave this window open. Closing it does NOT stop the server -
echo close the "GlassBox server" window to stop it.
echo.
pause
