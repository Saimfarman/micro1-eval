from __future__ import annotations
import argparse
import asyncio
import json
import re
import sqlite3
import sys
import tempfile
import zipfile
from pathlib import Path
from .manifest import verify_attempt_hashes, verify_manifest, write_manifest
from .replay import replay, verify_results
from .report import write_report
from .runner import run
from .tasks import generate_tasks, load_tasks, validate_tasks
from .model_config import estimate, load_models
from backend.db.ingest import ingest
from backend.db.migrate import migrate, LATEST_VERSION
from backend.app import Settings, create_app

ROOT = Path(__file__).resolve().parent.parent


def _release_checks(clean_room: bool = False) -> list[str]:
    errors = []
    errors.extend(validate_tasks(ROOT / "tasks"))
    required = ("README.md", ".env.example", "package.json", "package-lock.json",
                "requirements.txt", "requirements-dev.txt", "docs/API.md",
                "docs/OPERATIONS.md", "docs/RELEASE.md")
    errors.extend(f"missing release file: {name}" for name in required
                  if not (ROOT / name).exists())
    frontend = ROOT / "frontend" / "dist"
    if not (frontend / "index.html").exists() or not list((frontend / "assets").glob("*")):
        errors.append("frontend/dist is missing generated assets")
    for requirement_file in ("requirements.txt", "requirements-dev.txt"):
        path = ROOT / requirement_file
        if path.exists():
            for line in path.read_text(encoding="utf-8").splitlines():
                if (line.strip() and not line.lstrip().startswith("#")
                        and not line.lstrip().startswith("-r ")
                        and "==" not in line):
                    errors.append(f"unpinned dependency: {requirement_file}: {line}")
    secret_pattern = re.compile(
        r"""(?:api[_-]?key|client[_-]?secret|password|token)\s*[:=]\s*['"][^'"]{8,}['"]|(?:sk-|AIza)[A-Za-z0-9_-]{12,}"""
    )
    placeholder_pattern = re.compile(r"\b(?:TODO|FIXME|TBD|coming soon|to be recorded)\b", re.I)
    excluded = {".git", ".venv", "venv", "node_modules", "__pycache__",
                ".pytest_cache", "plan"}
    for path in ROOT.rglob("*"):
        if not path.is_file() or any(part in excluded for part in path.relative_to(ROOT).parts):
            continue
        if path.name == "micro1 Eval Hackathon Implementation Plan.md":
            continue
        if path.name == ".env":
            errors.append(".env must not be present in a release checkout")
        if path.suffix.lower() not in {".md", ".py", ".ts", ".tsx", ".js", ".json", ".yaml", ".yml", ".env"}:
            continue
        text = path.read_text(encoding="utf-8", errors="ignore")
        secret_match = secret_pattern.search(text)
        if secret_match and not any(marker in secret_match.group(0).lower()
                                    for marker in ("do-not-leak", "example", "redacted", "test")):
            errors.append(f"possible secret value: {path.relative_to(ROOT)}")
        if path.suffix.lower() == ".md" and placeholder_pattern.search(text):
            errors.append(f"release placeholder: {path.relative_to(ROOT)}")
    errors.extend(verify_manifest(ROOT))
    readme = ROOT / "README.md"
    if readme.exists():
        readme_text = readme.read_text(encoding="utf-8")
        required_headings = [f"## {index}." for index in range(1, 9)]
        if not all(heading in readme_text for heading in required_headings):
            errors.append("README.md is missing one or more required sections")
    if clean_room:
        archive = ROOT / "micro1-eval-submission.zip"
        package_excluded = {".env", ".venv", "venv", "node_modules", "__pycache__",
                            ".pytest_cache", "__zip_inspect", ".git",
                            "generated-tasks", "live"}
        if not archive.exists():
            errors.append("clean-room package is missing")
        else:
            if archive.stat().st_size > 50 * 1024 * 1024:
                errors.append("clean-room package exceeds 50 MiB")
            for path in ROOT.rglob("*"):
                relative = path.relative_to(ROOT)
                if (path.is_file()
                        and not any(part in package_excluded for part in relative.parts)
                        and path.stat().st_size > 5 * 1024 * 1024):
                    errors.append(f"release file exceeds 5 MiB: {path.relative_to(ROOT)}")
    with tempfile.TemporaryDirectory() as directory:
        connection = sqlite3.connect(Path(directory) / "preflight.sqlite3")
        if migrate(connection) != LATEST_VERSION:
            errors.append("database migrations did not reach the latest version")
        connection.close()
    async def api_checks():
        app = create_app(Settings(ROOT))
        client = app.test_client()
        health = await client.get("/api/health")
        if health.status_code != 200:
            errors.append(f"health check failed: HTTP {health.status_code}")
        response = await client.get("/api/openapi.json")
        if response.status_code != 200:
            errors.append(f"OpenAPI endpoint failed: HTTP {response.status_code}")
        else:
            document = await response.get_json()
            if document.get("openapi") != "3.0.3" or not document.get("paths"):
                errors.append("OpenAPI document is incomplete")
    asyncio.run(api_checks())
    return errors

