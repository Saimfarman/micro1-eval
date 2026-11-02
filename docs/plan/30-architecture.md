<!-- Architecture, repo layout, harness, database, backend. Section 0.1 and 0.6 override older dates and scope elsewhere. -->

## 7. Architecture and stack decisions

Three layers; each one is fully usable without the one above it.

1. **`evalkit`**** (Python package):** task loading, providers, runner, graders, statistics, manifest, verify, replay, preflight, packaging. CLI only, no web dependencies.
2. **Backend (Quart):** a read-mostly JSON API over the results, plus optional live-run endpoints. Imports `evalkit`. Also serves the prebuilt frontend, so the whole dashboard is one process.
3. **Frontend (React + Vite + three.js):** the dashboard.

**Source of truth:** task YAML files, raw attempt JSON, grade files and the manifest. **SQLite is a derived index** rebuilt idempotently from those files. This keeps the evidence plain, diffable and auditable, and lets the dashboard be fast.

### 7.1 Stack

- **Python 3.11 or newer** (pin in `.python-version`). Quart served by Hypercorn; `quart-schema` with pydantic v2 for validation and an OpenAPI document; `httpx` or the official provider SDKs behind a single `Provider` interface; `tenacity` for retries; `PyYAML` and `jsonschema`; `numpy` for the bootstrap; `aiosqlite`. Dev: `pytest`, `pytest-asyncio`, `pytest-cov`, `respx` (HTTP mocking), `ruff`, `mypy`.
- **Node LTS** (pin in `.nvmrc`). React, TypeScript, Vite, `react-router`, TanStack Query, `three` with `@react-three/fiber` and `@react-three/drei` (import only what is used), `d3-scale` and `d3-shape` (or `visx`) for SVG charts, `react-markdown` with `rehype-sanitize`, and an accessible primitives library (React Aria Components or Radix) for tabs, dialogs, tooltips and menus. Dev: Vitest, React Testing Library, `jest-axe`, Playwright with `@axe-core/playwright`, `eslint-plugin-jsx-a11y`, Lighthouse CI.
- **Database: SQLite** in WAL mode. Reasons: zero setup (judges need nothing installed), a single file, fully reproducible, more than fast enough for tens of thousands of rows. Postgres adds a service to install and would put the reproducibility gate at risk for no benefit. Record this in `docs/DECISIONS.md`.

## 8. Repository layout

```
/
├── README.md                  # the eight required sections, exact headings
├── LICENSE
├── .env.example               # key NAMES only, no values
├── .gitignore  .gitattributes  .editorconfig  .python-version  .nvmrc
├── requirements.txt           # pinned runtime deps (harness + backend)
├── requirements-dev.txt       # pytest, ruff, mypy, respx, ...
├── pyproject.toml             # tool config only (ruff, pytest, mypy)
├── Makefile                   # convenience wrapper, never the only way
├── eval.config.yaml           # domain title, categories, failure taxonomy, theme
├── models.yaml                # exact model IDs, settings, dated price table
├── tasks/                     # T01.yaml ... T10.yaml, C01.yaml ... (controls)
├── schema/                    # task.schema.json, attempt.schema.json
├── evalkit/
│   ├── cli.py  config.py  tasks.py  runner.py  scoring.py  stats.py
│   ├── providers/             # base.py, one file per provider, mock.py
│   ├── graders/               # exact, numeric, structured, executable, rubric, llm_judge
│   ├── manifest.py  verify.py  replay.py  estimate.py  preflight.py  package.py
│   └── prompts/               # system.txt, task_template.txt, judge_*.txt
├── calibration/               # labelled_responses.jsonl for grader reliability
├── results/
│   ├── runs/<run_id>/         # run.json, raw/<model>/<task>__<rep>.json, grades.jsonl, scores.json
│   ├── failure_tags.jsonl
│   ├── summary.json
│   └── MANIFEST.json         # SHA-256 of every file above
├── backend/
│   ├── app.py  config.py  serve.py
│   ├── api/                   # meta, tasks, results, failures, grader, live
│   ├── db/                    # schema.sql, ingest.py, repo.py
│   └── services/              # live_runs.py
├── frontend/
│   ├── package.json  vite.config.ts  tsconfig.json  index.html
│   ├── src/                   # app/, routes/, components/, three/, hooks/, api/, styles/, a11y/
│   ├── e2e/                   # Playwright specs
│   └── dist/                  # PREBUILT and included in the zip (no Node needed to view)
├── tests/                     # harness tests: unit/, integration/, graders/
├── docs/                      # METHODOLOGY, SCORING, DOMAIN, ARCHITECTURE, ACCESSIBILITY,
│                              # DECISIONS, DISCLOSURES, TASK_AUTHORING, VIDEO_SCRIPT
├── scripts/                   # small cross-platform Python helpers
└── .github/workflows/ci.yml
```

