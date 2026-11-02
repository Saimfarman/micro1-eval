PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS schema_meta (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS tasks (
    id TEXT PRIMARY KEY,
    module TEXT NOT NULL,
    control INTEGER NOT NULL,
    status TEXT NOT NULL,
    expected_verdict TEXT NOT NULL,
    canonical_hash TEXT NOT NULL UNIQUE,
    payload_json TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS models (
    id TEXT PRIMARY KEY,
    provider TEXT NOT NULL,
    payload_json TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS runs (
    id TEXT PRIMARY KEY,
    provider TEXT NOT NULL,
    payload_json TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS attempts (
    attempt_key TEXT PRIMARY KEY,
    run_id TEXT NOT NULL REFERENCES runs(id) ON DELETE CASCADE,
    task_id TEXT NOT NULL REFERENCES tasks(id),
    content_sha256 TEXT NOT NULL,
    payload_json TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS grades (
    attempt_key TEXT PRIMARY KEY REFERENCES attempts(attempt_key) ON DELETE CASCADE,
    passed INTEGER NOT NULL,
    score REAL NOT NULL,
    payload_json TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS failure_tags (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    attempt_key TEXT NOT NULL REFERENCES attempts(attempt_key) ON DELETE CASCADE,
    tag TEXT NOT NULL,
    payload_json TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS calibration (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    label TEXT NOT NULL,
    payload_json TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS summaries (
    run_id TEXT PRIMARY KEY REFERENCES runs(id) ON DELETE CASCADE,
    payload_json TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_attempts_task ON attempts(task_id);
CREATE INDEX IF NOT EXISTS idx_grades_passed ON grades(passed);
CREATE INDEX IF NOT EXISTS idx_failures_tag ON failure_tags(tag);
