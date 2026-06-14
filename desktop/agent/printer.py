import subprocess
import sys
from pathlib import Path

from .config import Config
from . import word


class PrintError(Exception):
    pass


def _extension_for_order(order: dict) -> str:
    file_name = str(order.get("fileName") or "document.pdf")
    ext = Path(file_name).suffix.lower()
    if ext:
        return ext
    mime = str(order.get("mimeType") or "").lower()
    if "pdf" in mime:
        return ".pdf"
    if "msword" in mime:
        return ".doc"
    if "wordprocessingml" in mime:
        return ".docx"
    return ".pdf"


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


def print_order(file_path: str, order: dict, config: Config) -> None:
    ext = Path(file_path).suffix.lower() or _extension_for_order(order)

    if ext == ".pdf":
        print_pdf(file_path, config)
        return

    if ext in {".doc", ".docx"}:
        if not config.use_word:
            raise PrintError("Word printing is disabled (USE_WORD=false)")
        if sys.platform != "win32":
            raise PrintError("Word printing requires Windows")
        try:
            word.print_document(file_path, printer_name=config.printer_name)
        except word.WordError as exc:
            raise PrintError(str(exc)) from exc
        return

    raise PrintError(f"Unsupported file type: {ext}")
