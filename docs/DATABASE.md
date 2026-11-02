# SQLite derived index

The official evidence remains the task, attempt, grade, summary, and manifest
files. Phase 6 adds `results/index.sqlite3` as a rebuildable read-only index;
the database is ignored and is never a submission source.

`backend/db/schema.sql` is versioned at schema version 1. Ingest enables WAL and
foreign keys, loads tasks/models/latest-run attempts/grades/failures/summaries,
and records the manifest hash. Repeating ingest with the same manifest is a
no-op. A changed manifest rebuilds the index, while tampered attempts or stale
task snapshots are rejected before any rows are committed.

Use `python -m evalkit ingest` after producing verified evidence. The command
does not call providers and does not invent partial grades or missing attempts.
