import os
from dataclasses import dataclass

from dotenv import load_dotenv

load_dotenv()


@dataclass(frozen=True)
class Config:
    server_url: str
    agent_api_key: str
    point_id: str
    poll_interval_sec: int
    printer_name: str
    sumatra_path: str


def _require(name: str) -> str:
    value = os.getenv(name, "").strip()
    if not value:
        raise ValueError(f"Missing required env var: {name}")
    return value


def load_config() -> Config:
    return Config(
        server_url=_require("SERVER_URL").rstrip("/"),
        agent_api_key=_require("AGENT_API_KEY"),
        point_id=_require("POINT_ID"),
        poll_interval_sec=int(os.getenv("POLL_INTERVAL_SEC", "5")),
        printer_name=os.getenv("PRINTER_NAME", "").strip(),
        sumatra_path=os.getenv("SUMATRA_PATH", "bin/SumatraPDF.exe").strip(),
    )
