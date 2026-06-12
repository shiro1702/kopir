import time
from typing import Any

import requests

from .config import Config


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
            except requests.RequestException as exc:
                last_error = exc
                if attempt < retries - 1:
                    time.sleep(2 ** attempt)

        raise RuntimeError(f"API request failed: {method} {path}") from last_error

    def get_queue(self) -> list[dict[str, Any]]:
        response = self._request(
            "GET",
            "/api/agent/queue",
            params={"pointId": self.config.point_id},
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
