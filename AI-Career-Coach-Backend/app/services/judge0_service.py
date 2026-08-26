import logging
import time

import requests

from app.core.config import settings


class Judge0UnavailableError(RuntimeError):
    pass


class Judge0Service:
    language_map = {"python": 71, "java": 62, "cpp": 54, "c++": 54, "javascript": 63, "js": 63, "c": 50, "c#": 51, "csharp": 51}

    def _endpoints(self) -> list[str]:
        candidates = [settings.JUDGE0_URL, "https://ce.judge0.com", "http://localhost:2358"]
        return list(dict.fromkeys(url.rstrip("/") for url in candidates if url))

    def _wait_for_result(self, base_url: str, token: str) -> dict:
        deadline = time.monotonic() + settings.JUDGE0_POLL_TIMEOUT_SECONDS
        while time.monotonic() < deadline:
            response = requests.get(f"{base_url}/submissions/{token}?base64_encoded=false", timeout=settings.JUDGE0_REQUEST_TIMEOUT_SECONDS)
            response.raise_for_status()
            result = response.json()
            if result["status"]["id"] > 2:
                return result
            time.sleep(settings.JUDGE0_POLL_INTERVAL_SECONDS)
        raise TimeoutError("Judge0 did not finish execution in time.")

    def execute_with_input(self, language: str, source_code: str, stdin: str) -> dict:
        language_id = self.language_map.get(language.lower())
        if language_id is None:
            raise ValueError(f"Unsupported language: {language}")
        payload = {"language_id": language_id, "source_code": source_code, "stdin": stdin}
        for base_url in self._endpoints():
            for attempt in range(1, settings.JUDGE0_MAX_RETRIES + 1):
                try:
                    response = requests.post(f"{base_url}/submissions?base64_encoded=false&wait=false", json=payload, timeout=settings.JUDGE0_REQUEST_TIMEOUT_SECONDS)
                    response.raise_for_status()
                    return self._wait_for_result(base_url, response.json()["token"])
                except (requests.RequestException, KeyError, TimeoutError) as exc:
                    logging.warning("Judge0 endpoint unavailable: %s (attempt %s/%s, %s)", base_url, attempt, settings.JUDGE0_MAX_RETRIES, type(exc).__name__)
                    if attempt < settings.JUDGE0_MAX_RETRIES:
                        time.sleep(min(attempt, 2))
        raise Judge0UnavailableError("Code execution service is temporarily unavailable. Please try again later.")

    def execute(self, language: str, source_code: str) -> dict:
        return self.execute_with_input(language, source_code, "")


judge0_service = Judge0Service()
