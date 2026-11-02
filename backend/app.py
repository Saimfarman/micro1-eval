"""Quart application factory for the read-only evaluation dashboard API."""
from __future__ import annotations

import json
import mimetypes
import sqlite3
from dataclasses import dataclass
from pathlib import Path

from quart import Quart, jsonify, request, send_file

from evalkit.manifest import verify_attempt_hashes, verify_manifest
from evalkit.tasks import load_tasks


@dataclass(frozen=True)
class Settings:
    root: Path
    database: Path | None = None
    static_dir: Path | None = None
    auto_ingest: bool = True

    @property
    def db_path(self) -> Path:
        return self.database or self.root / "results" / "index.sqlite3"

    @property
    def frontend_dir(self) -> Path:
        return self.static_dir or self.root / "frontend" / "dist"


def _problem(status: int, title: str, detail: str):
    return jsonify({
        "type": "about:blank",
        "title": title,
        "status": status,
        "detail": detail,
    }), status


def _read_db(settings: Settings, sql: str, params: tuple = ()) -> list[dict]:
    if not settings.db_path.exists():
        return []
    connection = sqlite3.connect(settings.db_path)
    connection.row_factory = sqlite3.Row
    try:
        return [dict(row) for row in connection.execute(sql, params).fetchall()]
    finally:
        connection.close()


def _decode(rows: list[dict], key: str = "payload_json") -> list[dict]:
    result = []
    for row in rows:
        payload = row.pop(key, None)
        result.append(json.loads(payload) if payload else row)
    return result


def _page_args() -> tuple[int, int] | tuple[None, None]:
    try:
        page = int(request.args.get("page", "1"))
        per_page = int(request.args.get("per_page", "25"))
    except ValueError:
        return None, None
    if page < 1 or per_page < 1 or per_page > 100:
        return None, None
    return page, per_page


