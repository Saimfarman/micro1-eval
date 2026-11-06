# API and SSE contract

The local Quart service is started with:

```powershell
python -m evalkit ingest
python -m backend.serve
```

It listens on `http://127.0.0.1:5000` by default. See
[BACKEND.md](BACKEND.md) and [OPERATIONS.md](OPERATIONS.md).

## Read endpoints

- `GET /api/health`, `/api/meta`, `/api/openapi.json`, `/api/integrity`
- `GET /api/tasks` and `/api/tasks/{task_id}`
- `GET /api/modules`, `/api/models`, `/api/providers`, `/api/manifests`,
  `/api/migrations`
- `GET /api/runs`
- `GET /api/results/summary`, `/api/results/attempts`,
  `/api/results/attempts/{attempt_key}`, `/api/results/attempt?key=...`
- `GET /api/failures`, `/api/failures/breakdown`,
  `/api/grader/reliability`

`/api/meta` reports the implemented modules M1–M5. `/api/migrations` reports
the indexed schema version (currently 5 when the projection has been ingested).
The SQLite database is a derived view of local evidence.

`/api/tasks` accepts `page`, `per_page` (1–100), `module`, and `control`.
`/api/results/attempts` accepts `page` and `per_page`. Invalid pagination and
missing resources return `application/json` problem objects with `type`,
`title`, `status`, and `detail`.

## Live runs and server-sent events

- `POST /api/runs`
- `POST /api/runs/{run_id}/cancel`
- `GET /api/runs/{run_id}/events`

These operations are disabled unless the application is created with
`Settings(live_runs_enabled=True)`. A configured server token gate must also be
satisfied. Enabling these endpoints is an operator decision; it does not by
itself execute a model evaluation.

The SSE endpoint returns `text/event-stream`. Events are versioned, ordered
within a run, and support replay using `Last-Event-ID` or the `after` query
parameter. Event payload redaction is handled by `backend/live_runs.py`.
Provider credentials must never be exposed in API responses or frontend code.
