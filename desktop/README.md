# Kopir Desktop Agent

Polling print agent for Sprint 0. Fetches paid orders from the Kopir API and prints PDFs silently.

## Setup

```bash
cd desktop
python3 -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env        # fill SERVER_URL, AGENT_API_KEY, POINT_ID
```

## Run

```bash
python -m agent.main
```

## Test print (no API)

```bash
python scripts/test_print.py path/to/test.pdf
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
