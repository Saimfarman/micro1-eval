from __future__ import annotations

import json
import mimetypes
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlparse

ROOT = Path(__file__).resolve().parent.parent


def payload() -> dict:
    tasks = []
    for path in sorted((ROOT / "tasks").glob("*.json")):
        task = json.loads(path.read_text(encoding="utf-8"))
        task.pop("prompt", None)
        tasks.append(task)
    return {"tasks": tasks, "integrity": (ROOT / "results" / "MANIFEST.json").exists()}


def latest_run() -> Path | None:
    runs = sorted((ROOT / "results" / "runs").glob("*"))
    return runs[-1] if runs else None


def grades() -> list[dict]:
    run = latest_run()
    if not run or not (run / "grades.jsonl").exists():
        return []
    return [json.loads(line) for line in (run / "grades.jsonl").read_text(encoding="utf-8").splitlines()]


class Handler(BaseHTTPRequestHandler):
    def do_GET(self):
        parsed = urlparse(self.path)
        if parsed.path == "/api/health":
            body = {"status": "ok"}
            self.send_json(body)
            return
        if parsed.path in {"/api/overview", "/api/tasks"}:
            data = payload()
            self.send_json(data if parsed.path.endswith("overview") else {"tasks": data["tasks"]})
            return
        if parsed.path == "/api/integrity":
            from evalkit.manifest import verify_manifest
            errors = verify_manifest(ROOT)
            self.send_json({"ok": not errors, "errors": errors})
            return
        if parsed.path == "/api/meta":
            self.send_json({"title": "Transaction History Reasoning Eval",
                            "domain": "computer-science", "modules": ["M1", "M2", "M3"],
                            "integrity": (ROOT / "results" / "MANIFEST.json").exists()})
            return
        if parsed.path == "/api/models":
            self.send_json({"models": [{"id": "mock", "provider": "mock", "display_name": "Deterministic mock"}]})
            return
        if parsed.path == "/api/runs":
            run = latest_run()
            self.send_json({"runs": [json.loads((run / "run.json").read_text(encoding="utf-8"))] if run else []})
            return
        if parsed.path == "/api/results/summary":
            summary = ROOT / "results" / "summary.json"
            self.send_json(json.loads(summary.read_text(encoding="utf-8")) if summary.exists() else {})
            return
        if parsed.path == "/api/results/attempts":
            self.send_json({"attempts": grades()})
            return
        if parsed.path == "/api/failures/breakdown":
            failed = [row for row in grades() if not row.get("passed")]
            self.send_json({"total": len(failed), "by_reason": {}})
            return
        if parsed.path == "/api/grader/reliability":
            self.send_json({"method": "deterministic-certificate", "human_review": False,
                            "note": "No human calibration labels are available."})
            return
        if parsed.path.startswith("/api/tasks/"):
            task_id = parsed.path.rsplit("/", 1)[-1]
            path = ROOT / "tasks" / f"{task_id}.json"
            if path.exists():
                self.send_json(json.loads(path.read_text(encoding="utf-8")))
                return
            self.send_json({"type": "about:blank", "title": "Task not found", "status": 404}, 404)
            return
        target = ROOT / "frontend" / "dist" / ("index.html" if parsed.path == "/" else parsed.path.lstrip("/"))
        if not target.is_file():
            target = ROOT / "frontend" / "dist" / "index.html"
        self.send_response(200)
        self.send_header("Content-Type", mimetypes.guess_type(str(target))[0] or "text/html")
        self.send_header("Content-Security-Policy", "default-src 'self'; style-src 'self'")
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("Referrer-Policy", "no-referrer")
        self.end_headers()
        self.wfile.write(target.read_bytes())

    def send_json(self, value, status=200):
        data = json.dumps(value).encode()
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def log_message(self, *_):
        return


def create_server(host="127.0.0.1", port=5000):
    return ThreadingHTTPServer((host, port), Handler)


if __name__ == "__main__":
    create_server().serve_forever()
