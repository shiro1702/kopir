import sys
import tempfile
import time
import traceback
from datetime import datetime
from pathlib import Path

from .api_client import ApiClient
from .config import load_config
from .printer import PrintError, _extension_for_order, print_order
from . import word


def log(message: str) -> None:
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    print(f"[{timestamp}] {message}", flush=True)


def temp_path_for_order(order: dict) -> Path:
    temp_dir = Path(tempfile.gettempdir())
    ext = _extension_for_order(order)
    return temp_dir / f"kopir_{order['id']}{ext}"


def process_calculation(client: ApiClient, config, order: dict) -> None:
    order_id = order["id"]

    if not config.use_word:
        log("Word calculation disabled: USE_WORD=false")
        client.submit_calculation(order_id, error_message="Word calculation is disabled on this agent")
        return

    if sys.platform != "win32":
        log("Word calculation skipped: not Windows")
        client.submit_calculation(order_id, error_message="Word calculation requires Windows")
        return

    temp_path = temp_path_for_order(order)

    try:
        client.download_file(order_id, str(temp_path))
        log(f"Downloaded {order.get('fileName', 'file')} for calculation {order_id}")
        page_count = word.count_pages(str(temp_path))
        client.submit_calculation(order_id, page_count=page_count)
        log(f"Submitted calculation OK for order {order_id}: {page_count} pages")
    except word.WordError as exc:
        log(f"Calculation failed for order {order_id}: {exc}")
        client.submit_calculation(order_id, error_message=str(exc))
    except Exception as exc:
        log(f"Error calculating order {order_id}: {exc}")
        traceback.print_exc()
        try:
            client.submit_calculation(order_id, error_message=str(exc))
        except Exception:
            log(f"Failed to report calculation error for order {order_id}")
    finally:
        if temp_path.exists():
            temp_path.unlink()


def process_order(client: ApiClient, config, order: dict) -> None:
    order_id = order["id"]
    client.claim(order_id)
    log(f"Claimed order {order_id}")

    temp_path = temp_path_for_order(order)

    try:
        client.download_file(order_id, str(temp_path))
        log(f"Downloaded {order.get('fileName', 'file')} for order {order_id}")
        print_order(str(temp_path), order, config)
        client.complete(order_id, "PRINTED")
        log(f"Completed PRINTED order {order_id}")
    except PrintError as exc:
        log(f"Print failed for order {order_id}: {exc}")
        client.complete(order_id, "FAILED", str(exc))
    except Exception as exc:
        log(f"Error processing order {order_id}: {exc}")
        traceback.print_exc()
        try:
            client.complete(order_id, "FAILED", str(exc))
        except Exception:
            log(f"Failed to report error for order {order_id}")
    finally:
        if temp_path.exists():
            temp_path.unlink()


def main() -> None:
    config = load_config()
    client = ApiClient(config)

    log(
        f"Kopir agent started | server={config.server_url} "
        f"point={config.point_id} poll={config.poll_interval_sec}s "
        f"use_word={config.use_word}"
    )

    while True:
        try:
            calc_orders = client.get_queue(kind="calculate")
            for order in calc_orders:
                process_calculation(client, config, order)

            print_orders = client.get_queue(kind="print")
            if not calc_orders and not print_orders:
                log("idle")
            else:
                for order in print_orders:
                    process_order(client, config, order)
        except Exception as exc:
            log(f"Poll error: {exc}")
            traceback.print_exc()

        time.sleep(config.poll_interval_sec)


if __name__ == "__main__":
    main()