Exclude from the zip: `node_modules`, virtual environments, `.env`, the derived SQLite file, caches, coverage output, videos, and anything over a few MB. The `package` command (Section 15) enforces this with an allow-list.

## 9. The harness (`evalkit`)

### 9.1 CLI contract

Every command works without the web stack. Invoke as `python -m evalkit <command>`.

```
validate-tasks     schema + semantic checks on tasks/ (fails on placeholders)
estimate           expected API calls, tokens, cost and runtime for a run
run                call models, write raw attempts, grade, score (needs keys)
grade              (re)grade existing raw attempts
replay             re-score committed raw outputs offline, no keys
calibrate-grader   measure grader reliability against calibration/ labels
tag-failures       interactive helper to confirm failure tags
report             write summary.json and the Markdown tables for the README
verify             check manifest hashes, recompute scores, diff against stored
reproduce          verify + replay + report in one command, no keys needed
ingest             rebuild the SQLite index from files
preflight          check the submission against the brief (Section 15)
package            build the allow-listed, size-checked submission zip
```

### 9.2 Provider adapters

- One interface: an async `complete(request)` returning text, the model ID the API actually returned, finish reason, token usage, latency, provider response ID and the redacted request parameters.
- At least three real providers from different vendors, plus a `mock` provider that returns scripted outputs so the whole pipeline runs in CI without keys.
- Model IDs, settings and prices live in `models.yaml`. Look up current model IDs from each provider’s documentation on the day of the final run and record that date. Never trust an alias without recording what it resolved to.
- Concurrency via a semaphore, per-provider rate limits, timeouts, exponential backoff **only on transport errors, 429 and 5xx**. Never retry because an answer was wrong.
- Refusals, empty outputs and truncations are recorded as attempts, not discarded; they are data.
- Resumable: each attempt has an idempotent key (run, task, model, repetition), so an interrupted run continues without duplicating or overwriting.
- A spend cap (`MAX_SPEND_USD`) aborts the run when estimated plus actual cost would exceed it.

### 9.3 Raw attempt record

One JSON file per attempt, written before grading and never edited afterwards:

```
attempt_key: <run_id>/<model>/<task>/<rep>
task_id: T07
task_hash: <sha256 of task file>
prompt_sent: <exact text, including system prompt>
model_requested: <id from models.yaml>
model_returned: <id reported by the API>
settings: {temperature: 0, max_tokens: 4096, reasoning: <documented setting>}
response_text: <full text>
finish_reason: stop
usage: {input_tokens: 0, output_tokens: 0}
latency_ms: 0
provider_response_id: <id>
created_at: <UTC timestamp>
content_sha256: <hash of this record>
```

### 9.4 Reproducibility mechanics

- `run_id` combines the UTC timestamp with a short hash of task files, prompts and config.
- `MANIFEST.json` stores SHA-256 hashes of tasks, prompts, config, raw attempts, grades and scores.
- **`replay`** re-grades from the committed raw outputs offline. Deterministic graders must reproduce scores exactly. LLM-judge verdicts are cached in `grades.jsonl` and reused by default; a flag forces live re-judging.
- **`verify`** checks every hash, recomputes all scores and statistics from raw data, diffs them against the stored files and exits non-zero on any mismatch.
- **`reproduce`** = `verify` + `replay` + `report`. This is the one command a judge runs, and it needs no API keys.
- Be honest about live re-runs: provider APIs are not bit-deterministic even at temperature 0, so a fresh `run` yields “the same kind of results”, not identical text. Quantify this with your own run-to-run variance across the k repetitions and say so in the README.
- Bootstrap resampling uses a fixed, recorded seed.
- `estimate` multiplies tasks, models and runs by token estimates and the dated price table. Put both the estimate and the actual cost in README section 5.

### 9.5 Failure tagging

