"""Task loading and validation for the offline evaluation harness."""
from __future__ import annotations
import json
from pathlib import Path

def load_tasks(directory: Path) -> list[dict]:
    tasks = []
    for path in sorted(directory.glob("*.json")):
        item = json.loads(path.read_text(encoding="utf-8"))
        item["_path"] = str(path)
        tasks.append(item)
    return tasks

def validate_tasks(directory: Path) -> list[str]:
    errors = []
    for task in load_tasks(directory):
        for field in ("id", "module", "prompt", "history", "expected_verdict", "control"):
            if field not in task:
                errors.append(f"{task.get('_path')}: missing {field}")
        if task.get("status", "final") in {"draft", "placeholder"}:
            errors.append(f"{task.get('id')}: unfinished status")
        if task.get("module") not in {"M1", "M2", "M3"}:
            errors.append(f"{task.get('id')}: invalid module")
    return errors
