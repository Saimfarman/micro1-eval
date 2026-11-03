# Quart backend

The backend is a read-only Quart application created by `create_app(Settings)`.
It reads the manifest-verified SQLite index when available and falls back to
the authoritative task files for task browsing. Run `python -m evalkit ingest`
before serving indexed run data.

The API exposes health, metadata, OpenAPI, tasks and task detail, modules,
models, providers, runs, summaries, paginated attempts and attempt detail,
failures, grader reliability, manifests, migrations, integrity, and versioned
SSE event reads. Invalid pagination, missing resources, unauthorized live
requests, and disabled live runs return RFC-style `about:blank` problem
objects. Responses include request IDs, CSP, no-sniff, frame, referrer,
permissions, and cache headers. Provider credentials are never loaded into or
returned by the browser. Live-run creation and cancellation are disabled by
default and require an explicit server setting and optional bearer gate.
