# Transaction History Eval

## 1. Short description

This is an offline-first evaluation of model reasoning about database transaction
histories. It covers snapshot isolation (M1), serializability (M2), in-doubt
transactions (M3), linearizability (M4), and strict serializability (M5), with
independent reference, rules, and constraint checker paths where supported.
Raw evidence is immutable and the SQLite database is only a rebuildable projection.
The bundled mock run is a reproducibility fixture, not a commercial-model claim.

## 2. Video walkthrough link

Video: optional and not supplied yet. Add the final link here when available.
The walkthrough script is in [docs/VIDEO_SCRIPT.md](docs/VIDEO_SCRIPT.md).

## 3. Domain and expertise

The domain is computer science, specifically transaction-history consistency
definitions. Claims are limited to the explicit definitions in
[docs/MODELS.md](docs/MODELS.md) and the published vectors in
[docs/VECTORS.md](docs/VECTORS.md).

## 4. What it tests and why it matters

Tasks test whether a model can apply a formal rule to a concrete history and
provide a verdict. They do not measure performance, vendor configuration,
predicate reads, or full distributed protocols.

## 5. Setup and run instructions

Requires Python 3.12+, Node.js 22+, and npm. From the repository root:

```text
python -m evalkit validate-tasks
python -m evalkit preflight
python -m evalkit run
python -m evalkit reproduce
python -m evalkit ingest
npm ci
npm run typecheck
npm run build
python -m backend.serve
```

Run `python -m evalkit ingest` before serving indexed results, then open
`http://127.0.0.1:5000`. The mock path needs no API key or network. An
OpenAI-compatible live provider is opt-in through `.env` variables documented in
`.env.example`; do not commit secrets. Live runs are disabled in the web service
unless explicitly enabled in server settings.

## 6. Models tested and results

The included result is the deterministic `mock` provider fixture. Run
`python -m evalkit report` after a live run to regenerate statistics; no
commercial model result is fabricated here.

## 7. Failure analysis

The deterministic grader verifies certificates, not only verdict text. It records
wrong verdict, wrong certificate, calculation error, format violation,
incomplete answer, and refusal categories. Raw outputs are stored under
`results/runs/`; replay grades them without contacting a model. No human review
was available, so no human-confirmed failure analysis is claimed.

## 8. Prior work and sources

The formal definitions cite Berenson et al. (1995) and Adya (1999) in
[docs/MODELS.md](docs/MODELS.md). The domain core and vectors came in the
starter pack; the harness, backend, and dashboard around them are original
integration work. See [docs/DISCLOSURES.md](docs/DISCLOSURES.md).

## Limitations and threats to validity

The bundled mock provider is only a pipeline fixture. A live study is optional
and requires owner-supplied provider keys, a frozen model/date table, and
repetitions. Keys remain local in `.env`; the browser never receives them.

## Repository map

- `evalkit/domain/`: parser and separately selectable M1–M5 checkers
- `evalkit/`: tasks, provider interface, grading, runner, manifest, replay, CLI
- `tasks/`: oracle-derived frozen task instances
- `backend/`: Quart API, migrations, derived SQLite ingest, and static server
- `frontend/dist/`: shipped offline dashboard

## Release and operations

The release gates and evidence policy are documented in
[docs/RELEASE.md](docs/RELEASE.md). Operator procedures for quotas, migrations,
backups, logs, live-run approval, and incident recovery are in
[docs/OPERATIONS.md](docs/OPERATIONS.md). API and SSE contracts are in
[docs/API.md](docs/API.md).
