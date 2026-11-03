"""Oracle-derived task corpus, deterministic generation, and selection metadata."""
from __future__ import annotations

import hashlib
import json
import random
from pathlib import Path

from .domain.fuzz import random_history
from .domain.history import History, print_history
from .domain.linearizability import RegisterHistory, RegisterOp, print_register
from .domain.oracle import o3, reference, rules
from .domain.oracle.m4 import linearization
from .domain.linearizability import parse_register
from .domain.history import parse
from .domain.strict_serializability import (
    check as check_m5,
    reference_check as reference_m5,
)

MODULES = frozenset({"M1", "M2", "M3", "M4", "M5"})
ORACLES = (
    "evalkit.domain.oracle.reference",
    "evalkit.domain.oracle.rules",
    "evalkit.domain.oracle.o3",
)


def _history_for(module: str, text: str) -> History | RegisterHistory:
    return parse_register(text) if module == "M4" else parse(text)


def _canonical_history(history: History | RegisterHistory) -> str:
    return print_register(history) if isinstance(history, RegisterHistory) else print_history(history)


def _difficulty(history: History | RegisterHistory, result: dict) -> dict:
    if isinstance(history, RegisterHistory):
        reads = sum(op.kind == "read" for op in history.operations)
        writes = sum(op.kind == "write" for op in history.operations)
        return {
            "operations": len(history.operations),
            "reads": reads,
            "writes": writes,
            "search_space": len(history.operations),
            "certificate_items": len(result.get("order", result.get("violation", {}).get("operations", []))),
        }
    if result.get("module") == "M5":
        certificate = result.get("certificate", {})
        return {
            "transactions": len(history.txns),
            "keys": len(history.keys),
            "operations": sum(len(txn.ops) for txn in history.txns),
            "reads": sum(op.kind == "r" for txn in history.txns for op in txn.ops),
            "writes": sum(op.kind == "w" for txn in history.txns for op in txn.ops),
            "prepared": sum(txn.outcome == "prepared" for txn in history.txns),
            "real_time_edges": sum(
                left.end < right.start
                for left in history.txns
                for right in history.txns
                if left.id != right.id and left.end is not None and right.start is not None
            ),
            "certificate_items": len(certificate.get("serial_order", [])),
        }
    reads = sum(op.kind == "r" for txn in history.txns for op in txn.ops)
    writes = sum(op.kind == "w" for txn in history.txns for op in txn.ops)
    return {
        "transactions": len(history.txns),
        "keys": len(history.keys),
        "operations": reads + writes,
        "reads": reads,
        "writes": writes,
        "prepared": sum(txn.outcome == "prepared" for txn in history.txns),
        "certificate_items": len(result.get("edges", result.get("completions", result.get("violations", [])))),
    }


def _canonical_hash(module: str, history: History | RegisterHistory) -> str:
    payload = f"{module}\n{_canonical_history(history)}".encode("utf-8")
    return hashlib.sha256(payload).hexdigest()


def _oracle_result(module: str, history: History | RegisterHistory) -> tuple[str, dict]:
    if module == "M5":
        results = check_m5(history, "all")
        verdicts = {result["verdict"] for result in results.values()}
        if len(verdicts) != 1:
            raise ValueError(f"oracle disagreement for M5: {sorted(verdicts)}")
        result = results["rules"]
        return next(iter(verdicts)), result
    reference_verdict = reference.ref_verdict(history, module)
    rules_result = rules.check(history, module)
    o3_result = o3.check(history, module)
    verdicts = {reference_verdict, rules_result["verdict"], o3_result["verdict"]}
    if len(verdicts) != 1:
        raise ValueError(f"oracle disagreement for {module}: {sorted(verdicts)}")
    return reference_verdict, rules_result


def _prompt(module: str, text: str) -> str:
    return (
        f"Apply {module} to this history. Explain the decision and end with a "
        "fenced JSON object containing verdict valid, invalid, or undetermined.\n\n"
        f"{text}"
    )


