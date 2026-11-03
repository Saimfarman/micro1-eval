import asyncio
import json
import sqlite3
from pathlib import Path

from backend.app import Settings, create_app
from backend.db.ingest import ingest
from backend.live_runs import append_event, event_payload
from evalkit.manifest import write_manifest


def test_live_events_are_versioned_ordered_bounded_and_redacted(tmp_path):
    database = tmp_path / "events.sqlite3"
    connection = sqlite3.connect(database)
    connection.executescript((Path("backend/db/schema.sql")).read_text(encoding="utf-8"))
    connection.execute("INSERT INTO providers VALUES ('mock', '{}')")
    connection.execute("INSERT INTO runs VALUES ('r1', 'mock', '{}')")
    assert event_payload("r1", "started", {"api_key": "do-not-leak"})["payload"]["api_key"] == "[REDACTED]"
    for index in range(3):
        append_event(connection, "r1", "progress", {"step": index}, limit=2)
    rows = connection.execute("SELECT sequence FROM live_run_events ORDER BY sequence").fetchall()
    assert [row[0] for row in rows] == [2, 3]
    connection.close()


def test_live_sse_is_explicitly_disabled_by_default(tmp_path):
    (tmp_path / "tasks").mkdir()
    source = Path("tasks/T01.json")
    (tmp_path / "tasks" / source.name).write_bytes(source.read_bytes())
    write_manifest(tmp_path)
    ingest(tmp_path)
    app = create_app(Settings(tmp_path))

    async def check():
        response = await app.test_client().get("/api/runs/r1/events")
        assert response.status_code == 403
        assert (await response.get_json())["title"] == "Live runs disabled"

    asyncio.run(check())
