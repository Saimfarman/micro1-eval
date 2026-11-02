# AGENT_START: prompts for GitHub Copilot (Agent mode)

How to use: open Copilot Chat, switch to **Agent** mode, paste ONE prompt at a time, in order. After each, check that
`python -m pytest` is green, then commit. Credits are scarce (about 200 per month): keep chats short, start a NEW chat
for each prompt, and do not attach big files. If a prompt uses more than about 30 credits, stop and ask Claude (the
chat assistant that made this pack) to write that module with tests instead; paste its files in and run the tests.

---

## MASTER PROMPT (paste first)

```
Read .github/copilot-instructions.md only (do not open the plan files). Then run these commands and report the result in
two lines: `pip install -r requirements-dev.txt` and `python -m pytest`. Do not change any file. Wait for my next prompt.
```
Expected: `66 passed`. If not, paste the error to Claude.

Then commit: `git add -A; git commit -m "Starter pack"` and push to your private repo.

---

## P1: instance generator and CLI skeleton

```
Create evalkit/domain/generate.py and evalkit/__main__.py (argparse; subcommand `generate` only for now).
Command: python -m evalkit generate --module m1|m2|m3 --size 8 --seed 42 --n 20 --out instances.jsonl
Requirements:
- Build on evalkit/domain/fuzz.py (gen_timed, gen_ordered) but make `size` the exact number of transactions, use 2-4
  keys, and use rejection sampling so the output is about half valid and half invalid (verdict from
  evalkit.domain.oracle.rules.check). For m3, every instance has 1 or 2 prepared transactions.
- Reject duplicates (hash of a canonical form: rename transactions and keys by first appearance) and reject any
  instance where rules.check and reference.ref_verdict disagree.
- Each JSONL line: id, module, seed, params, history (print_history text), verdict, certificate (reads_from or
  cycle/violations/serial_order from the oracle result), derivation (list of lines), metrics (transactions, keys,
  operations, overlapping pairs for timed histories, length of the shortest violating certificate, distractor count).
- Deterministic: same seed and params give identical output.
Write tests in tests/domain/test_generate.py (determinism, balance within 35-65%, no disagreement, schema, dedupe).
Do not edit oracle files. Run python -m pytest and show the result.
```

## P2: prompt builder and answer schemas

```
Create evalkit/domain/prompting.py. build_prompt(instance) returns {"system": ..., "user": ...} following the template in
docs/plan/60-domain-pack.md section 20.5. The Definitions block must contain, verbatim, the relevant rules from
docs/MODELS.md (M1 -> D1, M2 -> D2, M3 -> D1 plus D3). Include the answer-format instructions and the JSON schema for the
module (shapes in section 20.5). Also expose answer_schema(module) as a JSON-Schema dict. Store the system prompt and the
template text in evalkit/prompts/ as files. Tests: the prompt contains the definition text verbatim, is deterministic,
and contains no expected answer or certificate. Run python -m pytest.
```

## P3: certificate graders and the mutation suite

```
Create evalkit/domain/grading.py implementing section 20.8 of docs/plan/60-domain-pack.md:
parse_answer(text) (last fenced JSON block, one lenient fallback), then grade(instance, response_text) returning
{criteria: {c1, c2, c3, c4}, passed, score, tags, parse_status}. Verify certificates against the HISTORY using the helper
functions in evalkit.domain.oracle.rules (build_graph, snapshot_source, name_read, writer_of, resolve, completions),
never by comparing with the oracle's own certificate text. Accept ANY valid certificate. Pass = all critical criteria.
Auto-tags from section 20.13. Tests: golden answers built from V1-V10 pass; near-misses fail. Then
tests/domain/test_mutations.py: for generated instances apply the harmful and harmless mutations listed in 20.8 and assert
the grader fails every harmful one and passes every harmless one. Report false-pass and false-fail counts (target 0).
Run python -m pytest.
```

## P4: provider adapter, quota pacing, estimate

