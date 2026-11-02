"""Provider adapters and quota-aware request primitives.

Live adapters are opt-in. Secrets are read from the local environment and are
never included in returned metadata or logs.
"""
from __future__ import annotations

import json
import os
import time
import urllib.error
import urllib.request
from dataclasses import dataclass, field
from pathlib import Path

from .domain.history import parse
from .domain.linearizability import parse_register
from .domain.oracle import rules


@dataclass(frozen=True)
class ProviderResponse:
    text: str
    model_returned: str
    finish_reason: str
    usage: dict
    latency_ms: int
    provider_response_id: str | None = None


@dataclass
class Quota:
    requests_per_minute: int = 60
    requests_per_day: int = 10000
    max_tokens: int = 4096
    spend_cap_usd: float | None = None
    request_timestamps: list[float] = field(default_factory=list)
    requests_today: int = 0
    spent_usd: float = 0.0

    def reserve(self, estimated_cost: float = 0.0, now: float | None = None) -> None:
        now = time.monotonic() if now is None else now
        self.request_timestamps[:] = [stamp for stamp in self.request_timestamps if now - stamp < 60]
        if len(self.request_timestamps) >= self.requests_per_minute:
            raise RuntimeError("provider requests-per-minute quota exhausted")
        if self.requests_today >= self.requests_per_day:
            raise RuntimeError("provider requests-per-day quota exhausted")
        if self.spend_cap_usd is not None and self.spent_usd + estimated_cost > self.spend_cap_usd:
            raise RuntimeError("provider spend cap reached")
        self.request_timestamps.append(now)
        self.requests_today += 1
        self.spent_usd += estimated_cost


def load_local_env(path: Path) -> None:
    if not path.exists():
        return
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        name, value = line.split("=", 1)
        name = name.strip()
        if name and name not in os.environ:
            os.environ[name] = value.strip().strip("\"'")


def mock_complete(task: dict) -> str:
    history = parse_register(task["history"]) if task["module"] == "M4" else parse(task["history"])
    return json.dumps(rules.check(history, task["module"]))


def mock_response(task: dict) -> ProviderResponse:
    text = mock_complete(task)
    return ProviderResponse(text, "mock", "stop",
                            {"input_tokens": len(task["prompt"].split()),
                             "output_tokens": len(text.split()),
                             "total_tokens": len(task["prompt"].split()) + len(text.split())},
                            0, "mock-" + task["id"])


def _request(task: dict, config: dict, timeout: float) -> ProviderResponse:
    key = os.environ.get(config["key_env"])
    url = os.environ.get(config["base_url_env"], config.get("base_url", ""))
    model = os.environ.get(config["model_env"])
    if not key or not url or not model:
        raise RuntimeError("API key, base URL and model are required")
    body = json.dumps({
        "model": model,
        "messages": [{"role": "user", "content": task["prompt"]}],
        "temperature": 0,
        "max_tokens": config.get("max_tokens", 2048),
        "reasoning_effort": "low",
    }).encode()
    request = urllib.request.Request(
        url.rstrip("/") + "/chat/completions", data=body,
        headers={"Authorization": "Bearer " + key, "Content-Type": "application/json",
                 "User-Agent": "micro1-eval/1.0"},
    )
    started = time.monotonic()
    try:
        with urllib.request.urlopen(request, timeout=timeout) as response:
            payload = json.loads(response.read())
    except urllib.error.HTTPError as exc:
        if exc.code == 429 or exc.code >= 500:
            raise RuntimeError(f"retryable provider HTTP {exc.code}") from exc
        raise RuntimeError(f"provider HTTP {exc.code}") from exc
    choice = payload["choices"][0]
    usage = payload.get("usage") or {}
    return ProviderResponse(
        choice["message"]["content"], payload.get("model", model),
        choice.get("finish_reason", "unknown"), usage,
        int((time.monotonic() - started) * 1000), payload.get("id"),
    )


def provider_response(task: dict, provider: str, root: Path, quota: Quota | None = None,
                      retries: int = 2, backoff: float = 0.25) -> ProviderResponse:
    load_local_env(root / ".env")
    if provider == "mock":
        return mock_response(task)
    configs = {
        "groq": {"key_env": "GROQ_API_KEY", "base_url_env": "GROQ_BASE_URL",
                 "model_env": "GROQ_MODEL"},
        "openrouter": {"key_env": "OPENROUTER_API_KEY", "base_url_env": "OPENROUTER_BASE_URL",
                       "model_env": "OPENROUTER_MODEL"},
        "gemini": {"key_env": "GEMINI_API_KEY", "base_url_env": "GEMINI_BASE_URL",
                   "model_env": "GEMINI_MODEL"},
    }
    if provider not in configs:
        raise ValueError(f"unsupported provider: {provider}")
    quota = quota or Quota()
    for attempt in range(retries + 1):
        quota.reserve()
        try:
            return _request(task, configs[provider], 60)
        except RuntimeError as exc:
            if "retryable" not in str(exc) or attempt >= retries:
                raise
            time.sleep(backoff * (2 ** attempt))
    raise RuntimeError("provider request failed")


def openai_compatible_complete(task: dict, config: dict | None = None) -> str:
    config = config or {}
    response = _request(task, {
        "key_env": config.get("key_env", "OPENAI_API_KEY"),
        "base_url_env": config.get("base_url", "OPENAI_BASE_URL"),
        "model_env": config.get("model_env", "OPENAI_MODEL"),
    }, 60)
    return response.text


def provider_complete(task: dict, provider: str, root: Path) -> str:
    return provider_response(task, provider, root).text
