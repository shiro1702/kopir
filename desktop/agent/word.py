import sys
import threading
from pathlib import Path

_word_lock = threading.Lock()


class WordError(Exception):
    pass


def _require_win32():
    if sys.platform != "win32":
        raise WordError("MS Word is only available on Windows")
    try:
        import win32com.client  # noqa: F401
    except ImportError as exc:
        raise WordError("pywin32 is not installed") from exc


    _require_win32()
    import win32com.client

    file_path = str(Path(path).resolve())
    if not Path(file_path).is_file():
        raise WordError(f"File not found: {path}")

    with _word_lock:
        word = None
        doc = None
        try:
            word = win32com.client.Dispatch("Word.Application")
            word.Visible = False
            word.DisplayAlerts = 0
            doc = word.Documents.Open(file_path, ReadOnly=True)
            pages = int(doc.ComputeStatistics(2))
            if pages < 1:
                raise WordError("Invalid page count")
            return pages
        except WordError:
            raise
        except Exception as exc:
            raise WordError(f"Word failed to count pages: {exc}") from exc
        finally:
            if doc is not None:
                try:
                    doc.Close(False)
                except Exception:
                    pass
            if word is not None:
                try:
                    word.Quit()
                except Exception:
                    pass


def print_document(path: str, *, printer_name: str = "") -> None:
    _require_win32()
    import win32com.client

    file_path = str(Path(path).resolve())
    if not Path(file_path).is_file():
        raise WordError(f"File not found: {path}")

    with _word_lock:
        word = None
        doc = None
        try:
            word = win32com.client.Dispatch("Word.Application")
            word.Visible = False
            word.DisplayAlerts = 0
            doc = word.Documents.Open(file_path, ReadOnly=True)
            if printer_name:
                word.ActivePrinter = printer_name
            doc.PrintOut(Background=False)
        except WordError:
            raise
        except Exception as exc:
            raise WordError(f"Word failed to print: {exc}") from exc
        finally:
            if doc is not None:
                try:
                    doc.Close(False)
                except Exception:
                    pass
            if word is not None:
                try:
                    word.Quit()
                except Exception:
                    pass