def create_app(settings: Settings | None = None) -> Quart:
    settings = settings or Settings(Path(__file__).resolve().parent.parent)
    app = Quart(__name__, static_folder=None)
    app.config["SETTINGS"] = settings

    @app.after_request
    async def security_headers(response):
        response.headers["Content-Security-Policy"] = "default-src 'self'; style-src 'self'"
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["Referrer-Policy"] = "no-referrer"
        response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
        response.headers["Cache-Control"] = "no-store" if request.path.startswith("/api/") else "no-cache"
        return response

    @app.errorhandler(404)
    async def not_found(_error):
        return _problem(404, "Not found", "The requested resource does not exist.")

    @app.errorhandler(500)
    async def internal_error(_error):
        return _problem(500, "Internal server error", "The request could not be completed.")

    @app.get("/api/health")
    async def health():
        return jsonify({"status": "ok", "database": settings.db_path.exists()})

    @app.get("/api/meta")
    async def meta():
        return jsonify({
            "title": "Transaction History Reasoning Eval",
            "domain": "computer-science",
            "modules": ["M1", "M2", "M3", "M4"],
            "integrity": not (verify_manifest(settings.root) + verify_attempt_hashes(settings.root)),
        })

    @app.get("/api/openapi.json")
    async def openapi():
        return jsonify({
            "openapi": "3.0.3",
            "info": {"title": "Transaction History Evaluation API", "version": "1.0.0"},
            "paths": {path: {"get": {}} for path in (
                "/api/health", "/api/meta", "/api/tasks", "/api/models", "/api/runs",
                "/api/results/summary", "/api/results/attempts", "/api/failures/breakdown",
                "/api/grader/reliability", "/api/integrity",
            )},
        })

    @app.get("/api/integrity")
    async def integrity():
        errors = verify_manifest(settings.root) + verify_attempt_hashes(settings.root)
        return jsonify({"ok": not errors, "errors": errors})

    @app.get("/api/tasks")
    async def tasks():
        page, per_page = _page_args()
        if page is None:
            return _problem(400, "Invalid pagination", "page must be >= 1 and per_page must be 1..100.")
        module = request.args.get("module")
        control = request.args.get("control")
        rows = _decode(_read_db(settings, "SELECT payload_json FROM tasks ORDER BY id"))
        if not rows:
            rows = [{key: value for key, value in task.items() if key != "_path"}
                    for task in load_tasks(settings.root / "tasks")]
        if module:
            rows = [row for row in rows if row.get("module") == module.upper()]
        if control in {"true", "false"}:
            rows = [row for row in rows if bool(row.get("control")) == (control == "true")]
        start = (page - 1) * per_page
        return jsonify({"tasks": rows[start:start + per_page], "page": page,
                        "per_page": per_page, "total": len(rows)})

    @app.get("/api/tasks/<task_id>")
    async def task_detail(task_id: str):
        rows = _decode(_read_db(settings, "SELECT payload_json FROM tasks WHERE id=?", (task_id,)))
        if rows:
            return jsonify(rows[0])
        path = settings.root / "tasks" / f"{task_id}.json"
        if path.exists():
            return jsonify(json.loads(path.read_text(encoding="utf-8")))
        return _problem(404, "Task not found", f"No task exists with id {task_id}.")

    @app.get("/api/models")
    async def models():
        return jsonify({"models": _decode(_read_db(settings, "SELECT payload_json FROM models ORDER BY id"))})

    @app.get("/api/runs")
    async def runs():
        return jsonify({"runs": _decode(_read_db(settings, "SELECT payload_json FROM runs ORDER BY id DESC"))})

    @app.get("/api/results/summary")
    async def summary():
        rows = _decode(_read_db(settings, "SELECT payload_json FROM summaries ORDER BY run_id DESC LIMIT 1"))
        if rows:
            return jsonify(rows[0])
        path = settings.root / "results" / "summary.json"
        return jsonify(json.loads(path.read_text(encoding="utf-8")) if path.exists() else {})

    @app.get("/api/results/attempts")
    async def attempts():
        page, per_page = _page_args()
        if page is None:
            return _problem(400, "Invalid pagination", "page must be >= 1 and per_page must be 1..100.")
        rows = _decode(_read_db(settings, "SELECT payload_json FROM grades ORDER BY attempt_key"))
        start = (page - 1) * per_page
        return jsonify({"attempts": rows[start:start + per_page], "page": page,
                        "per_page": per_page, "total": len(rows)})

    @app.get("/api/results/attempts/<attempt_key>")
    async def attempt_detail(attempt_key: str):
        rows = _decode(_read_db(
            settings, "SELECT payload_json FROM attempts WHERE attempt_key=?",
            (attempt_key,),
        ))
        if not rows:
            return _problem(404, "Attempt not found", "No attempt exists with that key.")
        return jsonify(rows[0])

    @app.get("/api/failures")
    async def failure_rows():
        return jsonify({"failures": _decode(_read_db(
            settings, "SELECT payload_json FROM failure_tags ORDER BY id"
        ))})

    @app.get("/api/failures/breakdown")
    async def failures():
        rows = _read_db(settings, "SELECT tag, COUNT(*) AS count FROM failure_tags GROUP BY tag ORDER BY tag")
        return jsonify({"total": sum(row["count"] for row in rows), "by_reason": {row["tag"]: row["count"] for row in rows},
                        "human_review": {"status": "not_requested", "reviewed": False}})

    @app.get("/api/grader/reliability")
    async def reliability():
        return jsonify({"method": "deterministic-certificate-v2", "human_review": False,
                        "note": "No human calibration labels are available."})

    @app.get("/")
    async def index():
        target = settings.frontend_dir / "index.html"
        return await send_file(target) if target.exists() else _problem(404, "Frontend missing", "No frontend build is available.")

    @app.get("/<path:asset_path>")
    async def frontend_asset(asset_path: str):
        """Serve the Vite bundle while keeping API paths handled above."""
        frontend_dir = settings.frontend_dir.resolve()
        target = (frontend_dir / asset_path).resolve()
        if not target.is_relative_to(frontend_dir) or not target.is_file():
            return _problem(404, "Asset not found", "The requested frontend asset does not exist.")
        return await send_file(target)

    return app


def create_server(host="127.0.0.1", port=5000):
    """Compatibility entry point; the Quart app is the supported server."""
    return create_app()
