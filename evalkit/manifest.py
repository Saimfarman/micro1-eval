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
                if path.is_file() and path.name != "MANIFEST.json":
                    files[str(path.relative_to(root)).replace("\\", "/")] = sha256(path)
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
    expected = json.loads(path.read_text(encoding="utf-8")).get("files", {})
    errors = []
    for name, digest in expected.items():
        target = root / name
        if not target.exists():
            errors.append(f"missing: {name}")
        elif sha256(target) != digest:
            errors.append(f"hash mismatch: {name}")
    return errors
