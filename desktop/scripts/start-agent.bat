@echo off
cd /d "%~dp0.."
if not exist ".venv\Scripts\python.exe" (
    echo Virtual env not found. Run setup first — see desktop/README.md
    pause
    exit /b 1
)
if not exist ".env" (
    echo .env not found. Copy .env.example and fill SERVER_URL, AGENT_API_KEY, POINT_ID
    pause
    exit /b 1
)
call .venv\Scripts\activate.bat
python -m agent.main
if errorlevel 1 pause