def main(argv=None) -> int:
    parser = argparse.ArgumentParser(prog="python -m evalkit")
    sub = parser.add_subparsers(dest="command", required=True)
    for name in ("validate-tasks", "estimate", "run", "grade", "replay", "report",
                 "verify", "reproduce", "preflight", "package", "ingest", "generate"):
        sub.add_parser(name)
    sub.choices["run"].add_argument("--provider", choices=("mock", "groq", "gemini", "openrouter", "mistral", "azure-openai"),
                                    default="mock")
    sub.choices["run"].add_argument("--repetitions", type=int, default=1)
    sub.choices["run"].add_argument("--no-resume", action="store_true")
    sub.choices["run"].add_argument("--max-retries", type=int, default=2)
    sub.choices["run"].add_argument("--spend-cap-usd", type=float)
    sub.choices["run"].add_argument("--run-id")
    sub.choices["preflight"].add_argument("--clean-room", action="store_true")
    sub.choices["generate"].add_argument("--module", choices=("M1", "M2", "M3", "M4", "M5"), required=True)
    sub.choices["generate"].add_argument("--n", type=int, default=10)
    sub.choices["generate"].add_argument("--seed", type=int, required=True)
    args = parser.parse_args(argv)
    if args.command == "validate-tasks":
        errors = validate_tasks(ROOT / "tasks")
        print("\n".join(errors))
        return int(bool(errors))
    if args.command == "estimate":
        count = len(load_tasks(ROOT / "tasks"))
        print(json.dumps(estimate(load_models(ROOT / "models.yaml"), count), indent=2))
        return 0
    if args.command == "generate":
        paths = generate_tasks(ROOT / "generated-tasks", args.module, args.n, args.seed)
        print(json.dumps({"seed": args.seed, "module": args.module,
                          "created": [str(path.relative_to(ROOT)) for path in paths]}, indent=2))
        return 0
    if args.command == "run":
        print(run(ROOT, provider=args.provider, repetitions=args.repetitions,
                  resume=not args.no_resume, max_retries=args.max_retries,
                  spend_cap_usd=args.spend_cap_usd, run_id=args.run_id))
        return 0
    if args.command == "report":
        print(json.dumps(write_report(ROOT), indent=2))
        return 0
    if args.command == "replay":
        print(json.dumps(replay(ROOT), indent=2))
        return 0
    if args.command == "ingest":
        try:
            print(json.dumps(ingest(ROOT), indent=2))
        except ValueError as exc:
            print(str(exc))
            return 1
        return 0
    if args.command == "verify":
        errors = verify_manifest(ROOT) + verify_attempt_hashes(ROOT) + verify_results(ROOT)
        print("\n".join(errors))
        return int(bool(errors))
    if args.command == "reproduce":
        errors = verify_manifest(ROOT) + verify_attempt_hashes(ROOT) + verify_results(ROOT)
        if errors:
            print("\n".join(errors))
            return 1
        print(json.dumps(write_report(ROOT), indent=2))
        return 0
    if args.command == "preflight":
        errors = _release_checks(clean_room=args.clean_room)
        print("\n".join(errors))
        return int(bool(errors))
    if args.command == "package":
        write_manifest(ROOT)
        archive = ROOT / "micro1-eval-submission.zip"
        excluded = {".env", ".venv", "venv", "node_modules", "__pycache__", ".pytest_cache",
                    "__zip_inspect", ".git", "generated-tasks", "live"}
        with zipfile.ZipFile(archive, "w", zipfile.ZIP_DEFLATED) as target:
            for path in ROOT.rglob("*"):
                if not path.is_file() or archive == path:
                    continue
                relative = path.relative_to(ROOT)
                if (any(part in excluded for part in relative.parts)
                        or path.suffix.lower() in {".sqlite", ".sqlite3", ".db", ".zip"}):
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
