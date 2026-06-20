import sys


def disable_console_quick_edit() -> None:
    """Stop accidental console clicks from pausing the agent until Enter is pressed."""
    if sys.platform != "win32":
        return

    try:
        import ctypes

        kernel32 = ctypes.windll.kernel32
        std_input_handle = -10
        enable_quick_edit_mode = 0x0040
        enable_insert_mode = 0x0020

        handle = kernel32.GetStdHandle(std_input_handle)
        if handle in (0, -1):
            return

        mode = ctypes.c_ulong()
        if not kernel32.GetConsoleMode(handle, ctypes.byref(mode)):
            return

        mode.value &= ~enable_quick_edit_mode
        mode.value &= ~enable_insert_mode
        kernel32.SetConsoleMode(handle, mode.value)
    except Exception:
        # No attached console (service, scheduled task, redirected stdout).
        pass
