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
            self.send_json({"ok": (ROOT / "results" / "MANIFEST.json").exists()})
            return
        if parsed.path.startswith("/api/tasks/"):
            task_id = parsed.path.rsplit("/", 1)[-1]
            for task in payload()["tasks"]:
                if task["id"] == task_id:
                    self.send_json(task)
                    return
            self.send_json({"type": "about:blank", "title": "Task not found", "status": 404})
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

    def send_json(self, value):
        data = json.dumps(value).encode()
        self.send_response(200)
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
