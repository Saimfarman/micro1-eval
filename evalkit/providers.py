"""Provider interfaces. Mock is deterministic; HTTP provider is opt-in."""
from __future__ import annotations

import json
import os
import urllib.request
from pathlib import Path

from .domain.history import parse
from .domain.oracle.rules import check


def load_local_env(path: Path) -> None:
    """Load simple KEY=VALUE entries without overwriting process variables."""
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
    return json.dumps(check(parse(task["history"]), task["module"]))


def openai_compatible_complete(task: dict, config: dict | None = None) -> str:
    config = config or {}
    key, url, model = (os.environ.get(config.get(name, default))
                       for name, default in (("key_env", "OPENAI_API_KEY"),
                                             ("base_url", "OPENAI_BASE_URL"),
                                             ("model_env", "OPENAI_MODEL")))
    if not key or not url or not model:
        raise RuntimeError("API key, base URL and model are required")
    body = json.dumps({
        "model": model,
        "messages": [{"role": "user", "content": task["prompt"]}],
        "temperature": 0,
        "max_tokens": 2048,
        "reasoning_effort": "low",
    }).encode()
    request = urllib.request.Request(
        url.rstrip("/") + "/chat/completions",
        data=body,
        headers={"Authorization": "Bearer " + key, "Content-Type": "application/json",
                 "User-Agent": "micro1-eval/1.0"},
    )
    with urllib.request.urlopen(request, timeout=60) as response:
        return json.loads(response.read())["choices"][0]["message"]["content"]


def provider_complete(task: dict, provider: str, root: Path) -> str:
    load_local_env(root / ".env")
    configs = {
        "groq": {"key_env": "GROQ_API_KEY", "base_url": "GROQ_BASE_URL",
                 "model_env": "GROQ_MODEL"},
        "openrouter": {"key_env": "OPENROUTER_API_KEY", "base_url": "OPENROUTER_BASE_URL",
                       "model_env": "OPENROUTER_MODEL"},
        "gemini": {"key_env": "GEMINI_API_KEY", "base_url": "GEMINI_BASE_URL",
                   "model_env": "GEMINI_MODEL"},
    }
    if provider not in configs:
        raise ValueError(f"unsupported provider: {provider}")
    return openai_compatible_complete(task, configs[provider])
