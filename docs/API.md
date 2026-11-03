# API and SSE contract

The Quart service is offline by default and reads the derived SQLite projection.
Start it with `python -m backend.serve` after `python -m evalkit ingest`.

## Read endpoints

`GET /api/health`, `/api/meta`, `/api/openapi.json`, `/api/integrity`,
`/api/modules`, `/api/models`, `/api/providers`, `/api/runs`,
`/api/manifests`, `/api/migrations`, `/api/results/summary`,
`/api/failures`, `/api/failures/breakdown`, and
`/api/grader/reliability` expose metadata and evidence projections.

`GET /api/tasks` and `/api/results/attempts` accept `page` and `per_page`
(`1..100`). Task browsing also accepts `module` and `control`. Invalid input,
missing resources, and disabled operations return `application/json` problem
objects with `type`, `title`, `status`, and `detail`.

## Live runs and SSE

`POST /api/runs` and `POST /api/runs/{id}/cancel` are disabled unless the
server is created with `Settings(live_runs_enabled=True)`. If a bearer token
is configured, it is required on both operations and on event reads.

`GET /api/runs/{id}/events` returns `text/event-stream`. Events use version `1`
and the types `run-created`, `queued`, `started`, `progress`,
`attempt-completed`, `quota-paused`, `failed`, `cancelled`, and `finished`.
Each event has a monotonically increasing per-run `id` sequence. Clients may
send `Last-Event-ID` or `after` to replay events. Heartbeats are comment
frames. Event payloads redact keys, secrets, tokens, authorization,
passwords, and prompts.

The browser never receives provider credentials. Live calls remain an
owner-only operation and are not exercised by the offline test suite.