- Define the taxonomy in `eval.config.yaml` **before** looking at failures (for example: wrong rule applied, calculation error, missed constraint, hallucinated source, overconfident instead of abstaining, format violation, incomplete answer, refusal, other).
- Auto-suggest tags from failed criteria; the owner confirms every tag, stored with `source: human` in `failure_tags.jsonl`.
- Re-tag a random 20% sample a day later and report agreement with yourself.
- Pick three to five representative failures for the video and the README, quoted from raw output, each linked to its attempt ID.

## 10. Database (SQLite, derived)

- `aiosqlite`, WAL mode, foreign keys on, `schema.sql` versioned through `PRAGMA user_version`.
- `ingest` is idempotent. The backend runs it on start-up if the database is missing or its stored manifest hash differs from the files. Rebuilding takes about a second at this scale.
- Official results always come from files; live demo runs go to a separate directory and tables (Section 11).

```
tasks(id PK, version, type, control_of, category, difficulty, status, prompt,
      expected_json, grading_json, edge_cases_json, judgment_call,
      provenance_json, content_hash)
models(id PK, provider, model_requested, model_returned, display_name, settings_json)
runs(id PK, started_at, finished_at, config_hash, manifest_hash, notes)
attempts(id PK, run_id FK, task_id FK, model_id FK, rep, response_text,
         finish_reason, tokens_in, tokens_out, latency_ms, cost_usd,
         provider_response_id, raw_path, content_hash, created_at,
         UNIQUE(run_id, task_id, model_id, rep))
grades(attempt_id PK FK, score, passed, criteria_json, grader_method,
       judge_model, judge_rationale, graded_at)
failure_tags(attempt_id FK, tag, source, note, PRIMARY KEY(attempt_id, tag))
calibration_items(id PK, task_id, response_text, human_label, grader_label, note)
summaries(run_id, scope, scope_key, metric, value, ci_low, ci_high, n)
-- indexes: attempts(run_id, task_id), attempts(model_id), failure_tags(tag)
```

## 11. Backend (Quart)

### 11.1 Application rules

- App factory `create_app(settings)`; typed settings loaded from environment variables. `LIVE_RUNS_ENABLED` defaults to false.
- Open the database in `before_serving` and close it in `after_serving`. Handlers are async; no blocking calls on the event loop (run CPU-heavy work such as bootstrap in an executor, and cache its result).
- Validation and OpenAPI through `quart-schema`. Expose the OpenAPI JSON. Its bundled documentation pages may load assets from a CDN: disable them or self-host, to honour the offline rule.
- Security: strict `Content-Security-Policy` (default `self`, no inline scripts), `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`; CORS closed by default (the Vite dev server proxies `/api`); request size limits; rate limiting (`quart-rate-limiter`) on any POST; errors returned as `application/problem+json` (RFC 9457) with no stack traces.
- Static files: serve `frontend/dist` with an SPA fallback, long-lived caching for hashed assets, no-cache for `index.html`. ETags derived from the manifest hash for API responses.
- Structured JSON logging with request IDs. Never log keys or full prompts at info level.

### 11.2 Endpoints

```
GET  /api/health
GET  /api/meta                       title, domain, categories, taxonomy, run date, manifest hash
GET  /api/tasks?category=&type=&difficulty=
GET  /api/tasks/{id}                 prompt, expected answer, rubric, provenance
GET  /api/models
GET  /api/runs        GET /api/runs/{id}
GET  /api/results/summary            headline metrics with confidence intervals
GET  /api/results/matrix             task x model grid: score, pass rate, consistency
GET  /api/results/attempts?task=&model=&passed=&tag=&page=
GET  /api/attempts/{id}              raw output, per-criterion verdicts, rationale, tags
GET  /api/failures/breakdown?by=tag|model|category
GET  /api/grader/reliability         calibration metrics and confusion matrix
GET  /api/integrity                  live manifest verification status
POST /api/live/runs                  disabled unless enabled and keys present
GET  /api/live/runs/{id}/events      Server-Sent Events progress stream
```

### 11.3 Live runs (optional, clearly separated)

- Started as a background task with a single-run lock, a per-run spend cap and rate limiting; results written to `results/live/`, never mixed with the submitted results.
- The UI labels them “Live demo: not part of the submitted results” everywhere they appear. This protects the integrity check.
- The SSE endpoint is an async generator returning `text/event-stream` with `Cache-Control: no-cache`, a periodic heartbeat comment, and clean handling of client disconnects (cancellation).
- Keys are read only from the server environment. The UI never asks for or stores a key.
