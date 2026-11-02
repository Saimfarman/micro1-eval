from __future__ import annotations
import hashlib
import json
from pathlib import Path

def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()

def build_manifest(root: Path) -> dict:
    files = {}
    for base in (root / "tasks", root / "results"):
        if base.exists():
            for path in base.rglob("*"):
                if (path.is_file() and path.name != "MANIFEST.json"
                        and path.suffix not in {".sqlite", ".sqlite3", ".db"}):
                    files[str(path.relative_to(root)).replace("\\", "/")] = sha256(path)
    for path in (root / "eval.config.yaml", root / "models.yaml"):
        if path.exists():
            files[path.name] = sha256(path)
    return {"version": 1, "files": dict(sorted(files.items()))}

def write_manifest(root: Path) -> Path:
    path = root / "results" / "MANIFEST.json"
    path.parent.mkdir(exist_ok=True)
    path.write_text(json.dumps(build_manifest(root), indent=2) + "\n", encoding="utf-8")
    return path

def verify_manifest(root: Path) -> list[str]:
    path = root / "results" / "MANIFEST.json"
    if not path.exists():
        return ["results/MANIFEST.json is missing"]
    try:
        manifest = json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError:
        return ["results/MANIFEST.json is invalid JSON"]
    expected = manifest.get("files", {})
    errors = []
    actual = build_manifest(root)["files"]
    for name in sorted(set(actual) - set(expected)):
        errors.append(f"unlisted: {name}")
    for name in sorted(set(expected) - set(actual)):
        errors.append(f"missing: {name}")
    for name, digest in expected.items():
        target = root / name
        if target.exists() and sha256(target) != digest:
            errors.append(f"hash mismatch: {name}")
    return errors


def verify_attempt_hashes(root: Path) -> list[str]:
    """Verify immutable raw records' self-hashes and task snapshots."""
    errors = []
    tasks = {}
    for path in (root / "tasks").glob("*.json"):
        task = json.loads(path.read_text(encoding="utf-8"))
        task["_path"] = str(path)
        tasks[task["id"]] = task
    for path in sorted((root / "results" / "runs").glob("*/raw/*.json")):
        try:
            record = json.loads(path.read_text(encoding="utf-8"))
            stored = record.pop("content_sha256")
            actual = hashlib.sha256(
                json.dumps(record, sort_keys=True).encode("utf-8")
            ).hexdigest()
            if stored != actual:
                errors.append(f"attempt content hash mismatch: {path.relative_to(root)}")
            task = tasks.get(record.get("task_id"))
            if not task:
                errors.append(f"attempt references unknown task: {path.relative_to(root)}")
                continue
            if record.get("task_hash") != sha256(Path(task["_path"])):
                errors.append(f"attempt task hash mismatch: {path.relative_to(root)}")
        except (KeyError, json.JSONDecodeError):
            errors.append(f"invalid attempt record: {path.relative_to(root)}")
    return errors
