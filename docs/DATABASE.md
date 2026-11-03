# SQLite derived index

The official evidence remains the task, attempt, grade, summary, and manifest
files. `results/index.sqlite3` is a rebuildable read-only index;
the database is ignored and is never a submission source.

`backend/db/schema.sql` is versioned at schema version 4. Numbered migrations
live in `backend/db/migrations/` and apply from an empty database or upgrade an
older projection. Ingest enables WAL and foreign keys, loads all valid runs,
tasks, models, providers, attempts, grades, failures, summaries, manifests,
and live-run events, and records the manifest hash. Repeating ingest with the
same manifest is a no-op. A changed manifest rebuilds the index, while
tampered attempts or stale task snapshots are rejected before any rows are
committed.

Use `python -m evalkit ingest` after producing verified evidence. The command
does not call providers and does not invent partial grades or missing attempts.
Back up `tasks/` and `results/`; the ignored SQLite file can always be deleted
and rebuilt.
