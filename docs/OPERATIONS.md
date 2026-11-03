# Operations runbook

## Offline workflow

1. Use Python 3.12 and Node.js 22.
2. Run `npm ci` and `python -m pytest`.
3. Run `npm run typecheck`, `npm run build`, and `npm run accessibility`.
4. Run `python -m evalkit preflight`.
5. Run `python -m evalkit ingest`, then `python -m backend.serve`.

The default provider is `mock`; it needs no key or network. `verify`, `replay`,
`report`, and `reproduce` operate on local evidence only.

## Live-run approval

Live provider calls are optional. If used, they require explicit owner approval.
Copy `.env.example` to
`.env`, fill only the required local variables, set a dated model/provider
configuration, and review `python -m evalkit estimate` before running. Never
put keys in tasks, logs, manifests, commits, frontend assets, or API responses.
The web live-run gate is disabled by default.

## Quotas and pauses

Use `--spend-cap-usd` and the configured request/token limits. Transport, 429,
and 5xx failures may retry; wrong answers never retry. A quota pause writes
checkpoint state. Resume with the same `--run-id`; completed attempt keys and
immutable raw records are reused without duplicate requests.

## Database, backups, and recovery

SQLite is disposable. Back up `tasks/`, `results/`, `models.yaml`, and the
dependency lock files. Rebuild with `python -m evalkit ingest`; migrations are
applied automatically. Do not edit `results/index.sqlite3` as evidence.
If integrity fails, preserve the files, run `python -m evalkit verify`, and
investigate the named hash or manifest error before rebuilding.

## Logs and incidents

The service emits request IDs in responses. Save the request ID, command,
run ID, provider response ID, and redacted error message; never save headers,
keys, prompts, or raw provider credentials. Stop live runs, preserve the
source evidence, and run offline verification before attempting recovery.
