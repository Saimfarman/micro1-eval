"""Provider interfaces. Mock is deterministic; HTTP provider is opt-in."""
from __future__ import annotations
import json
import os
import urllib.request

def mock_complete(task: dict) -> str:
    return json.dumps({"verdict": task["expected_verdict"]})

def openai_compatible_complete(task: dict) -> str:
    key, url, model = (os.environ.get(name) for name in
                       ("OPENAI_API_KEY", "OPENAI_BASE_URL", "OPENAI_MODEL"))
    if not key or not url or not model:
        raise RuntimeError("OPENAI_API_KEY, OPENAI_BASE_URL and OPENAI_MODEL are required")
    body = json.dumps({"model": model, "messages": [{"role": "user", "content": task["prompt"]}]}).encode()
    request = urllib.request.Request(url.rstrip("/") + "/chat/completions", data=body,
        headers={"Authorization": f"Bearer {key}", "Content-Type": "application/json"})
    with urllib.request.urlopen(request, timeout=60) as response:
        return json.loads(response.read())["choices"][0]["message"]["content"]
