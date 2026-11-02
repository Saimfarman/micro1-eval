# Transaction History Eval

## 1. Short description

This is an offline-first evaluation of model reasoning about database transaction
histories. It covers snapshot isolation (M1), serializability (M2), and in-doubt
transactions (M3), with independent O1 and O2 checkers and immutable raw records.
The bundled mock run is a reproducibility fixture, not a commercial-model claim.

## 2. Video walkthrough link

Video: to be recorded. The planned script is in [docs/VIDEO_SCRIPT.md](docs/VIDEO_SCRIPT.md).

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

Requires Python 3.11+. From the repository root:

```text
python -m evalkit validate-tasks
python -m evalkit run
python -m evalkit reproduce
python -m backend.serve
```

Open `http://127.0.0.1:5000`. The mock path needs no API key or network. An
OpenAI-compatible live provider is opt-in through `.env` variables documented in
`.env.example`; do not commit secrets.

## 6. Models tested and results

The included result is the deterministic `mock` provider fixture. Run
`python -m evalkit report` after a live run to regenerate statistics; no
commercial model result is fabricated here.

## 7. Failure analysis

The deterministic grader records wrong verdict, wrong certificate, calculation
error, format violation, incomplete answer, and refusal categories. Raw outputs
are stored under `results/runs/`; replay grades them without contacting a model.

## 8. Prior work and sources

The formal definitions cite Berenson et al. (1995) and Adya (1999) in
[docs/MODELS.md](docs/MODELS.md). The domain core and vectors came in the
starter pack; the harness, backend, and dashboard around them are original
integration work. See [docs/DISCLOSURES.md](docs/DISCLOSURES.md).

## Limitations and threats to validity

The bundled mock provider is only a pipeline fixture. A real study requires
owner-supplied provider keys, a frozen model/date table, repetitions, and human
review of failure tags.

## Repository map

- `evalkit/domain/`: parser and independent checkers
- `evalkit/`: tasks, provider interface, grading, runner, manifest, replay, CLI
- `tasks/`: oracle-derived frozen task instances
- `backend/`: dependency-free read-only API and static server
- `frontend/dist/`: shipped offline dashboard
