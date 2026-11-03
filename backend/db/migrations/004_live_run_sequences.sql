ALTER TABLE live_run_events ADD COLUMN sequence INTEGER NOT NULL DEFAULT 0;
UPDATE live_run_events SET sequence = id WHERE sequence = 0;
CREATE UNIQUE INDEX IF NOT EXISTS idx_events_run_sequence ON live_run_events(run_id, sequence);
PRAGMA user_version = 4;
