import asyncio
import sqlite3
from pathlib import Path

from backend.app import Settings, create_app
from backend.db.ingest import ingest
from backend.db.migrate import migrate
from evalkit.manifest import write_manifest


def test_empty_database_migrations_create_projection(tmp_path):
    database = tmp_path / "projection.sqlite3"
    connection = sqlite3.connect(database)
    assert migrate(connection) == 4
    tables = {
        row[0] for row in connection.execute(
            "SELECT name FROM sqlite_master WHERE type='table'"
        )
    }
    assert {"modules", "providers", "manifests", "live_run_events"} <= tables
    connection.close()


def test_api_exposes_projection_contract_and_live_gate(tmp_path):
    tasks = tmp_path / "tasks"
    tasks.mkdir()
    source = Path("tasks/T01.json")
    (tasks / source.name).write_bytes(source.read_bytes())
    write_manifest(tmp_path)
    ingest(tmp_path)
    app = create_app(Settings(tmp_path))

    async def check():
        client = app.test_client()
        assert (await client.get("/api/modules")).status_code == 200
        assert (await client.get("/api/providers")).status_code == 200
        migrations = await client.get("/api/migrations")
        assert (await migrations.get_json())["schema_version"] == 4
        live = await client.post("/api/runs", json={"provider": "mock"})
        assert live.status_code == 403
        assert live.headers["X-Request-ID"]

    asyncio.run(check())
