# Grading and scoring

Grading runs locally against the history and its oracle-derived expected
verdict/certificate. It does not trust a model's stated verdict or task JSON
without validation. See `evalkit/grading.py` for the executable rubric.

The configured weighted criteria are:

- Verdict: 0.40
- Certificate: 0.40
- Naming: 0.10
- Completeness: 0.10

Verdict, certificate, and completeness are critical criteria; failure of a
critical criterion prevents a passing grade regardless of the total weighted
score.

Certificate checks are module-specific: M1 checks reads-from/violation
evidence; M2 checks serial orders, dependency cycles, and named violations; M3
checks the possible completions; M4 checks linearization/violation evidence;
M5 checks a serial order and its real-time constraints.

Reports aggregate only recorded attempts. The scorer reports supported
core/control and per-module statistics, pass@1, mean score, and deterministic
bootstrap intervals where the evidence is available. It does not manufacture
missing attempts or scores. Human-review status is reported separately from
machine grading.
