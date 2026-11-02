"""Task loading and validation for the offline evaluation harness."""
from __future__ import annotations
import json
import random
from pathlib import Path
from .domain.fuzz import random_history
from .domain.history import print_history
from .domain.oracle.reference import ref_verdict

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


def generate_tasks(directory: Path, module: str, count: int, seed: int) -> list[Path]:
    directory.mkdir(parents=True, exist_ok=True)
    rng = random.Random(seed)
    created = []
    for index in range(1, count + 1):
        history = random_history(rng, module, n=5, nkeys=2, fault=0.5)
        text = print_history(history)
        task_id = f"G{module[1]}-{seed}-{index:03d}"
        path = directory / f"{task_id}.json"
        task = {"id": task_id, "module": module, "control": False, "status": "generated",
                "verified_by": ["evalkit.domain.oracle.reference", "evalkit.domain.oracle.rules"],
                "history": text, "expected_verdict": ref_verdict(history, module),
                "prompt": f"Apply {module} to this history and end with fenced JSON containing verdict.\n\n{text}"}
        path.write_text(json.dumps(task, indent=2) + "\n", encoding="utf-8")
        created.append(path)
    return created
