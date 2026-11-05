from __future__ import annotations
import hashlib
import json
from pathlib import Path

TEXT_EXTS = {
    ".json", ".yaml", ".yml", ".txt", ".toml", ".py", ".md",
    ".html", ".css", ".js", ".jsonl", ".ts", ".tsx", ".svg"
}

def sha256(path: Path) -> str:
    data = path.read_bytes()
    # Normalize CRLF to LF for text files so that git checkouts across
    # Windows (CRLF) and Linux (LF, e.g. CI) produce identical cryptographic digests
    if path.suffix.lower() in TEXT_EXTS:
        data = data.replace(b"\r\n", b"\n")
    return hashlib.sha256(data).hexdigest()

def build_manifest(root: Path) -> dict:
    files = {}
    for base in (root / "tasks", root / "results"):
        if base.exists():
            for path in base.rglob("*"):
                if (path.is_file() and path.name != "MANIFEST.json"
                        and not path.name.endswith(".migrate.lock")
                        and path.suffix not in {".sqlite", ".sqlite3", ".db"}
                        and "__pycache__" not in path.parts
                        and not path.name.endswith(".pyc")):
                    files[str(path.relative_to(root)).replace("\\", "/")] = sha256(path)
    for path in (root / "eval.config.yaml", root / "models.yaml"):
        if path.exists():
            files[path.name] = sha256(path)
    for path in (root / "requirements.txt", root / "requirements-dev.txt",
                 root / "pyproject.toml"):
        if path.exists():
            files[str(path.relative_to(root)).replace("\\", "/")] = sha256(path)
    for base in (root / "evalkit" / "domain" / "oracle",
                 root / "frontend" / "dist"):
        if base.exists():
            for path in base.rglob("*"):
                if (path.is_file() and "__pycache__" not in path.parts
                        and not path.name.endswith(".pyc")):
                    files[str(path.relative_to(root)).replace("\\", "/")] = sha256(path)
    return {"version": 2, "files": dict(sorted(files.items()))}

def write_manifest(root: Path) -> Path:
    path = root / "results" / "MANIFEST.json"
    path.parent.mkdir(exist_ok=True)
    manifest_data = json.dumps(build_manifest(root), indent=2) + "\n"
    path.write_bytes(manifest_data.encode("utf-8"))
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
            th = record.get("task_hash")
            task_path = Path(task["_path"])
            task_bytes = task_path.read_bytes()
            valid_hashes = {
                hashlib.sha256(task_bytes.replace(b"\r\n", b"\n")).hexdigest(),
                hashlib.sha256(task_bytes.replace(b"\r\n", b"\n").replace(b"\n", b"\r\n")).hexdigest(),
            }
            if th not in valid_hashes:
                errors.append(f"attempt task hash mismatch: {path.relative_to(root)}")
        except (KeyError, json.JSONDecodeError):
            errors.append(f"invalid attempt record: {path.relative_to(root)}")
    return errors
