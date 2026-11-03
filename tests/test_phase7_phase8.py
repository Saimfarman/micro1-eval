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
    assert migrate(connection) == 5
    tables = {
        row[0] for row in connection.execute(
            "SELECT name FROM sqlite_master WHERE type='table'"
        )
    }
    assert {"modules", "providers", "manifests", "live_run_events"} <= tables
    connection.close()


def test_versioned_legacy_database_gets_projection_tables(tmp_path):
    database = tmp_path / "legacy.sqlite3"
    connection = sqlite3.connect(database)
    connection.executescript((Path("backend/db/schema.sql")).read_text(encoding="utf-8"))
    connection.executescript(
        """
        DROP TABLE modules;
        DROP TABLE providers;
        DROP TABLE manifests;
        PRAGMA user_version = 4;
        """
    )
    assert migrate(connection) == 5
    tables = {
        row[0] for row in connection.execute(
            "SELECT name FROM sqlite_master WHERE type='table'"
        )
    }
    assert {"modules", "providers", "manifests"} <= tables
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
        modules = await client.get("/api/modules")
        providers = await client.get("/api/providers")
        manifests = await client.get("/api/manifests")
        assert modules.status_code == providers.status_code == manifests.status_code == 200
        assert [row["id"] for row in (await modules.get_json())["modules"]] == ["M1"]
        assert (await providers.get_json())["providers"][0]["id"] == "mock"
        assert (await manifests.get_json())["manifests"]
        meta = await client.get("/api/meta")
        assert (await meta.get_json())["modules"] == ["M1", "M2", "M3", "M4", "M5"]
        migrations = await client.get("/api/migrations")
        assert (await migrations.get_json())["schema_version"] == 5
        live = await client.post("/api/runs", json={"provider": "mock"})
        assert live.status_code == 403
        assert live.headers["X-Request-ID"]

    asyncio.run(check())


def test_ingest_projection_is_idempotent(tmp_path):
    tasks = tmp_path / "tasks"
    tasks.mkdir()
    source = Path("tasks/T01.json")
    (tasks / source.name).write_bytes(source.read_bytes())
    write_manifest(tmp_path)

    first = ingest(tmp_path)
    second = ingest(tmp_path)

    assert first["status"] == "rebuilt"
    assert second["status"] == "unchanged"
    connection = sqlite3.connect(tmp_path / "results" / "index.sqlite3")
    counts = {
        table: connection.execute(f"SELECT COUNT(*) FROM {table}").fetchone()[0]
        for table in ("modules", "providers", "manifests")
    }
    connection.close()
    assert counts == {"modules": 1, "providers": 1, "manifests": 1}