```
Create evalkit/providers/base.py, evalkit/providers/openai_compat.py and evalkit/providers/mock.py, and models.yaml.
One generic OpenAI-compatible adapter (base_url, api key env var name, model id from models.yaml; use httpx, pinned).
Support max_completion_tokens for reasoning models. Per-model quotas in models.yaml: rpm, rpd, tpm, tpd. The runner side
must pace itself, stop cleanly when a daily quota is exhausted, and resume later. Retry only on 429, 5xx and transport
errors. Record usage, returned model id, finish_reason and latency. Mock provider returns scripted text for tests.
Add `python -m evalkit estimate` that prints calls, tokens, cost and DAYS needed. Tests with httpx.MockTransport only: no
real network calls. Add models.yaml entries (no keys) for: gemini (OpenAI-compatible endpoint), groq gpt-oss-120b,
openrouter free model, azure (endpoint from env). Run python -m pytest.
```

## P5: runner, raw records, manifest, verify, replay, import-manual, report

```
Implement section 9 of docs/plan/30-architecture.md (9.3 raw attempt record, 9.4 reproducibility) in evalkit/runner.py,
manifest.py, verify.py, replay.py, report.py and CLI subcommands: run, grade, replay, verify, reproduce, import-manual,
report. Raw attempts are written before grading and never edited. results/runs/<run_id>/raw/<model>/<task>__<rep>.json,
grades.jsonl, scores.json, and results/MANIFEST.json with SHA-256 of every file. `verify` recomputes all scores from raw
files and exits non-zero on any mismatch. `replay` re-grades offline with no keys. `import-manual` stores pasted chat
outputs with collection: manual and keeps them in a SEPARATE table. Statistics: pass@1, consistency, bootstrap intervals
over tasks with a fixed seed. Tests with the mock provider, including tamper tests (change one byte -> verify fails).
Run python -m pytest.
```

## P6: pilot (Day 2 morning)

```
Add scripts/pilot.py: generate 24 pilot-seed instances (m1 and m2, sizes 6, 8, 10, 12, balanced), run them on the models
I name, grade them, and print per model: verdict accuracy, certificate validity, false-accept and false-alarm counts, and
the tag counts. Add `python -m evalkit show <attempt>` that prints the model's certificate beside the oracle derivation.
Do not run any API call until I say so.
```

## P7: selection, controls, sign-off, freeze

```
Following section 20.9 and 20.10 of docs/plan/60-domain-pack.md: create docs/SELECTION.md (rules and the final seed; I
will give you the seed), `python -m evalkit select` (one instance per blueprint stratum C1-C9 chosen by difficulty metrics
only, never by model results), automatic matched controls (change exactly one read value so the verdict flips; use the
controlled-change logic from tests/domain/test_metamorphic.py), derivations stored with each task, and
`python -m evalkit sign <task>` that appends to results/verification_record.jsonl after printing the derivation. Preflight
must refuse tasks without a sign-off. Run python -m pytest.
```

## P8 and later (after the final run has started)

- P8: Quart API and SQLite ingest (endpoints in plan Section 11.2, reduced to: meta, tasks, task detail with derivation,
  results summary and matrix, attempts, failures breakdown, integrity).
- P9: React + Vite + TypeScript dashboard (routes in plan 0.1 item 5), react-three-fiber Failure Map with a table
  equivalent, WCAG 2.2 AA checks (eslint-plugin-jsx-a11y, jest-axe), `npm run build` into frontend/dist.
- P10: README generator, `python -m evalkit preflight` and `package` (plan Section 15.1).

---

## OPTIONAL P0: an independent third checker (only if credits allow; strengthens the evidence)

```
New chat. Read ONLY docs/MODELS.md and evalkit/domain/history.py. Do NOT open anything under evalkit/domain/oracle/.
Write evalkit/domain/oracle/third.py with third_verdict(history, module) -> "valid"|"invalid"|"undetermined" implementing
D1, D2 and D3 from docs/MODELS.md in your own way (for example a constraint-solver or a different search). Then add a test
to tests/domain/test_differential.py comparing it with rules.check on 1500 random histories per module, and report any
disagreement. Do not modify the other checkers.
```
