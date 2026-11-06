# Operations runbook

## Local offline setup

From the repository root in PowerShell:

```powershell
py -3.12 -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt -r requirements-dev.txt
npm ci
python -m pytest
npm run typecheck
npm run build
npm run accessibility
python -m evalkit validate-tasks
python -m evalkit preflight
python -m evalkit ingest
python -m backend.serve
```

Open `http://127.0.0.1:5000`. The default evaluation provider is the offline
mock. `verify`, `replay`, `report`, `reproduce`, `preflight`, and `ingest` do
not make model calls.

For frontend development, leave the backend running and use another terminal:

```powershell
npm exec vite -- --host 127.0.0.1
```

Open `http://127.0.0.1:5173`; Vite proxies `/api` requests to port 5000.

## Live-run approval

Live provider calls are optional and can incur cost. Before one is run, obtain
explicit owner approval, review `python -m evalkit estimate`, verify the exact
provider/model and its configured limits, and set a spend cap where
appropriate. Store credentials only in the local git-ignored `.env`; do not
place values in logs, tasks, results, manifests, frontend assets, or API
responses. Web live-run features are disabled by default.

## Quotas, retries, and resume

The runner enforces configured request/token quotas and optional spend caps.
Retryable transport, rate-limit, and server errors use bounded retries; a
quota pause records resumable state. Use the same `--run-id` to resume saved
work. Do not retry by overwriting immutable attempt files.

## Database and recovery

SQLite is a disposable projection. Back up `tasks/`, `results/` evidence,
`models.yaml`, and dependency manifests. Rebuild the index with
`python -m evalkit ingest`; migrations apply automatically. Do not edit
`results/index.sqlite3` as evidence.

If integrity checks fail, preserve the source files, run
`python -m evalkit verify`, and investigate the reported manifest/hash error
before rebuilding.

## Logs and incidents

Responses include request IDs. Record the request ID, command, run ID, provider
response ID, and redacted error only when needed. Never log credentials,
authorization headers, or key values. Preserve source evidence and run
offline verification before attempting recovery.
