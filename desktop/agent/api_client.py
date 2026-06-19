import time
from typing import Any, Literal

import requests

from .config import Config

QueueKind = Literal["calculate", "print"]


class ApiClient:
    def __init__(self, config: Config) -> None:
        self.config = config
        self.session = requests.Session()
        self.session.headers.update(
            {"Authorization": f"Bearer {config.agent_api_key}"}
        )

    def _request(
        self,
        method: str,
        path: str,
        *,
        params: dict[str, str] | None = None,
        json: dict[str, Any] | None = None,
        stream: bool = False,
        retries: int = 3,
    ) -> requests.Response:
        url = f"{self.config.server_url}{path}"
        last_error: Exception | None = None

        for attempt in range(retries):
            try:
                response = self.session.request(
                    method,
                    url,
                    params=params,
                    json=json,
                    stream=stream,
                    timeout=60,
                )
                response.raise_for_status()
                return response
            except requests.HTTPError as exc:
                last_error = exc
                detail = ""
                if exc.response is not None:
                    try:
                        payload = exc.response.json()
                        data = payload.get("data") or {}
                        detail = data.get("error") or payload.get("statusMessage") or ""
                    except ValueError:
                        detail = exc.response.text[:500]
                if detail:
                    last_error = RuntimeError(
                        f"{method} {path} -> HTTP {exc.response.status_code}: {detail}"
                    )
                if attempt < retries - 1:
                    time.sleep(2 ** attempt)
            except requests.RequestException as exc:
                last_error = exc
                if attempt < retries - 1:
                    time.sleep(2 ** attempt)

        raise RuntimeError(f"API request failed: {method} {path}") from last_error

    def get_queue(self, kind: QueueKind = "print") -> list[dict[str, Any]]:
        response = self._request(
            "GET",
            "/api/agent/queue",
            params={"pointId": self.config.point_id, "kind": kind},
        )
        data = response.json()
        return data.get("orders", [])

    def claim(self, order_id: str) -> dict[str, Any]:
        response = self._request("POST", f"/api/agent/orders/{order_id}/claim")
        return response.json()

    def download_file(self, order_id: str, dest_path: str) -> None:
        response = self._request(
            "GET",
            f"/api/agent/orders/{order_id}/file",
            stream=True,
        )
        with open(dest_path, "wb") as file:
            for chunk in response.iter_content(chunk_size=8192):
                if chunk:
                    file.write(chunk)

    def submit_calculation(
        self,
        order_id: str,
        *,
        page_count: int | None = None,
        error_message: str | None = None,
    ) -> dict[str, Any]:
        if page_count is not None:
            body: dict[str, Any] = {"status": "OK", "pageCount": page_count}
        else:
            body = {
                "status": "FAILED",
                "errorMessage": error_message or "Calculation failed",
            }
        response = self._request(
            "POST",
            f"/api/agent/orders/{order_id}/calculation",
            json=body,
        )
        return response.json()

    def complete(
        self,
        order_id: str,
        status: str,
        error_message: str | None = None,
    ) -> dict[str, Any]:
        body: dict[str, Any] = {"status": status}
        if error_message:
            body["errorMessage"] = error_message
        response = self._request(
            "POST",
            f"/api/agent/orders/{order_id}/complete",
            json=body,
        )
        return response.json()
