from __future__ import annotations

import json
from pathlib import Path


def build_report(root: Path) -> dict:
    runs = sorted((root / "results" / "runs").glob("*"))
    if not runs:
        return {"runs": 0, "attempts": 0, "passed": 0, "pass_at_1": 0}
    latest = runs[-1]
    rows = [json.loads(line) for line in (latest / "grades.jsonl").read_text(encoding="utf-8").splitlines()]
    by_scope = {}
    for row in rows:
        task = json.loads((root / "tasks" / f"{row['task_id']}.json").read_text(encoding="utf-8"))
        scope = "control" if task["control"] else "core"
        by_scope.setdefault(scope, {"attempts": 0, "passed": 0})
        by_scope[scope]["attempts"] += 1
        by_scope[scope]["passed"] += int(row["passed"])
    for value in by_scope.values():
        value["pass_at_1"] = value["passed"] / value["attempts"] if value["attempts"] else 0
    return {"run_id": latest.name, "runs": 1, "attempts": len(rows),
            "passed": sum(int(row["passed"]) for row in rows),
            "pass_at_1": sum(int(row["passed"]) for row in rows) / len(rows) if rows else 0,
            "scopes": by_scope}


def write_report(root: Path) -> dict:
    report = build_report(root)
    target = root / "results" / "summary.json"
    target.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    from .manifest import write_manifest
    write_manifest(root)
    return report