def _metadata(
    task: dict,
    history: History | RegisterHistory,
    verdict: str,
    rules_result: dict,
    *,
    source: str,
    seed: int | None,
    generator: str,
) -> dict:
    task["expected_verdict"] = verdict
    task["expected_certificate"] = rules_result
    task["derivation"] = rules_result.get("derivation", [])
    task["verified_by"] = (
        ["evalkit.domain.strict_serializability.reference_check",
         "evalkit.domain.strict_serializability.rules_check",
         "evalkit.domain.strict_serializability.constraint_check"]
        if task["module"] == "M5" else list(ORACLES)
    )
    task["canonical_hash"] = _canonical_hash(task["module"], history)
    task["difficulty"] = _difficulty(history, rules_result)
    task["provenance"] = {
        "source": source,
        "seed": seed,
        "generator": generator,
        "oracles": list(ORACLES),
    }
    task["schema_version"] = 2
    task["verification_level"] = "VL1"
    task["rubric"] = {
        "verdict": {"weight": 3, "critical": True},
        "certificate": {"weight": 4, "critical": True},
        "naming": {"weight": 1, "critical": False},
    }
    task["history"] = _canonical_history(history)
    task["prompt"] = _prompt(task["module"], task["history"])
    return task


def load_tasks(directory: Path) -> list[dict]:
    tasks = []
    for path in sorted(directory.glob("*.json")):
        if path.name == "SELECTION.json":
            continue
        item = json.loads(path.read_text(encoding="utf-8"))
        item["_path"] = str(path)
        tasks.append(item)
    return tasks


def validate_tasks(directory: Path, *, strict: bool = False) -> list[str]:
    errors = []
    seen_hashes: dict[str, str] = {}
    task_ids = {task.get("id") for task in load_tasks(directory)}
    for task in load_tasks(directory):
        path = task.get("_path", "<unknown>")
        required = (
            "id", "module", "prompt", "history", "expected_verdict", "control",
            "status", "verified_by", "expected_certificate", "derivation",
            "difficulty", "provenance", "canonical_hash",
        )
        for field in required:
            if field not in task:
                errors.append(f"{path}: missing {field}")
        if strict:
            for field in ("schema_version", "rubric", "verification_level",
                          "control_relationship"):
                if field not in task:
                    errors.append(f"{path}: missing {field} in strict mode")
            if task.get("schema_version") != 2:
                errors.append(f"{task.get('id')}: unsupported schema_version")
            if task.get("verification_level") not in {"VL1", "VL2", "VL3"}:
                errors.append(f"{task.get('id')}: invalid verification_level")
            if not isinstance(task.get("rubric"), dict) or not task.get("rubric"):
                errors.append(f"{task.get('id')}: rubric must be non-empty")
            if any(token in str(task.get(field, "")).lower()
                   for field in ("prompt", "history", "derivation")
                   for token in ("todo", "placeholder", "tbd")):
                errors.append(f"{task.get('id')}: placeholder content")
        if task.get("status", "final") in {"draft", "placeholder"}:
            errors.append(f"{task.get('id')}: unfinished status")
        relationship = task.get("control_relationship")
        if task.get("control") and not relationship:
            errors.append(f"{task.get('id')}: control_relationship is missing")
        if relationship and relationship.get("kind") == "matched":
            paired = relationship.get("paired_with")
            if not paired or paired not in task_ids:
                errors.append(f"{task.get('id')}: matched control has no paired core")
        module = task.get("module")
        if module not in MODULES:
            errors.append(f"{task.get('id')}: invalid module")
            continue
        try:
            history = _history_for(module, task["history"])
            verdict, rules_result = _oracle_result(module, history)
            expected_verifiers = (
                ["evalkit.domain.strict_serializability.reference_check",
                 "evalkit.domain.strict_serializability.rules_check",
                 "evalkit.domain.strict_serializability.constraint_check"]
                if module == "M5" else list(ORACLES)
            )
            if tuple(task["verified_by"]) != tuple(expected_verifiers):
                errors.append(f"{task['id']}: verified_by must list all three checkers")
            if task["expected_verdict"] != verdict:
                errors.append(f"{task['id']}: expected_verdict is not oracle-derived")
            if task["expected_certificate"] != rules_result:
                errors.append(f"{task['id']}: expected_certificate is stale")
            if task["canonical_hash"] != _canonical_hash(module, history):
                errors.append(f"{task['id']}: canonical_hash is stale")
            if task["derivation"] != rules_result.get("derivation", []):
                errors.append(f"{task['id']}: derivation is stale")
            duplicate = seen_hashes.get(task["canonical_hash"])
            if duplicate:
                errors.append(f"{task['id']}: duplicate history of {duplicate}")
            else:
                seen_hashes[task["canonical_hash"]] = task["id"]
        except (KeyError, TypeError, ValueError) as exc:
            errors.append(f"{task.get('id')}: malformed oracle data: {exc}")
    return errors


