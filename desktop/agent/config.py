import json
import os
import sys
from dataclasses import dataclass
from pathlib import Path

import requests
from dotenv import load_dotenv

load_dotenv()

CONFIG_FILE = Path(__file__).resolve().parent.parent / "config.json"


@dataclass(frozen=True)
class Config:
    server_url: str
    agent_api_key: str
    point_id: str
    poll_interval_sec: int
    printer_name: str
    sumatra_path: str
    use_word: bool
    use_separator_page: bool


def _require(name: str) -> str:
    value = os.getenv(name, "").strip()
    if not value:
        raise ValueError(f"Missing required env var: {name}")
    return value


def _parse_bool(name: str, default: bool) -> bool:
    raw = os.getenv(name)
    if raw is None:
        return default
    return raw.strip().lower() in {"1", "true", "yes", "on"}


def _load_saved_point_id() -> str | None:
    if not CONFIG_FILE.exists():
        return None
    try:
        data = json.loads(CONFIG_FILE.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return None
    value = data.get("point_id") or data.get("POINT_ID")
    if isinstance(value, str) and value.strip():
        return value.strip()
    return None


def _save_point_id(point_id: str) -> None:
    CONFIG_FILE.write_text(
        json.dumps({"point_id": point_id}, indent=2),
        encoding="utf-8",
    )


def _activate_point(server_url: str, token: str) -> str:
    url = f"{server_url.rstrip('/')}/api/agent/activate"
    try:
        response = requests.post(url, json={"token": token}, timeout=30)
        response.raise_for_status()
    except requests.HTTPError as exc:
        detail = ""
        if exc.response is not None:
            try:
                payload = exc.response.json()
                data = payload.get("data") or {}
                detail = data.get("error") or payload.get("statusMessage") or ""
            except ValueError:
                detail = exc.response.text[:500]
        raise ValueError(detail or f"Activation failed: HTTP {exc.response.status_code if exc.response else '?'}" ) from exc
    except requests.RequestException as exc:
        raise ValueError(f"Activation request failed: {exc}") from exc

    payload = response.json()
    slug = payload.get("slug") or payload.get("pointId")
    if not slug or not isinstance(slug, str):
        raise ValueError("Activation response missing point slug")
    return slug.strip()


def _resolve_point_id(server_url: str) -> str:
    from_env = os.getenv("POINT_ID", "").strip()
    if from_env:
        return from_env

    saved = _load_saved_point_id()
    if saved:
        return saved

    activation_token = os.getenv("ACTIVATION_TOKEN", "").strip()
    if activation_token:
        point_id = _activate_point(server_url, activation_token)
        _save_point_id(point_id)
        print(f"[config] Activated point: {point_id}", flush=True)
        return point_id

    raise ValueError(
        "Missing point binding. Set POINT_ID in .env, or ACTIVATION_TOKEN for first-time activation."
    )


def load_config() -> Config:
    default_use_word = sys.platform == "win32"
    server_url = _require("SERVER_URL").rstrip("/")
    return Config(
        server_url=server_url,
        agent_api_key=_require("AGENT_API_KEY"),
        point_id=_resolve_point_id(server_url),
        poll_interval_sec=int(os.getenv("POLL_INTERVAL_SEC", "5")),
        printer_name=os.getenv("PRINTER_NAME", "").strip(),
        sumatra_path=os.getenv("SUMATRA_PATH", "bin/SumatraPDF.exe").strip(),
        use_word=_parse_bool("USE_WORD", default_use_word),
        use_separator_page=_parse_bool("USE_SEPARATOR_PAGE", False),
    )
