# Quart backend

The backend is a read-only Quart application created by `create_app(Settings)`.
It reads the manifest-verified SQLite index when available and falls back to
the authoritative task files for task browsing. Run `python -m evalkit ingest`
before serving indexed run data.

The API exposes health, metadata, OpenAPI, tasks and task detail, models, runs,
summary, paginated attempts and attempt detail, failure lists and breakdown,
grader reliability, and integrity endpoints. Invalid pagination and missing
resources return RFC-style `about:blank` problem objects. Responses include
CSP, no-sniff, referrer, permissions, and cache headers. Provider credentials
are never loaded into or returned by the web application.