def _register_history(rng: random.Random, count: int, fault: bool) -> RegisterHistory:
    operations: list[RegisterOp] = []
    value = 0
    for index in range(count):
        invoke = index * 2 + 1
        response = invoke + 1
        if index == count - 1 or rng.random() < 0.55:
            value += 1
            operations.append(RegisterOp(f"R{index + 1}", "write", invoke, response, value))
        else:
            operations.append(RegisterOp(f"R{index + 1}", "read", invoke, response, value))
    if fault:
        read_indices = [i for i, op in enumerate(operations) if op.kind == "read"]
        if not read_indices:
            operations[-1] = RegisterOp("R" + str(count), "read", (count - 1) * 2 + 1,
                                        count * 2, 0)
        else:
            index = rng.choice(read_indices)
            op = operations[index]
            operations[index] = RegisterOp(op.id, "read", op.invoke, op.response, value + 1000)
    return RegisterHistory(0, tuple(operations))


def generate_tasks(directory: Path, module: str, count: int, seed: int) -> list[Path]:
    directory.mkdir(parents=True, exist_ok=True)
    module = module.upper()
    if module not in MODULES:
        raise ValueError(module)
    rng = random.Random(seed)
    created = []
    seen = set()
    index = 0
    attempts = 0
    while len(created) < count:
        attempts += 1
        if attempts > count * 100:
            raise RuntimeError("unable to generate enough unique task histories")
        index += 1
        if module == "M4":
            history = _register_history(rng, rng.randint(3, 6), bool(index % 2))
            text = print_register(history)
        elif module == "M5":
            from .domain.history import Op, Txn

            value = index
            valid = bool(index % 2)
            txns = (
                Txn("T1", (Op("w", "x", value),), "commit", 1, 4),
                Txn("T2", (Op("r", "x", value if valid else 0),), "commit", 5, 8),
            )
            history = History("timed", ("x",), {"x": 0}, txns)
            text = print_history(history)
        else:
            history = random_history(rng, module, n=5, nkeys=2, fault=0.5)
            text = print_history(history)
        digest = _canonical_hash(module, history)
        if digest in seen:
            continue
        seen.add(digest)
        task_id = f"G{module[1]}-{seed}-{index:03d}"
        verdict, rules_result = _oracle_result(module, history)
        task = {
            "id": task_id,
            "module": module,
            "control": False,
            "status": "generated",
            "control_relationship": {"kind": "core", "paired_with": None},
        }
        _metadata(task, history, verdict, rules_result, source="seeded-generator",
                  seed=seed, generator="evalkit.tasks.generate_tasks")
        path = directory / f"{task_id}.json"
        path.write_text(json.dumps(task, indent=2, sort_keys=False) + "\n", encoding="utf-8")
        created.append(path)
    return created


def enrich_frozen_tasks(directory: Path, source: str = "frozen-v1") -> list[Path]:
    """Recompute all metadata from the oracles for the frozen corpus."""
    updated = []
    for path in sorted(directory.glob("*.json")):
        task = json.loads(path.read_text(encoding="utf-8"))
        module = task["module"].upper()
        history = _history_for(module, task["history"])
        verdict, rules_result = _oracle_result(module, history)
        task = _metadata(
            task, history, verdict, rules_result, source=source,
            seed=task.get("provenance", {}).get("seed"),
            generator=task.get("provenance", {}).get("generator", "frozen-corpus"),
        )
        task.setdefault("status", "final")
        task.setdefault("control_relationship", {
            "kind": "standalone-control" if task.get("control") else "core",
            "paired_with": None,
        })
        path.write_text(json.dumps(task, indent=2) + "\n", encoding="utf-8")
        updated.append(path)
    return updated


def create_m4_frozen_tasks(directory: Path) -> list[Path]:
    """Create one core/control pair from oracle-derived valid and invalid cases."""
    cases = [
        ("T10", False, _register_history(random.Random(410), 4, False), None),
        ("C18", True, _register_history(random.Random(410), 4, True), "T10"),
    ]
    created = []
    for task_id, control, history, paired_with in cases:
        verdict, rules_result = _oracle_result("M4", history)
        task = {
            "id": task_id,
            "module": "M4",
            "control": control,
            "status": "final",
            "control_relationship": {
                "kind": "matched" if control else "core",
                "paired_with": paired_with,
            },
        }
        _metadata(task, history, verdict, rules_result, source="phase-2-frozen",
                  seed=410, generator="evalkit.tasks.create_m4_frozen_tasks")
        path = directory / f"{task_id}.json"
        path.write_text(json.dumps(task, indent=2) + "\n", encoding="utf-8")
        created.append(path)
    return created
