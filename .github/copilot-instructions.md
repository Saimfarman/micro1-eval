# Project rules for GitHub Copilot (micro1 eval hackathon)

Project: an eval of AI models on checking database-transaction histories. Deadline 6 Nov 2026 (submit by 5 Nov).
Open files under docs/plan/ only when I name them (they are long and cost credits). Definitions are in docs/MODELS.md,
textbook cases in docs/VECTORS.md. Sections 0.1 and 0.6 of the plan override older dates and scope.

## Hard rules
- NEVER invent or hand-write expected answers, model outputs, scores, costs, citations or reviewer sign-offs.
  Expected answers come only from evalkit/domain/oracle (rules.py is O2, reference.py is O1).
- NEVER edit evalkit/domain/oracle/*.py, evalkit/domain/history.py, docs/MODELS.md or tests/domain/vectors.py
  unless I explicitly ask. NEVER change a test just to make it pass; explain any test change.
- NEVER put API keys in code, logs, tests, docs or the frontend. Keys come from environment variables in .env
  (git-ignored). .env.example lists names only. Never print key values.
- Do not call any model API or run anything that could cost money unless I ask. Ask before deleting files.
- No external CDNs, fonts or scripts: everything must work offline.

## Working style (credits are scarce: about 200 per month)
- One deliverable per request. Write or update tests first, implement, run `python -m pytest`, show the result, stop.
- Do not re-read the whole plan. Open only the file I name. Keep answers short. Prefer diffs to rewrites.
- Windows + PowerShell: pathlib, no symlinks, no bash-only scripts, LF line endings.
- Python 3.12, Quart, pytest. Frontend: React + Vite + TypeScript + three.js. Accessibility target: WCAG 2.2 AA.
- Pin every dependency in requirements.txt / requirements-dev.txt and tell me why before adding a new one.

## Existing API (already built and tested; reuse it)
- evalkit.domain.history: parse(text), print_history(h), History, Txn, Op, HistoryError
- evalkit.domain.oracle.rules: check(h, "M1"|"M2"|"M3") -> dict with verdict, certificate parts, derivation;
  also build_graph, shortest_cycle, classify_cycle, snapshot_source, name_read, writer_of, resolve, completions
- evalkit.domain.oracle.reference: ref_verdict(h, module) -> "valid"|"invalid"|"undetermined"
- evalkit.domain.fuzz: random_history(rng, module, n, nkeys, fault), gen_timed, gen_ordered
- Modules: M1 snapshot isolation (timed histories), M2 serializability (commit-ordered), M3 in-doubt transactions.
