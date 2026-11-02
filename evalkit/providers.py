"""Provider interfaces. Mock is deterministic; HTTP provider is opt-in."""
from __future__ import annotations
import json
import os
import urllib.request
from .domain.history import parse
from .domain.oracle.rules import check

def mock_complete(task: dict) -> str:
    return json.dumps(check(parse(task["history"]), task["module"]))

def openai_compatible_complete(task: dict, config: dict | None = None) -> str:
    config = config or {}
    key, url, model = (os.environ.get(config.get(name, default))
                       for name, default in (("key_env", "OPENAI_API_KEY"),
                                             ("base_url", "OPENAI_BASE_URL"),
                                             ("model_env", "OPENAI_MODEL")))
    if not key or not url or not model:
        raise RuntimeError("OPENAI_API_KEY, OPENAI_BASE_URL and OPENAI_MODEL are required")
    body = json.dumps({"model": model, "messages": [{"role": "user", "content": task["prompt"]}]}).encode()
    request = urllib.request.Request(url.rstrip("/") + "/chat/completions", data=body,
        headers={"Authorization": f"Bearer {key}", "Content-Type": "application/json"})
    with urllib.request.urlopen(request, timeout=60) as response:
        return json.loads(response.read())["choices"][0]["message"]["content"]
