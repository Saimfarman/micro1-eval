# Quart backend

The backend is created by `create_app(Settings)` in `backend/app.py` and is
started locally with:

```powershell
python -m evalkit ingest
python -m backend.serve
```

By default it listens on `127.0.0.1:5000`. Quart serves both the `/api/*`
endpoints and the built dashboard from `frontend/dist`. Build that static
bundle with `npm run build`. During frontend development, Vite can serve the
source UI and proxy `/api` to the backend.

The API reads the SQLite projection for run and result data. Task listing can
fall back to the authoritative `tasks/*.json` files when no indexed task rows
are available. Rebuild the projection with `python -m evalkit ingest`.

The API includes health, metadata, OpenAPI, integrity, task and module data,
models, providers, runs, summaries, attempts, failures, grader reliability,
manifests, and migration-version endpoints. Live-run create/cancel/SSE
operations are disabled by default and require explicit server configuration.
Errors use JSON problem responses; responses also receive request IDs and
security/cache headers. Provider credentials remain server-side and must not
be returned to browser clients.

See [API.md](API.md) for routes and payload contracts and [OPERATIONS.md](OPERATIONS.md)
for local run instructions.
