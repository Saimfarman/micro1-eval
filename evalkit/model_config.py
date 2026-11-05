"""Small dependency-free loader for the checked-in models.yaml format."""

from __future__ import annotations

import re
from pathlib import Path


def load_models(path: Path) -> list[dict]:
    models = []
    current = None
    for line in path.read_text(encoding="utf-8").splitlines():
        match = re.match(r"\s+- id:\s*(\S+)", line)
        if match:
            if current:
                models.append(current)
            current = {"id": match.group(1)}
            continue
        match = re.match(r"\s+([A-Za-z_]+):\s*(.+)", line)
        if not match or current is None:
            continue
        key, value = match.groups()
        value = value.strip()
        if value in {"true", "false"}:
            current[key] = value == "true"
        else:
            try:
                current[key] = float(value) if "." in value else int(value)
            except ValueError:
                current[key] = value.strip("'\"")
    if current:
        models.append(current)
    return models


def estimate(
    models: list[dict],
    task_count: int,
    repetitions: int = 1,
    input_tokens: int = 500,
    output_tokens: int = 300,
) -> dict:
    calls = task_count * repetitions
    result = []
    for model in models:
        total_tokens = calls * (input_tokens + output_tokens)
        rpm = model.get("requests_per_minute", 1)
        rpd = model.get("requests_per_day", calls)
        result.append(
            {
                "model": model["id"],
                "provider": model.get("provider"),
                "calls": calls,
                "estimated_tokens": total_tokens,
                "quota_days": calls / rpd if rpd else None,
                "quota_days_by_tokens": total_tokens
                / model.get("tokens_per_day", total_tokens)
                if model.get("tokens_per_day", total_tokens)
                else None,
                "runtime_minutes": calls / rpm if rpm else None,
                "estimated_cost_usd": round(
                    total_tokens
                    / 1_000_000
                    * float(model.get("price_per_million_tokens", 0)),
                    6,
                ),
                "enabled": model.get("enabled", False),
            }
        )
    return {"tasks": task_count, "repetitions": repetitions, "models": result}
