# Transaction History Evaluation

An offline-first benchmark for evaluating whether AI models can reason about
database transaction histories. It includes a formal domain core, oracle-derived
tasks, a reproducible evaluation and grading harness, a Quart API, a rebuildable
SQLite projection, and a React dashboard.

The supported modules are:

- **M1 — Snapshot isolation**
- **M2 — Serializability**
- **M3 — In-doubt transactions**
- **M4 — Register linearizability**
- **M5 — Strict serializability**

The project tests rule application and certificates on synthetic histories. It
does not claim to measure database performance, vendor configuration, predicate
reads, or complete distributed protocols.

## GitHub repository

[Saimfarman/micro1-eval](https://github.com/Saimfarman/micro1-eval)

## Project video

Video walkthrough: not available yet. Add the published video URL here when it
is ready.

## What is included

- Independent checker paths where supported: O1 reference, O2 rules, and O3
  constraint solving for M1–M4; M5 has its own reference, rules, and
  constraint-checker implementations.
- Frozen and generated tasks whose expected answers are derived from checker
  code, never hand-written.
- A CLI for validation, mock/live evaluation, grading, replay, reports,
  integrity checks, reproduction, and SQLite ingest.
- A local Quart API and dashboard pages for overview, modules, tasks, results,
  failures, providers, runs, grading, methodology, reproduction, settings, and
  accessibility.
- Three.js task/failure visualization with 2D and table alternatives.

The bundled `mock` provider is a deterministic pipeline fixture, not a
commercial-model result. Live providers are optional, make external requests,
and may incur cost. Do not select one unless you intentionally approve a live
run and have configured local credentials.

## Requirements

- Python 3.12 or newer
- Node.js 22 or newer and npm
- Windows PowerShell examples below; the Python and npm commands also work on
  other supported platforms with equivalent activation syntax

## Run the application

Run these commands from the repository root in **PowerShell**.

### 1. Install dependencies

```powershell
py -3.12 -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt -r requirements-dev.txt
npm ci
```

If PowerShell blocks virtual-environment activation, use the venv interpreter
directly instead:

```powershell
.\.venv\Scripts\python.exe -m pip install -r requirements.txt -r requirements-dev.txt
```

### 2. Validate and build the frontend

```powershell
python -m evalkit validate-tasks
npm run typecheck
npm run build
```

### 3. Build the local results index

```powershell
python -m evalkit ingest
```

Ingest validates local evidence and builds or updates `results/index.sqlite3`.
It does not call a model provider. The SQLite database is derived and can be
rebuilt; task and result files remain the evidence source.

### 4. Start the backend and dashboard

In the first PowerShell terminal:

```powershell
.\.venv\Scripts\Activate.ps1
python -m backend.serve
```

Open [http://127.0.0.1:5000](http://127.0.0.1:5000). Quart serves both the API
and the built dashboard. To access the API health response, open
[http://127.0.0.1:5000/api/health](http://127.0.0.1:5000/api/health).

For frontend development with Vite, keep the backend running in the first
terminal and run this in a second one:

```powershell
npm exec vite -- --host 127.0.0.1
```

Then open [http://127.0.0.1:5173](http://127.0.0.1:5173). Vite proxies `/api`
requests to the backend on port 5000. The regular production-style workflow is
`npm run build` followed by the Quart server.

## Common evaluation commands

These commands use only local data unless a live provider is explicitly
selected:

```powershell
python -m evalkit preflight
python -m evalkit run
python -m evalkit verify
python -m evalkit replay
python -m evalkit report
python -m evalkit reproduce
```

`python -m evalkit run` defaults to the offline `mock` provider. Selecting
`groq`, `gemini`, `openrouter`, `mistral`, or `azure-openai` can make external
requests and incur cost. Provider credentials belong only in the local,
git-ignored `.env`; see [.env.example](.env.example) for variable names.
Never put credentials in source files or the browser.

## Repository map

- `evalkit/domain/` — history parsers and M1–M5 checking logic
- `evalkit/` — task generation, providers, runner, grading, scoring, manifests,
  replay, reports, and CLI
- `tasks/` — frozen oracle-derived task records
- `results/` — run evidence, reports, and manifests; SQLite is a derived index
- `backend/` — Quart API, static serving, schema, ingest, and migrations
- `frontend/src/` — React, TypeScript, and Three.js dashboard
- `frontend/dist/` — built frontend assets served by Quart
- `docs/` — current architecture, domain, API, operations, and evidence
  documentation

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the architecture diagram,
[docs/MODELS.md](docs/MODELS.md) for the formal rules, and
[docs/API.md](docs/API.md) for HTTP and event-stream contracts.

## Results and limitations

The checked-in mock run demonstrates the pipeline only. It is not a measured
commercial-model result. No human review or human-confirmed failure labels are
claimed. Any reported live study must be based on actual saved run evidence and
record its model, provider, configuration, date, and artifact hashes.

See [docs/RELEASE.md](docs/RELEASE.md),
[docs/OPERATIONS.md](docs/OPERATIONS.md), and
[docs/DISCLOSURES.md](docs/DISCLOSURES.md) for release, operation, and
authorship/evidence notes.
