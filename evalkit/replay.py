from __future__ import annotations
import json
from pathlib import Path
from .grading import grade
from .tasks import load_tasks

def replay(root: Path) -> dict:
    tasks = {t["id"]: t for t in load_tasks(root / "tasks")}
    runs = sorted((root / "results" / "runs").glob("*"))
    if not runs:
        return {"attempts": 0, "passed": 0}
    latest = runs[-1]
    passed = total = 0
    for path in (latest / "raw").glob("*.json"):
        record = json.loads(path.read_text(encoding="utf-8"))
        result = grade(record["response_text"], tasks[record["task_id"]]["expected_verdict"])
        passed += int(result["passed"])
        total += 1
    return {"run_id": latest.name, "attempts": total, "passed": passed,
            "pass_at_1": passed / total if total else 0}
