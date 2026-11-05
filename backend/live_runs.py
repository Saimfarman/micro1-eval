from __future__ import annotations

import json
import re
import sqlite3
from datetime import datetime, timezone
from pathlib import Path
from typing import Iterable

EVENT_VERSION = "1"
EVENT_TYPES = frozenset(
    {
        "run-created",
        "queued",
        "started",
        "progress",
        "attempt-completed",
        "quota-paused",
        "failed",
        "cancelled",
        "finished",
    }
)
_SECRET = re.compile(r"(key|secret|token|authorization|password|prompt)", re.I)


def _redact(value: object, key: str = "") -> object:
    if _SECRET.search(key):
        return "[REDACTED]"
    if isinstance(value, dict):
        return {name: _redact(item, name) for name, item in value.items()}
    if isinstance(value, list):
        return [_redact(item) for item in value]
    return value


def event_payload(run_id: str, event_type: str, payload: dict | None = None) -> dict:
    if event_type not in EVENT_TYPES:
        raise ValueError(f"unsupported live-run event type: {event_type}")
    return {
        "version": EVENT_VERSION,
        "run_id": run_id,
        "type": event_type,
        "payload": _redact(payload or {}),
        "created_at": datetime.now(timezone.utc).isoformat(),
    }


def append_event(
    connection: sqlite3.Connection,
    run_id: str,
    event_type: str,
    payload: dict | None = None,
    limit: int = 1000,
) -> int:
    event = event_payload(run_id, event_type, payload)
    row = connection.execute(
        "SELECT COALESCE(MAX(sequence), 0) + 1 FROM live_run_events WHERE run_id=?",
        (run_id,),
    ).fetchone()
    sequence = int(row[0])
    connection.execute(
        "INSERT INTO live_run_events(run_id, sequence, event_type, event_json, created_at) "
        "VALUES (?, ?, ?, ?, ?)",
        (
            run_id,
            sequence,
            event_type,
            json.dumps(event, sort_keys=True),
            event["created_at"],
        ),
    )
    connection.execute(
        "DELETE FROM live_run_events WHERE run_id=? AND sequence <= "
        "(SELECT MAX(sequence) - ? FROM live_run_events WHERE run_id=?)",
        (run_id, limit, run_id),
    )
    connection.commit()
    return sequence


def read_events(
    connection: sqlite3.Connection, run_id: str, after: int = 0, limit: int = 1000
) -> list[tuple[int, dict]]:
    rows = connection.execute(
        "SELECT sequence, event_json FROM live_run_events "
        "WHERE run_id=? AND sequence>? ORDER BY sequence LIMIT ?",
        (run_id, after, limit),
    ).fetchall()
    return [(int(row[0]), json.loads(row[1])) for row in rows]
