import os
import sys
import threading
import time
from pathlib import Path

_word_lock = threading.Lock()

COUNT_PAGES_TIMEOUT_SEC = 60
PRINT_TIMEOUT_SEC = 180


class WordError(Exception):
    pass


class _WordSession:
    def __init__(self) -> None:
        self.word = None
        self.doc = None
        self.pid = 0


def _require_win32():
    if sys.platform != "win32":
        raise WordError("MS Word is only available on Windows")
    try:
        import win32com.client  # noqa: F401
        import pythoncom  # noqa: F401
    except ImportError as exc:
        raise WordError("pywin32 is not installed") from exc


def _open_document(word, file_path: str, *, read_only: bool = True):
    return word.Documents.Open(
        FileName=file_path,
        ConfirmConversions=False,
        ReadOnly=read_only,
        AddToRecentFiles=False,
        Visible=False,
        OpenAndRepair=False,
    )


def _word_pid(word) -> int:
    try:
        import win32process

        hwnd = int(word.Hwnd)
        _, pid = win32process.GetWindowThreadProcessId(hwnd)
        return int(pid)
    except Exception:
        return 0


def _kill_pid(pid: int) -> None:
    if sys.platform != "win32" or pid <= 0:
        return
    try:
        import ctypes

        handle = ctypes.windll.kernel32.OpenProcess(1, False, pid)
        if handle:
            ctypes.windll.kernel32.TerminateProcess(handle, 1)
            ctypes.windll.kernel32.CloseHandle(handle)
    except Exception:
        try:
            os.kill(pid, 9)
        except Exception:
            pass


def _cleanup_session(session: _WordSession) -> None:
    if session.doc is not None:
        try:
            session.doc.Close(False)
        except Exception:
            pass
        session.doc = None
    if session.word is not None:
        try:
            session.word.Quit()
        except Exception:
            pass
        session.word = None
    try:
        import pythoncom

        pythoncom.CoUninitialize()
    except Exception:
        pass


def _run_word_action(action, *, timeout_sec: int) -> int:
    _require_win32()

    result: list[int] = []
    error: list[BaseException] = []
    session = _WordSession()

    def worker() -> None:
        import pythoncom
        import win32com.client

        pythoncom.CoInitialize()
        try:
            session.word = win32com.client.DispatchEx("Word.Application")
            session.pid = _word_pid(session.word)
            session.word.Visible = False
            session.word.DisplayAlerts = 0
            session.word.ScreenUpdating = False
            result.append(action(session))
        except BaseException as exc:
            error.append(exc)
        finally:
            _cleanup_session(session)

    with _word_lock:
        thread = threading.Thread(target=worker, daemon=True)
        thread.start()
        thread.join(timeout_sec)
        if thread.is_alive():
            _kill_pid(session.pid)
            thread.join(5)
            raise WordError(f"Word timed out after {timeout_sec}s")
        if error:
            exc = error[0]
            if isinstance(exc, WordError):
                raise exc
            raise WordError(str(exc)) from exc
        if not result:
            raise WordError("Word returned no result")
        return result[0]


def count_pages(path: str) -> int:
    file_path = str(Path(path).resolve())
    if not Path(file_path).is_file():
        raise WordError(f"File not found: {path}")

    def run(session: _WordSession) -> int:
        session.doc = _open_document(session.word, file_path, read_only=True)
        pages = int(session.doc.ComputeStatistics(2))
        if pages < 1:
            raise WordError("Invalid page count")
        return pages

    try:
        return _run_word_action(run, timeout_sec=COUNT_PAGES_TIMEOUT_SEC)
    except WordError:
        raise
    except Exception as exc:
        raise WordError(f"Word failed to count pages: {exc}") from exc


def _force_printer_simplex(printer_name: str) -> tuple[str, int] | None:
    """Temporarily set printer queue duplex to simplex. Returns (name, old_duplex) to restore."""
    try:
        import win32print
    except ImportError:
        return None

    name = (printer_name or "").strip() or win32print.GetDefaultPrinter()
    handle = win32print.OpenPrinter(name)
    try:
        attrs = win32print.GetPrinter(handle, 2)
        devmode = attrs.get("pDevMode")
        if devmode is None:
            return None
        old_duplex = int(devmode.Duplex)
        # DMDUP_SIMPLEX = 1; skip if already simplex or duplex unsupported (0)
        if old_duplex in (0, 1):
            return None
        devmode.Duplex = 1
        attrs["pDevMode"] = devmode
        win32print.SetPrinter(handle, 2, attrs, 0)
        return (name, old_duplex)
    except Exception:
        return None
    finally:
        win32print.ClosePrinter(handle)


def _restore_printer_duplex(state: tuple[str, int] | None) -> None:
    if not state:
        return
    name, old_duplex = state
    try:
        import win32print

        handle = win32print.OpenPrinter(name)
        try:
            attrs = win32print.GetPrinter(handle, 2)
            devmode = attrs.get("pDevMode")
            if devmode is None:
                return
            devmode.Duplex = old_duplex
            attrs["pDevMode"] = devmode
            win32print.SetPrinter(handle, 2, attrs, 0)
        finally:
            win32print.ClosePrinter(handle)
    except Exception:
        pass


def print_document(path: str, *, printer_name: str = "", copies: int = 1) -> None:
    file_path = str(Path(path).resolve())
    if not Path(file_path).is_file():
        raise WordError(f"File not found: {path}")

    safe_copies = max(1, int(copies))
    duplex_state = _force_printer_simplex(printer_name)

    def run(session: _WordSession) -> int:
        session.doc = _open_document(session.word, file_path, read_only=True)
        if printer_name:
            session.word.ActivePrinter = printer_name
        session.doc.PrintOut(
            Background=True,
            Copies=safe_copies,
            ManualDuplexPrint=False,
        )
        time.sleep(2)
        return 0

    try:
        _run_word_action(run, timeout_sec=PRINT_TIMEOUT_SEC)
    except WordError:
        raise
    except Exception as exc:
        raise WordError(f"Word failed to print: {exc}") from exc
    finally:
        _restore_printer_duplex(duplex_state)
