@echo off
start "" powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0server.ps1"
ping 127.0.0.1 -n 3 >nul
start "" "http://localhost:8088/"
