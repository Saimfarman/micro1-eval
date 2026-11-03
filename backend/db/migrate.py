from __future__ import annotations

import sqlite3
from contextlib import contextmanager
from pathlib import Path

LATEST_VERSION = 5


@contextmanager
def migration_lock(database: Path):
    lock = database.with_suffix(database.suffix + ".migrate.lock")
    lock.parent.mkdir(parents=True, exist_ok=True)
    handle = lock.open("a+", encoding="utf-8")
    try:
        yield
    finally:
        handle.close()


def migrate(connection: sqlite3.Connection, migrations_dir: Path | None = None) -> int:
    migrations_dir = migrations_dir or Path(__file__).with_name("migrations")
    connection.execute("PRAGMA foreign_keys=ON")
    current = int(connection.execute("PRAGMA user_version").fetchone()[0])
    if current == 0 and connection.execute(
        "SELECT 1 FROM sqlite_master WHERE type='table' AND name='runs'"
    ).fetchone() is None:
        schema = migrations_dir.parent / "schema.sql"
        connection.executescript(schema.read_text(encoding="utf-8"))
        connection.execute(f"PRAGMA user_version = {LATEST_VERSION}")
        return LATEST_VERSION
    scripts = sorted(migrations_dir.glob("[0-9][0-9][0-9]_*.sql"))
    for script in scripts:
        version = int(script.name[:3])
        if version <= current:
            continue
        connection.executescript(script.read_text(encoding="utf-8"))
        current = version
    return current
