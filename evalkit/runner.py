from __future__ import annotations
import hashlib
import json
from datetime import datetime, timezone
from pathlib import Path
from .grading import grade
from .manifest import write_manifest
from .providers import mock_complete, openai_compatible_complete
from .tasks import load_tasks

def run(root: Path, provider: str = "mock", repetitions: int = 1) -> str:
    tasks = load_tasks(root / "tasks")
    run_id = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ") + "-" + hashlib.sha1(
        "".join(t["id"] for t in tasks).encode()).hexdigest()[:8]
    out = root / "results" / "runs" / run_id
    raw_dir = out / "raw"
    raw_dir.mkdir(parents=True, exist_ok=True)
    grades = []
    for task in tasks:
        for rep in range(1, repetitions + 1):
            text = mock_complete(task) if provider == "mock" else openai_compatible_complete(task)
            record = {"attempt_key": f"{run_id}/{provider}/{task['id']}/{rep}",
                "task_id": task["id"],
                "task_hash": hashlib.sha256(Path(task["_path"]).read_bytes()).hexdigest(),
                "prompt_sent": task["prompt"], "model_requested": provider,
                "model_returned": provider, "settings": {"temperature": 0, "max_tokens": 4096},
                "response_text": text, "finish_reason": "stop",
                "usage": {"input_tokens": 0, "output_tokens": len(text.split())},
                "created_at": datetime.now(timezone.utc).isoformat()}
            (raw_dir / f"{task['id']}__{rep}.json").write_text(
                json.dumps(record, indent=2) + "\n", encoding="utf-8")
            grades.append({**grade(text, task["expected_verdict"]),
                           "attempt_key": record["attempt_key"], "task_id": task["id"]})
    (out / "run.json").write_text(json.dumps({"run_id": run_id, "provider": provider,
        "repetitions": repetitions}, indent=2) + "\n", encoding="utf-8")
    (out / "grades.jsonl").write_text("".join(json.dumps(g) + "\n" for g in grades), encoding="utf-8")
    write_manifest(root)
    return run_id
