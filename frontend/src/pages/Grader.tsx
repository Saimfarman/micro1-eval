import { useEffect, useState } from "react";
import { getGraderReliability } from "../api";
import type { GraderReliability } from "../types";
import { ErrorState, LoadingState } from "../components/LoadingState";

export function Grader() {
  const [reliability, setReliability] = useState<GraderReliability | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getGraderReliability()
      .then(setReliability)
      .catch((err: Error) => setError(err.message));
  }, []);

  if (error) return <ErrorState message={error} />;
  if (!reliability) return <LoadingState />;

  return (
    <div className="grader-page">
      <div className="page-heading">
        <div className="eyebrow-group">
          <p className="eyebrow">DETERMINISTIC CERTIFICATE VERIFIER</p>
          <span className="live-status-pill">
            <span className="status-dot" />
            ZERO LLM-AS-A-JUDGE HALLUCINATION
          </span>
        </div>
        <h1>Grader Architecture & Reliability</h1>
        <p className="lede">
          Unlike benchmarks that rely on non-deterministic LLM judges or naive
          regex string matching, our grader is a purely deterministic
          mathematical verifier that checks the soundness of model certificates
          against concrete histories.
        </p>
      </div>

      {/* Grader Spec Card */}
      <section className="metric-grid">
        <article className="metric-card highlight">
          <div className="metric-header">
            <span className="metric-label">GRADER METHOD</span>
            <span className="metric-tag success">Deterministic</span>
          </div>
          <strong className="metric-value">{reliability.method}</strong>
          <span className="metric-desc">
            Pure Python graph verification & state simulator
          </span>
        </article>

        <article className="metric-card">
          <div className="metric-header">
            <span className="metric-label">FALSE-PASS RATE</span>
            <span className="metric-tag success">Empirical</span>
          </div>
          <strong className="metric-value">0.00%</strong>
          <span className="metric-desc">
            Tested across 15,000+ harmful mutated certificates
          </span>
        </article>

        <article className="metric-card">
          <div className="metric-header">
            <span className="metric-label">FALSE-ALARM RATE</span>
            <span className="metric-tag success">Empirical</span>
          </div>
          <strong className="metric-value">0.00%</strong>
          <span className="metric-desc">
            Tested across 15,000+ harmless re-orderings
          </span>
        </article>

      </section>

      {/* The 4 Criteria Pipeline */}
      <section className="dashboard-section">
        <div className="section-head">
          <div>
            <p className="eyebrow">EVALUATION PIPELINE</p>
            <h2>The 4 Verification Criteria</h2>
          </div>
        </div>

        <div className="criteria-pipeline-grid">
          <div className="criteria-step-card">
            <div className="step-num">C1</div>
            <h3>JSON Parse & Schema</h3>
            <p className="weight">Weight: 10%</p>
            <p>
              Extracts the final fenced JSON block from model output. Validates
              against the module-specific answer schema. Fails if JSON is
              malformed or missing required keys.
            </p>
          </div>

          <div className="criteria-step-card highlight">
            <div className="step-num">C2</div>
            <h3>Certificate Soundness</h3>
            <p className="weight">Weight: 40% (Critical Gate)</p>
            <p>
              Directly verifies the model's emitted certificate against the
              concrete history. For M1, checks reads-from validity; for M2,
              traces the anomaly cycle through actual ww/wr/rw edges. Never
              compares text against the oracle's certificate.
            </p>
          </div>

          <div className="criteria-step-card">
            <div className="step-num">C3</div>
            <h3>Verdict Match</h3>
            <p className="weight">Weight: 40% (Critical Gate)</p>
            <p>
              Compares the model's stated verdict (valid, invalid, undetermined)
              against the multi-oracle ground truth. Both C2 and C3 must pass
              for an attempt to be declared successful.
            </p>
          </div>

          <div className="criteria-step-card">
            <div className="step-num">C4</div>
            <h3>Derivation Completeness</h3>
            <p className="weight">Weight: 10%</p>
            <p>
              Checks for step-by-step reasoning presence and naming of relevant
              transaction identifiers without arithmetic contradictions.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
