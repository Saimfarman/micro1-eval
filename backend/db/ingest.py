from __future__ import annotations

import hashlib
import json
import sqlite3
from datetime import datetime, timezone
from pathlib import Path

from evalkit.manifest import sha256, verify_attempt_hashes, verify_manifest
from evalkit.tasks import load_tasks
from .migrate import migration_lock, migrate

SCHEMA_VERSION = 4


def _json(value: object) -> str:
    return json.dumps(value, sort_keys=True, separators=(",", ":"))


def _manifest_hash(root: Path) -> str:
    manifest = root / "results" / "MANIFEST.json"
    if not manifest.exists():
        return ""
    return sha256(manifest)


def connect(path: Path) -> sqlite3.Connection:
    path.parent.mkdir(parents=True, exist_ok=True)
    connection = sqlite3.connect(path)
    connection.row_factory = sqlite3.Row
    connection.execute("PRAGMA journal_mode=WAL")
    connection.execute("PRAGMA foreign_keys=ON")
    return connection


def _schema(connection: sqlite3.Connection, root: Path) -> None:
    schema_path = root / "backend" / "db" / "schema.sql"
    if not schema_path.exists():
        schema_path = Path(__file__).with_name("schema.sql")
    schema = schema_path.read_text(encoding="utf-8")
    connection.executescript(schema)
    connection.execute(
        "INSERT OR REPLACE INTO schema_meta(key, value) VALUES('schema_version', ?)",
        (str(SCHEMA_VERSION),),
    )


def _latest_run(root: Path) -> Path | None:
    runs = sorted((root / "results" / "runs").glob("*"))
    return runs[-1] if runs else None


def ingest(root: Path, database: Path | None = None, require_integrity: bool = True) -> dict:
    database = database or (root / "results" / "index.sqlite3")
    integrity_errors = verify_manifest(root) + verify_attempt_hashes(root)
    if require_integrity and integrity_errors:
        raise ValueError("cannot ingest unverified evidence: " + "; ".join(integrity_errors))
    with migration_lock(database):
        connection = connect(database)
    try:
        migrate(connection)
        _schema(connection, root)
        connection.commit()
        manifest_hash = _manifest_hash(root)
        previous = connection.execute(
            "SELECT value FROM schema_meta WHERE key='manifest_hash'"
        ).fetchone()
        if previous and previous["value"] == manifest_hash:
            return {"database": str(database), "status": "unchanged",
                    "manifest_hash": manifest_hash}
        connection.execute("BEGIN")
        for table in ("live_run_events", "failure_tags", "grades", "attempts",
                      "summaries", "runs", "models", "tasks", "modules", "providers",
                      "manifests"):
            connection.execute(f"DELETE FROM {table}")
        tasks = load_tasks(root / "tasks")
        modules = sorted({task["module"] for task in tasks})
        for module in modules:
            connection.execute(
                "INSERT INTO modules VALUES (?, ?, ?)",
                (module, f"Evaluation module {module}", _json({"id": module})),
            )
        providers = {"mock"}
        models_path = root / "models.yaml"
        if models_path.exists():
            from evalkit.model_config import load_models
            model_rows = load_models(models_path)
            providers.update(model.get("provider", "") for model in model_rows if model.get("provider"))
        else:
            model_rows = []
        for provider in sorted(providers):
            connection.execute("INSERT INTO providers VALUES (?, ?)",
                               (provider, _json({"id": provider})))
        for task in tasks:
            connection.execute(
                "INSERT INTO tasks VALUES (?, ?, ?, ?, ?, ?, ?)",
                (task["id"], task["module"], int(task["control"]), task.get("status", "final"),
                 task["expected_verdict"], task["canonical_hash"], _json(task)),
            )
        for model in model_rows:
            connection.execute(
                    "INSERT INTO models VALUES (?, ?, ?)",
                    (model["id"], model.get("provider", ""), _json(model)),
                )
        runs = sorted((root / "results" / "runs").glob("*"))
        attempt_count = grade_count = failure_count = 0
        for run in runs:
            if not (run / "run.json").exists():
                continue
            run_payload = json.loads((run / "run.json").read_text(encoding="utf-8"))
            provider = run_payload.get("provider", "mock")
            connection.execute("INSERT OR IGNORE INTO providers VALUES (?, ?)",
                               (provider, _json({"id": provider})))
            connection.execute(
                "INSERT INTO runs VALUES (?, ?, ?)",
                (run.name, provider, _json(run_payload)),
            )
            for path in sorted((run / "raw").glob("*.json")):
                record = json.loads(path.read_text(encoding="utf-8"))
                connection.execute(
                    "INSERT INTO attempts VALUES (?, ?, ?, ?, ?)",
                    (record["attempt_key"], run.name, record["task_id"],
                     record["content_sha256"], _json(record)),
                )
                attempt_count += 1
            grades_path = run / "grades.jsonl"
            if grades_path.exists():
                for line in grades_path.read_text(encoding="utf-8").splitlines():
                    grade = json.loads(line)
                    connection.execute(
                        "INSERT INTO grades VALUES (?, ?, ?, ?)",
                        (grade["attempt_key"], int(grade["passed"]), grade["score"], _json(grade)),
                    )
                    grade_count += 1
            failures_path = run / "failures.json"
            if failures_path.exists():
                failures = json.loads(failures_path.read_text(encoding="utf-8")).get("failures", [])
                for failure in failures:
                    connection.execute(
                        "INSERT INTO failure_tags(attempt_key, tag, payload_json) VALUES (?, ?, ?)",
                        (failure.get("attempt_key"), failure.get("tag", "unknown"), _json(failure)),
                    )
                    failure_count += 1
            summary_path = run / "summary.json"
            if not summary_path.exists():
                summary_path = root / "results" / "summary.json"
            if summary_path.exists():
                connection.execute("INSERT INTO summaries VALUES (?, ?)",
                                   (run.name, summary_path.read_text(encoding="utf-8")))
            for event_path in sorted(run.glob("events*.jsonl")):
                for line in event_path.read_text(encoding="utf-8").splitlines():
                    if line.strip():
                        event = json.loads(line)
                        connection.execute(
                            "INSERT INTO live_run_events(run_id, event_type, event_json, created_at) "
                            "VALUES (?, ?, ?, ?)",
                            (run.name, event.get("type", "message"), _json(event),
                             event.get("created_at", datetime.now(timezone.utc).isoformat())),
                        )
        if manifest_hash:
            manifest_path = root / "results" / "MANIFEST.json"
            connection.execute(
                "INSERT INTO manifests VALUES (?, ?, ?)",
                (manifest_hash, str(manifest_path.relative_to(root)), manifest_path.read_text(encoding="utf-8")),
            )
        connection.execute(
            "INSERT OR REPLACE INTO schema_meta(key, value) VALUES('manifest_hash', ?)",
            (manifest_hash,),
        )
        connection.commit()
        return {"database": str(database), "status": "rebuilt", "manifest_hash": manifest_hash,
                "tasks": len(tasks), "attempts": attempt_count, "grades": grade_count,
                "failures": failure_count}
    except Exception:
        connection.rollback()
        raise
    finally:
        connection.close()
