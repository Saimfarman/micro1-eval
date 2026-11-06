# SQLite derived index

`results/index.sqlite3` is a rebuildable projection for dashboard queries. It
is not authoritative evaluation evidence. Source tasks, raw attempts, grades,
reports, and `results/MANIFEST.json` remain files.

The current projection schema is version **5**. The baseline schema is in
`backend/db/schema.sql`; ordered migrations are in `backend/db/migrations/`.
They create and upgrade projection tables including modules, providers,
manifests, tasks, models, runs, attempts, grades, failure tags, summaries, and
live-run events.

Ingest with:

```powershell
python -m evalkit ingest
```

Ingest verifies the manifest and attempt/task hashes by default, applies
migrations, and projects the local files. Re-ingesting the same manifest is a
no-op. A changed manifest causes the projection to be rebuilt; invalid or
tampered source evidence is rejected. Ingest does not contact model providers
or invent missing rows.

The database uses SQLite WAL mode and foreign keys. Back up `tasks/`,
`results/` source files, `models.yaml`, and dependency manifests. The SQLite
file can be regenerated and should not be edited as evidence.
