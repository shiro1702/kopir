from .printer import PrintError


def reportable_error(exc: Exception, *, phase: str) -> str:
    """Short reason for order.errorMessage (staff/admin); client sees generic bot text."""
    if isinstance(exc, PrintError):
        return str(exc)

    msg = str(exc).strip()
    lower = msg.lower()

    if phase == "download":
        if "connection" in lower or "timeout" in lower or "timed out" in lower:
            return "download failed: no connection to server"
        if "/file" in msg or "api request failed" in lower:
            return "download failed: could not fetch file from server"
        return "download failed"

    if phase == "calculation":
        if "connection" in lower or "timeout" in lower:
            return "calculation failed: no connection to server"
        if "/file" in msg:
            return "calculation failed: could not fetch file from server"
        return "calculation failed"

    if phase == "print":
        return msg[:300] if msg else "print failed"

    return msg[:300] if msg else f"{phase} failed"
