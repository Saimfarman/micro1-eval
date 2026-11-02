<!-- Task design and grading design (generic). Section 0.1 and 0.6 override older dates and scope elsewhere. -->

## 5. Task design specification

### 5.1 Pipeline from idea to frozen task set

1. **Draft 25 to 40 candidates** from your own domain notes.
2. **Pilot** all of them on at least three frontier models from different providers, three runs each.
3. **Expert review:** read every failure by hand and confirm it is a genuine model error, not an ambiguous prompt, a wrong key or a grader bug. Fix or drop the task otherwise.
4. **Select the final 8 to 10 core tasks** (the brief recommends 5 to 10; quality beats quantity). Cover every category and a spread of difficulty, with edge cases and judgment calls well represented.
5. **Freeze:** tag the commit and hash the task files. If any task changes after the final run, re-run it.
6. **Disclose the selection.** Selecting tasks that models fail biases headline pass rates downward, so the README must state how many candidates were piloted, the pilot pass rates and the selection criteria. The final score measures a hard, expert-curated set, not general capability.

### 5.2 Task file schema (one YAML file per task, validated by JSON Schema)

```
id: T07
version: 1
status: final              # placeholder | draft | final (preflight blocks the first two)
category: <from eval.config.yaml>
difficulty: 4              # 1-5, set by the expert, never by model results
type: core                 # core | control
control_of: null           # id of the matching core task when type is control
prompt: |
  <the full, self-contained text sent to every model>
context_files: []          # small attachments, relative paths
output_format: json        # free_text | json | code
edge_cases: [overlapping-rules, missing-info]
judgment_call: false       # true if the right move is to flag, ask or decline
expected:
  answer: <canonical answer plus accepted equivalents>
  rationale: |
    <expert reasoning, step by step>
grading:
  method: rubric           # exact | numeric | structured | executable | rubric | llm_judge
  pass_threshold: 0.8
  criteria:
    - id: c1
      text: Identifies rule X as controlling
      weight: 3
      critical: true       # must be met to pass regardless of total
      check: deterministic # deterministic | llm
      spec: <regex, numeric tolerance, JSON path or judge instruction>
provenance:
  author: owner
  sources: [<public references, cited not copied>]
  verified_by: [owner]     # add a second expert if you can
  verified_on: <date>
  novelty_check: <how you confirmed the scenario is original>
expected_failure_mode: <taxonomy id, a hypothesis validated afterwards>
```

A validator (`validate-tasks`) rejects missing fields, duplicate IDs, criteria weights that do not sum, controls without a core twin, and any task lacking `verified_by`.

### 5.3 Matched controls

For each core task, write a control that keeps the scenario, vocabulary and answer format but removes the edge case or twist. Controls are reported separately and excluded from the headline score. If models pass the control and fail the core task, the gap is isolated. If they fail both, the task may be unfair or the gap broader than claimed, and you must say so. Controls are lightweight; if time is short, do them for the five strongest tasks.

### 5.4 Prompting protocol

- One prompt template and one system prompt for every model, stored under `eval``kit``/prompts/` and versioned. No per-model tuning.
- Ask for reasoning in free text followed by a clearly delimited final answer (for example a fenced JSON block) so graders are robust without constraining how the model thinks.
- Record all settings: temperature or reasoning-effort setting, max tokens, runs per task, any tools enabled (default none).
- Where a provider’s flagship model has a native reasoning mode, run it at one documented setting; optionally add a second setting as an extra column, never as a replacement.
- Do not look at a model’s results and then rewrite the prompt for that model.

## 6. Grading design

### 6.1 Grader hierarchy (use the highest rung that fits)

1. **Executable:** run model-produced code or configuration against hidden tests in a sandbox.
2. **Exact, numeric (with tolerance and units) and structured (JSON schema plus field-wise comparison).**
3. **Rubric with deterministic checks:** weighted binary criteria, each independently checkable.
4. **Rubric with an LLM judge,** only for criteria that cannot be checked deterministically.

Avoid bare regex or `contains` matching on free text; it creates false passes and false fails.

### 6.2 Scoring formula (document it verbatim in `docs/SCORING.md`)

- Task score = sum of weights of satisfied criteria divided by the sum of all weights, in the range 0 to 1.
- A run **passes** when score is at least `pass_threshold` and every `critical` criterion is met.
- **pass@1** per model = mean pass rate over core tasks and runs. **Consistency** = share of tasks where all k runs pass. **Mean rubric score** is reported as a secondary measure.
- Confidence intervals come from a bootstrap over tasks (runs on the same task are not independent). With 8 to 10 tasks the intervals will be wide; say so and avoid ranking models whose intervals overlap.
- Report per-category and per-difficulty breakdowns, and control versus core side by side.

### 6.3 LLM-judge protocol (only if used)

- Name and pin the exact judge model; store the full prompt in the repo.
- Temperature 0 (or the lowest setting the API allows); structured JSON verdict per criterion with a short evidence quote from the response.
- The judge never sees which model produced the answer. It receives the task, the expected answer and the single criterion being checked.
- Run each judgement twice and flag disagreements for manual review.
- Prefer a judge from a different provider than the models being ranked, and report a check for self-preference.
- **Calibration set:** at least 40 responses, labelled by the owner, mixing clearly correct, subtly wrong, correct-but-paraphrased and verbose-but-wrong answers. Report accuracy, **false-pass rate, false-fail rate** and Cohen’s kappa. Suggested bar before the final run: false-pass rate at most 2%, kappa at least 0.8. If the bar is missed, revise the rubric or the grader and re-measure.

### 6.4 Grader unit tests

For every task, test the grader against a golden answer, a near-miss that must fail, a correct paraphrase, a format variant (extra prose, different casing, units), an empty answer, a refusal and a truncated answer. These tests run in CI with no network.

### 6.5 Sandbox rule for executable grading

Never run model-generated code on the host unsandboxed. Use a subprocess with a timeout, memory and CPU limits, no network and a throwaway working directory, or a container where available. Document the isolation in `docs/SCORING.md`.
