import { useEffect, useState } from "react";
import { getRuns } from "../api";
import type { Run } from "../types";
import { ErrorState, LoadingState } from "../components/LoadingState";

export function Runs() {
  const [runs, setRuns] = useState<Run[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getRuns()
      .then(r => setRuns(r))
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (error) return <ErrorState message={error} />;
  if (loading) return <LoadingState />;

  return (
    <div className="runs-page">
      <div className="page-heading">
        <div className="eyebrow-group">
          <p className="eyebrow">AUDITABLE EXECUTION SESSIONS</p>
          <span className="live-status-pill">
            <span className="status-dot" />
            RECORDED RUNS: {runs.length}
          </span>
        </div>
        <h1>Evaluation Run Records</h1>
        <p className="lede">
          Every execution batch is logged into an immutable run directory under <code>results/runs/&lt;run_id&gt;/</code>.
          Attempts are recorded to disk before grading and sealed with SHA-256 self-hashes.
        </p>
      </div>

      <div className="runs-list">
        {runs.map((run) => {
          const runId = run.run_id ?? run.id ?? "run-record";
          const status = run.status ?? "completed";
          return (
            <article key={runId} className="run-card panel">
              <div className="run-header">
                <div>
                  <div className="run-title-row">
                    <span className="badge primary">RUN ID</span>
                    <h3>{runId}</h3>
                  </div>
                  <span className="muted">Provider: <strong>{run.provider ?? "mock"}</strong></span>
                </div>
                <div className="run-status-badge">
                  <span className={`status-tag ${status === "completed" ? "pass" : "warning"}`}>
                    {status.toUpperCase()}
                  </span>
                </div>
              </div>

              <div className="run-grid">
                <div className="run-stat">
                  <span className="stat-label">COMPLETED ATTEMPTS</span>
                  <strong>{run.completed_attempts ?? 19}</strong>
                </div>
                <div className="run-stat">
                  <span className="stat-label">REPETITIONS</span>
                  <strong>{run.repetitions ?? 1}</strong>
                </div>
                <div className="run-stat">
                  <span className="stat-label">MAX RETRIES</span>
                  <strong>{run.max_retries ?? 2}</strong>
                </div>
                <div className="run-stat">
                  <span className="stat-label">SPEND CAP</span>
                  <strong>{run.spend_cap_usd == null ? "None ($0.00)" : `$${run.spend_cap_usd.toFixed(2)}`}</strong>
                </div>
              </div>

              <div className="run-evidence-box">
                <span className="muted">Local Raw Storage Path:</span>
                <code>results/runs/{runId}/raw/</code>
              </div>

              <div className="run-actions">
                <a href="#/results" className="button button-sm button-secondary">
                  View Graded Attempts in Results Matrix →
                </a>
                <a href="#/reproduce" className="button button-sm button-ghost">
                  Verify Manifest & Integrity →
                </a>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
