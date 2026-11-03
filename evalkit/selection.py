"""Deterministic task selection and provenance manifests."""
from __future__ import annotations

import hashlib
import json
import random
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable

from .tasks import generate_tasks, load_tasks, validate_tasks


@dataclass(frozen=True)
class SelectionSpec:
    module: str
    pilot_seed: int
    final_seed: int
    count: int
    control_count: int = 0
    held_out_count: int = 0
    schema_version: int = 2


def _digest(items: Iterable[dict]) -> str:
    payload = json.dumps(list(items), sort_keys=True, separators=(",", ":"))
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()


def _balanced(tasks: list[dict], count: int, rng: random.Random) -> list[dict]:
    grouped = {
        verdict: [task for task in tasks if task["expected_verdict"] == verdict]
        for verdict in ("valid", "invalid", "undetermined")
    }
    for values in grouped.values():
        rng.shuffle(values)
    chosen: list[dict] = []
    while len(chosen) < count:
        available = [values for values in grouped.values() if values]
        if not available:
            raise ValueError("not enough generated tasks for the requested selection")
        values = max(available, key=lambda group: len(group))
        chosen.append(values.pop())
    return chosen


def _mark(task: dict, *, task_id: str, control: bool, paired_with: str | None,
          split: str, spec: SelectionSpec) -> dict:
    result = {key: value for key, value in task.items() if key != "_path"}
    result["id"] = task_id
    result["control"] = control
    result["control_relationship"] = {
        "kind": "matched" if paired_with else ("standalone-control" if control else "core"),
        "paired_with": paired_with,
    }
    result["provenance"] = {
        **result["provenance"],
        "pilot_seed": spec.pilot_seed,
        "final_seed": spec.final_seed,
        "selection_split": split,
        "selection_protocol": "selection-v1",
    }
    return result


def select_tasks(directory: Path, spec: SelectionSpec) -> Path:
    """Generate pilot/final/held-out tasks and write a reproducible manifest."""
    if spec.count < 1:
        raise ValueError("count must be positive")
    if spec.control_count < 0 or spec.held_out_count < 0:
        raise ValueError("control_count and held_out_count cannot be negative")
    directory.mkdir(parents=True, exist_ok=True)
    pool_size = spec.count + spec.control_count + spec.held_out_count + 4
    pilot_generated = directory / "_pilot"
    final_generated = directory / "_generated"
    pilot_generated.mkdir(exist_ok=True)
    final_generated.mkdir(exist_ok=True)
    generate_tasks(pilot_generated, spec.module, pool_size, spec.pilot_seed)
    generate_tasks(final_generated, spec.module, pool_size, spec.final_seed)
    candidates = load_tasks(final_generated)
    candidates = [task for task in candidates if not task["id"].startswith("M")]
    rng = random.Random(spec.final_seed)
    selected = _balanced(candidates, spec.count + spec.control_count, rng)
    selected_hashes = {task["canonical_hash"] for task in selected}
    held_out = [
        task for task in candidates
        if task["canonical_hash"] not in selected_hashes
    ][:spec.held_out_count]

    records: list[dict] = []
    for index, task in enumerate(selected[:spec.count]):
        records.append(_mark(task, task_id=f"T{index + 1:02d}", control=False,
                             paired_with=None, split="final", spec=spec))
    for index, task in enumerate(selected[spec.count:]):
        paired = records[index % len(records)]["id"]
        records.append(_mark(task, task_id=f"C{index + 1:02d}", control=True,
                             paired_with=paired, split="final", spec=spec))
    records.extend(
        _mark(task, task_id=f"H{index + 1:02d}", control=False, paired_with=None,
              split="held-out", spec=spec)
        for index, task in enumerate(held_out)
    )

    for task in records:
        path = directory / f"{task['id']}.json"
        path.write_text(json.dumps(task, indent=2) + "\n", encoding="utf-8")

    errors = validate_tasks(directory, strict=True)
    if errors:
        raise ValueError("\n".join(errors))
    manifest = {
        "protocol": "selection-v1",
        "schema_version": spec.schema_version,
        "spec": spec.__dict__,
        "pilot_pool": [
            {"id": task["id"], "canonical_hash": task["canonical_hash"]}
            for task in load_tasks(pilot_generated)
        ],
        "tasks": [
            {"id": task["id"], "canonical_hash": task["canonical_hash"],
             "split": task["provenance"]["selection_split"]}
            for task in records
        ],
    }
    manifest["manifest_sha256"] = _digest(manifest["tasks"])
    manifest_path = directory / "SELECTION.json"
    manifest_path.write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    return manifest_path
