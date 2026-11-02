# Task selection rules

Phase 2 freezes the checked-in JSON files under `tasks/`. The source of truth
for every expected verdict, certificate, and derivation is the three oracle
implementations; task files are rejected if any stored value differs.

## Chronology and seeds

- The original frozen corpus is `frozen-v1` and retains its task IDs.
- Phase 1/2 M4 additions use seed `410`.
- Held-out generated tasks use an explicit caller-supplied seed and are written
  under ignored `generated-tasks/`.
- Canonical identity is SHA-256 of the module name and canonical history text.
  Duplicate canonical hashes are rejected.

## Eligibility

Every eligible task must be final or generated, have a supported module, parse
under that module's strict parser, and include provenance, difficulty metrics,
oracle-derived expected certificate, derivation, and canonical hash. Placeholder
and draft tasks are never eligible.

## Balance and controls

Selection is balanced across M1-M4 and valid/invalid/undetermined verdicts
whenever the available corpus supports the category. Controls are retained
separately from core tasks and are never silently substituted for core tasks.
Matched controls carry a `control_relationship` with their paired core ID.
Standalone historical controls remain explicitly labelled as such.

Task generation is deterministic for a fixed module, count, and seed. Live
providers are not called while generating or validating tasks.
