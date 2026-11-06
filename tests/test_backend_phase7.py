import asyncio
import json
from pathlib import Path

from backend.app import Settings, create_app
from backend.db.ingest import ingest
from evalkit.runner import run


def _app(tmp_path: Path):
    (tmp_path / "tasks").mkdir()
    source = Path("tasks/T01.json")
    (tmp_path / "tasks" / source.name).write_bytes(source.read_bytes())
    run(tmp_path, provider="mock", run_id="api-test")
    ingest(tmp_path)
    return create_app(Settings(tmp_path))


def test_quart_api_contract_and_security_headers(tmp_path):
    app = _app(tmp_path)

    async def check():
        client = app.test_client()
        response = await client.get("/api/health")
        assert response.status_code == 200
        assert (await response.get_json())["status"] == "ok"
        assert response.headers["X-Content-Type-Options"] == "nosniff"
        tasks = await client.get("/api/tasks?module=M1&page=1&per_page=1")
        payload = await tasks.get_json()
        assert tasks.status_code == 200
        assert payload["total"] == 1
        openapi = await client.get("/api/openapi.json")
        assert openapi.status_code == 200
        assert "/api/tasks" in (await openapi.get_json())["paths"]

    asyncio.run(check())


def test_quart_api_rejects_bad_pagination_and_missing_task(tmp_path):
    app = _app(tmp_path)

    async def check():
        client = app.test_client()
        bad = await client.get("/api/tasks?per_page=101")
        assert bad.status_code == 400
        assert (await bad.get_json())["type"] == "about:blank"
        missing = await client.get("/api/tasks/NOPE")
        assert missing.status_code == 404
        assert (await missing.get_json())["title"] == "Task not found"

    asyncio.run(check())


def test_grader_reliability_omits_removed_human_review_card_fields(tmp_path):
    app = _app(tmp_path)

    async def check():
        response = await app.test_client().get("/api/grader/reliability")
        payload = await response.get_json()
        assert response.status_code == 200
        assert "human_review" not in payload
        assert "note" not in payload

    asyncio.run(check())
