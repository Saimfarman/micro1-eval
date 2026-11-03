CREATE INDEX IF NOT EXISTS idx_tasks_module ON tasks(module);
CREATE INDEX IF NOT EXISTS idx_attempts_run ON attempts(run_id);
PRAGMA user_version = 3;
