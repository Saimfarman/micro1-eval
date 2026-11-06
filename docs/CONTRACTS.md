# Project contracts

This document records current interfaces that must remain consistent across
the domain, task harness, API, and frontend. Formal definitions are in
[MODELS.md](MODELS.md), and expected task answers come only from the relevant
checker implementations.

## Domain and module contract

- `evalkit.domain.history.parse(text)` and `print_history(history)` handle the
  transaction-history format used by M1–M3 and M5.
- `evalkit.domain.linearizability.parse_register(text)` and
  `print_register(history)` handle the separate M4 register format.
- M1–M4 use the O1 reference, O2 rules, and O3 constraint checker paths.
- M5 uses separately implemented reference, rules, and constraint checkers in
  `evalkit.domain.strict_serializability`.
- Supported module IDs are `M1`, `M2`, `M3`, `M4`, and `M5`.
- Expected verdicts, certificates, and derivations must be computed from the
  relevant oracle/checker code. They are never supplied by a model.

## Task, attempt, and grade contracts

Task files identify the module, canonical history, prompt, expected verdict,
oracle-derived certificate/derivation, provenance, difficulty, and canonical
hash. Validation recomputes expected answers and rejects inconsistent records.

Each raw attempt records the prompt sent, requested and returned model IDs,
response, usage, latency, timestamps, task hash, and content hash. Raw attempts
are immutable. Grades record the verdict, certificate criteria, score, and
pass decision. Failure labels are machine-derived unless an actual human
review is recorded.

## Reproducibility contract

Manifests cover source task and results evidence. `verify`, `replay`, and
`reproduce` operate on saved local files without contacting a provider.
`results/index.sqlite3` is a manifest-aware, rebuildable projection, not the
source of truth.

## API and frontend contract

Quart exposes JSON endpoints under `/api`, an OpenAPI document, JSON problem
responses, and security headers. Live-run operations are disabled by default.
The React/Vite/TypeScript frontend is served from `frontend/dist`; Three.js
visualizations must have usable 2D and table equivalents. Runtime assets must
work offline without external CDNs or provider credentials.
