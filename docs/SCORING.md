# Grading and scoring

Phase 3 grades model responses offline. The grader extracts the last usable
JSON answer, recomputes the module oracle result, and verifies the submitted
certificate against the history rather than trusting the stored verdict.

The fixed score weights are:

- verdict: 0.40
- certificate: 0.40
- naming: 0.10
- completeness: 0.10

Verdict, certificate, and completeness are critical. A response cannot pass if
any critical criterion fails, even when its weighted score is otherwise high.
M1 verifies reads-from and violation certificates; M2 verifies serial orders,
dependency cycles, and named violations; M3 verifies every completion; M4
verifies a submitted linearization or the complete oracle violation set.

Aggregate reports include core/control and per-module attempts, pass@1, mean
score, and deterministic bootstrap intervals. Bootstrap sampling uses the
recorded seed and never fabricates missing attempts.
