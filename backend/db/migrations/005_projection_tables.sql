CREATE TABLE IF NOT EXISTS modules (
    id TEXT PRIMARY KEY,
    description TEXT NOT NULL,
    payload_json TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS providers (
    id TEXT PRIMARY KEY,
    payload_json TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS manifests (
    digest TEXT PRIMARY KEY,
    source_path TEXT NOT NULL,
    payload_json TEXT NOT NULL
);
PRAGMA user_version = 5;
