# Kopir Desktop Agent

Polling print agent for Sprint 0. Fetches paid orders from the Kopir API and prints PDFs silently.

## Setup

### macOS / Linux

```bash
cd desktop
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env        # fill SERVER_URL, AGENT_API_KEY, POINT_ID
```

### Windows (PowerShell)

```powershell
cd desktop
python -m venv .venv
Set-ExecutionPolicy RemoteSigned -Scope CurrentUser -Force   # once, if Activate.ps1 is blocked
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
copy .env.example .env
```

### Windows (cmd — no ExecutionPolicy change)

```cmd
cd desktop
python -m venv .venv
.venv\Scripts\activate.bat
pip install -r requirements.txt
copy .env.example .env
```

## Run

```bash
python -m agent.main
```

### Windows — one-click

Double-click `scripts/start-agent.bat` (or create a desktop shortcut to it).

Requires completed setup: `.venv` and filled `.env`.

## Test print (no API)

```bash
python scripts/test_print.py path/to/test.pdf
```

```bash
python scripts/test_print.py scripts/test/Баранзаев Арсалан Баярович.pdf
```

## Platform notes

### macOS / Linux

Uses `lp`. List printers:

```bash
lpstat -p -d
```

Set `PRINTER_NAME` in `.env` or leave empty for default.

### Windows

1. Download [SumatraPDF](https://www.sumatrapdfreader.org/) portable
2. Place `SumatraPDF.exe` in `desktop/bin/` or set `SUMATRA_PATH`
3. Set `PRINTER_NAME` to your printer name (or leave empty for default)
4. Run via `scripts/start-agent.bat` or activate venv and run `python -m agent.main`

List printers in PowerShell: `Get-Printer`

**Console freezes between jobs?** Windows cmd “Quick Edit Mode” pauses the agent on accidental clicks until Enter. The agent disables this automatically on startup. If it still happens, uncheck **Quick Edit Mode** in the window Properties, or run via PowerShell / a scheduled task.

Word `.docx` files are opened headlessly for page count and print; keep MS Word installed and close stuck `WINWORD.EXE` processes if jobs hang.

## Environment

| Variable | Description |
|----------|-------------|
| `SERVER_URL` | Kopir API base URL (e.g. `https://kopir-xxx.vercel.app`) |
| `AGENT_API_KEY` | Same as server `AGENT_API_KEY` |
| `POINT_ID` | Point slug, e.g. `point_dev_1` |
| `POLL_INTERVAL_SEC` | Poll interval (default `5`) |
| `PRINTER_NAME` | Optional printer name |
| `SUMATRA_PATH` | Windows only — path to SumatraPDF.exe |

## Metrics (fill after E2E)

| Parameter | Value |
|-----------|-------|
| OS | |
| Printer | |
| Avg time 1 page | |
| Avg time 10 pages | |
