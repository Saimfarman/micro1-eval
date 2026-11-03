# Architecture

`evalkit` is the offline source of truth. Task files, raw attempts, grades and
`results/MANIFEST.json` are plain files and can be audited without a database or
API key. Quart exposes a derived SQLite projection, and React/Vite/TypeScript
provides the offline dashboard with optional Three.js enhancement. SQLite is
versioned, rebuildable, and never the official source of evidence.

The projection is schema version 4. Migrations live in `backend/db/migrations/`;
ingest rejects missing, stale, or tampered evidence before replacing the
projection. Provider credentials remain server-side and are never placed in
tasks, raw records, API responses, SSE events, or frontend assets.

The dashboard must use semantic HTML and provide a 2D and table/text
equivalent for every visual summary. The browser never receives provider keys.
