import os
import subprocess
import sys
from pathlib import Path

from .config import Config


class PrintError(Exception):
    pass


def print_pdf(pdf_path: str, config: Config) -> None:
    path = Path(pdf_path)
    if not path.is_file():
        raise PrintError(f"PDF file not found: {pdf_path}")

    platform = sys.platform
    timeout = 120

    if platform == "win32":
        sumatra = Path(config.sumatra_path)
        if not sumatra.is_file():
            raise PrintError(f"SumatraPDF not found at {sumatra}")

        printer = config.printer_name or "default"
        cmd = [str(sumatra), "-print-to", printer, "-silent", str(path)]
    elif platform in ("darwin", "linux"):
        cmd = ["lp"]
        if config.printer_name:
            cmd.extend(["-d", config.printer_name])
        cmd.append(str(path))
    else:
        raise PrintError(f"Unsupported platform: {platform}")

    try:
        subprocess.run(cmd, check=True, timeout=timeout)
    except subprocess.TimeoutExpired as exc:
        raise PrintError(f"Print timed out after {timeout}s") from exc
    except subprocess.CalledProcessError as exc:
        raise PrintError(f"Print command failed: {exc}") from exc
