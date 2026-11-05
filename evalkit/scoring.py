"""Deterministic aggregate scoring for completed evaluation rows."""

from __future__ import annotations

import random
from collections import defaultdict


def _mean(values: list[float]) -> float:
    return sum(values) / len(values) if values else 0.0


def _bootstrap(values: list[float], seed: int, samples: int = 2000) -> dict:
    if not values:
        return {"low": 0.0, "high": 0.0, "seed": seed, "samples": samples}
    rng = random.Random(seed)
    estimates = sorted(
        _mean([rng.choice(values) for _ in values]) for _ in range(samples)
    )
    return {
        "low": estimates[int(samples * 0.025)],
        "high": estimates[int(samples * 0.975) - 1],
        "seed": seed,
        "samples": samples,
    }


def aggregate_grades(
    rows: list[dict], tasks: dict[str, dict], seed: int = 20261102
) -> dict:
    """Aggregate grades without inventing missing attempts or expected answers."""
    scopes: dict[str, list[dict]] = defaultdict(list)
    modules: dict[str, list[dict]] = defaultdict(list)
    for row in rows:
        task = tasks[row["task_id"]]
        scopes["control" if task["control"] else "core"].append(row)
        modules[task["module"]].append(row)

    def summarize(items: list[dict]) -> dict:
        scores = [float(item["score"]) for item in items]
        passed = [int(item["passed"]) for item in items]
        return {
            "attempts": len(items),
            "passed": sum(passed),
            "pass_at_1": _mean([float(value) for value in passed]),
            "mean_score": _mean(scores),
            "bootstrap_95": _bootstrap(passed, seed),
            "consistency": _mean(
                [
                    int(item.get("criteria", {}).get("certificate", item["passed"]))
                    for item in items
                ]
            ),
        }

    core = summarize(scopes["core"])
    control = summarize(scopes["control"])
    return {
        "attempts": len(rows),
        "passed": sum(int(row["passed"]) for row in rows),
        "pass_at_1": _mean([float(row["passed"]) for row in rows]),
        "mean_score": _mean([float(row["score"]) for row in rows]),
        "scopes": {name: summarize(items) for name, items in sorted(scopes.items())},
        "modules": {name: summarize(items) for name, items in sorted(modules.items())},
        "control_vs_core": {
            "core_pass_at_1": core["pass_at_1"],
            "control_pass_at_1": control["pass_at_1"],
            "difference": control["pass_at_1"] - core["pass_at_1"],
        },
        "seed": seed,
    }
