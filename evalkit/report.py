from __future__ import annotations

import json
from pathlib import Path

from .scoring import aggregate_grades


def build_report(root: Path) -> dict:
    runs = sorted((root / "results" / "runs").glob("*"))
    if not runs:
        return {"runs": 0, "attempts": 0, "passed": 0, "pass_at_1": 0}
    latest = runs[-1]
    rows = [json.loads(line) for line in (latest / "grades.jsonl").read_text(encoding="utf-8").splitlines()]
    tasks = {
        path.stem: json.loads(path.read_text(encoding="utf-8"))
        for path in (root / "tasks").glob("*.json")
    }
    return {"run_id": latest.name, "runs": 1, **aggregate_grades(rows, tasks)}


def write_report(root: Path) -> dict:
    report = build_report(root)
    target = root / "results" / "summary.json"
    target.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    from .manifest import write_manifest
    write_manifest(root)
    return report
