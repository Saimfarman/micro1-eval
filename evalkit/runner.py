from __future__ import annotations

import hashlib
import json
import time
from datetime import datetime, timezone
from pathlib import Path

from .grading import grade
from .manifest import write_manifest
from .failures import classify_failure
from .providers import Quota, ProviderResponse, mock_response, provider_response
from .tasks import load_tasks


def _record(run_id: str, provider: str, task: dict, repetition: int,
            response: ProviderResponse) -> dict:
    record = {
        "attempt_key": f"{run_id}/{provider}/{task['id']}/{repetition}",
        "task_id": task["id"],
        "task_hash": hashlib.sha256(Path(task["_path"]).read_bytes()).hexdigest(),
        "prompt_sent": task["prompt"],
        "model_requested": provider,
        "model_returned": response.model_returned,
        "settings": {"temperature": 0, "max_tokens": 4096},
        "response_text": response.text,
        "finish_reason": response.finish_reason,
        "usage": response.usage,
        "latency_ms": response.latency_ms,
        "provider_response_id": response.provider_response_id,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    record["content_sha256"] = hashlib.sha256(
        json.dumps(record, sort_keys=True).encode("utf-8")
    ).hexdigest()
    return record


def run(root: Path, provider: str = "mock", repetitions: int = 1,
        resume: bool = True, max_retries: int = 2,
        spend_cap_usd: float | None = None, run_id: str | None = None) -> str:
    tasks = load_tasks(root / "tasks")
    run_id = run_id or (datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ") + "-" +
                        hashlib.sha1("".join(t["id"] for t in tasks).encode()).hexdigest()[:8])
    out = root / "results" / "runs" / run_id
    raw_dir = out / "raw"
    raw_dir.mkdir(parents=True, exist_ok=True)
    grades = []
    failures = []
    quota = Quota(spend_cap_usd=spend_cap_usd)
    for task in tasks:
        for repetition in range(1, repetitions + 1):
            path = raw_dir / f"{task['id']}__{repetition}.json"
            if resume and path.exists():
                record = json.loads(path.read_text(encoding="utf-8"))
                response = ProviderResponse(
                    record["response_text"], record["model_returned"],
                    record["finish_reason"], record.get("usage", {}),
                    record.get("latency_ms", 0), record.get("provider_response_id"),
                )
            else:
                response = provider_response(task, provider, root, quota, max_retries)
                record = _record(run_id, provider, task, repetition, response)
                path.write_text(json.dumps(record, indent=2) + "\n", encoding="utf-8")
            grade_result = {
                **grade(response.text, task["history"], task["module"], task["expected_verdict"]),
                "attempt_key": record["attempt_key"],
                "task_id": task["id"],
            }
            grades.append(grade_result)
            if not grade_result["passed"]:
                failures.append(classify_failure(record, grade_result))
    (out / "run.json").write_text(json.dumps({
        "run_id": run_id, "provider": provider, "repetitions": repetitions,
        "resumable": True, "max_retries": max_retries,
        "spend_cap_usd": spend_cap_usd,
    }, indent=2) + "\n", encoding="utf-8")
    (out / "grades.jsonl").write_text(
        "".join(json.dumps(grade_row) + "\n" for grade_row in grades), encoding="utf-8"
    )
    (out / "failures.json").write_text(json.dumps({
        "human_review": {"status": "not_requested", "reviewed": False},
        "failures": failures,
    }, indent=2) + "\n", encoding="utf-8")
    write_manifest(root)
    return run_id
