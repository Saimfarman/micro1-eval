# Architecture

`evalkit` is the offline source of truth. Task files, raw attempts, grades and
`results/MANIFEST.json` are plain files and can be audited without a database or
API key. The approved target architecture adds a Quart API over a derived
SQLite index and a component-based React/Vite/TypeScript frontend with
Three.js visualizations. SQLite remains rebuildable and is never the official
source of evidence.

The dashboard must use semantic HTML and provide a 2D and table/text
equivalent for every visual summary. The browser never receives provider keys.
