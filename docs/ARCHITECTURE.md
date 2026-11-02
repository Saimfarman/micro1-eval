# Architecture

`evalkit` is the offline source of truth. Task files, raw attempts, grades and
`results/MANIFEST.json` are plain files and can be audited without a database or
API key. `backend` exposes read-only JSON and serves the static dashboard. The
dashboard uses semantic HTML and always provides a table/text equivalent for
visual summaries. SQLite is intentionally not required for reproduction.
