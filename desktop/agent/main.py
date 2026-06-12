import tempfile
import time
import traceback
from datetime import datetime
from pathlib import Path

from .api_client import ApiClient
from .config import load_config
from .printer import PrintError, print_pdf


def log(message: str) -> None:
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    print(f"[{timestamp}] {message}", flush=True)


def process_order(client: ApiClient, config, order: dict) -> None:
    order_id = order["id"]
    client.claim(order_id)
    log(f"Claimed order {order_id}")

    temp_dir = Path(tempfile.gettempdir())
    temp_path = temp_dir / f"kopir_{order_id}.pdf"

    try:
        client.download_file(order_id, str(temp_path))
        log(f"Downloaded {order.get('fileName', 'file')} for order {order_id}")
        print_pdf(str(temp_path), config)
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
        f"point={config.point_id} poll={config.poll_interval_sec}s"
    )

    while True:
        try:
            orders = client.get_queue()
            if not orders:
                log("idle")
            else:
                for order in orders:
                    process_order(client, config, order)
        except Exception as exc:
            log(f"Poll error: {exc}")
            traceback.print_exc()

        time.sleep(config.poll_interval_sec)


if __name__ == "__main__":
    main()
