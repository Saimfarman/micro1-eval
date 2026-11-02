from __future__ import annotations
import argparse
import json
import sys
import zipfile
from pathlib import Path
from .manifest import verify_manifest, write_manifest
from .replay import replay, verify_results
from .report import write_report
from .runner import run
from .tasks import generate_tasks, load_tasks, validate_tasks

ROOT = Path(__file__).resolve().parent.parent

def main(argv=None) -> int:
    parser = argparse.ArgumentParser(prog="python -m evalkit")
    sub = parser.add_subparsers(dest="command", required=True)
    for name in ("validate-tasks", "estimate", "run", "grade", "replay", "report",
                 "verify", "reproduce", "preflight", "package", "ingest", "generate"):
        sub.add_parser(name)
    sub.choices["run"].add_argument("--provider", choices=("mock", "groq", "gemini", "openrouter"),
                                    default="mock")
    sub.choices["run"].add_argument("--repetitions", type=int, default=1)
    sub.choices["generate"].add_argument("--module", choices=("M1", "M2", "M3"), required=True)
    sub.choices["generate"].add_argument("--n", type=int, default=10)
    sub.choices["generate"].add_argument("--seed", type=int, required=True)
    args = parser.parse_args(argv)
    if args.command == "validate-tasks":
        errors = validate_tasks(ROOT / "tasks")
        print("\n".join(errors))
        return int(bool(errors))
    if args.command == "estimate":
        count = len(load_tasks(ROOT / "tasks"))
        print(json.dumps({"tasks": count, "models": ["mock"], "calls": count}))
        return 0
    if args.command == "generate":
        paths = generate_tasks(ROOT / "generated-tasks", args.module, args.n, args.seed)
        print(json.dumps({"seed": args.seed, "module": args.module,
                          "created": [str(path.relative_to(ROOT)) for path in paths]}, indent=2))
        return 0
    if args.command == "run":
        print(run(ROOT, provider=args.provider, repetitions=args.repetitions))
        return 0
    if args.command == "report":
        print(json.dumps(write_report(ROOT), indent=2))
        return 0
    if args.command in {"replay", "ingest"}:
        print(json.dumps(replay(ROOT), indent=2))
        return 0
    if args.command == "verify":
        errors = verify_manifest(ROOT) + verify_results(ROOT)
        print("\n".join(errors))
        return int(bool(errors))
    if args.command == "reproduce":
        errors = verify_manifest(ROOT)
        if errors:
            print("\n".join(errors))
            return 1
        print(json.dumps(write_report(ROOT), indent=2))
        return 0
    if args.command == "preflight":
        errors = validate_tasks(ROOT / "tasks")
        if not (ROOT / "README.md").exists():
            errors.append("README.md is missing")
        errors.extend(verify_manifest(ROOT))
        if "TODO" in (ROOT / "README.md").read_text(encoding="utf-8"):
            errors.append("README.md contains TODO")
        print("\n".join(errors))
        return int(bool(errors))
    if args.command == "package":
        write_manifest(ROOT)
        archive = ROOT / "micro1-eval-submission.zip"
        excluded = {".env", ".venv", "node_modules", "__pycache__", ".pytest_cache", "__zip_inspect"}
        with zipfile.ZipFile(archive, "w", zipfile.ZIP_DEFLATED) as target:
            for path in ROOT.rglob("*"):
                if not path.is_file() or archive == path:
                    continue
                relative = path.relative_to(ROOT)
                if any(part in excluded for part in relative.parts):
                    continue
                target.write(path, relative.as_posix())
        print(archive)
        return 0
    if args.command == "grade":
        print("grade is performed during run/replay")
        return 0
    return 1

if __name__ == "__main__":
    sys.exit(main())
