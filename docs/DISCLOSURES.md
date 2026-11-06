# Disclosures

## AI tools used

- Claude was used during initial planning and development of parts of the
  history parser, M1–M3 checkers, generators, and tests. The owner reviewed and
  extended that work.
- GitHub Copilot in VS Code was used by the owner for later implementation of
  M4/M5 support, the evaluation harness, backend, dashboard, tests, and
  documentation.

These are development disclosures, not claims that an AI-generated checker is
independently validated.

## Prior work, libraries, and sources

The M1–M3 definitions draw on Berenson et al. (1995) and Adya (1999), as
described in [MODELS.md](MODELS.md). M4 and M5 use the project-specific
definitions documented there. The current runtime uses pinned dependencies in
`requirements.txt` and `requirements-dev.txt`, including Z3 for supported
constraint-checker paths and Quart for the API.

The task histories are synthetic. The deterministic mock provider is a local
pipeline fixture, not an external benchmark or commercial-model result.

## Validation and limitations

O1 and O2 use different checking approaches but share development authorship;
they are not independent review teams. M1–M4 also have an O3 constraint-checker
path. M5 has reference, rules, and constraint implementations in its own
module. Shared authorship means differential agreement is useful evidence but
not independent human verification.

No human review or human-confirmed failure analysis is claimed unless a review
is explicitly carried out and recorded in the corresponding evidence.
