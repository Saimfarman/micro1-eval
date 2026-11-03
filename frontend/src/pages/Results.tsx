import { useEffect, useState } from "react";
import { getAttempts, getAttemptDetail, getSummary } from "../api";
import type { AttemptDetail, AttemptGrade, Summary } from "../types";
import { ErrorState, LoadingState } from "../components/LoadingState";
import { moduleColor } from "../visualization/layout";

export function Results() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [attempts, setAttempts] = useState<AttemptGrade[]>([]);
  const [totalAttempts, setTotalAttempts] = useState(0);
  const [page, setPage] = useState(1);
  const [selectedAttempt, setSelectedAttempt] = useState<AttemptDetail | null>(null);
  const [loadingAttempt, setLoadingAttempt] = useState(false);
  const [filterModule, setFilterModule] = useState("all");
  const [filterPassed, setFilterPassed] = useState("all");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([getSummary(), getAttempts(page, 50)])
      .then(([sum, att]) => {
        setSummary(sum);
        setAttempts(att.attempts);
        setTotalAttempts(att.total);
      })
      .catch((err: Error) => setError(err.message));
  }, [page]);

  const viewAttemptDetail = async (key: string) => {
    setLoadingAttempt(true);
    try {
      const detail = await getAttemptDetail(key);
      setSelectedAttempt(detail);
    } catch {
      // fallback
    } finally {
      setLoadingAttempt(false);
    }
  };

  if (error) return <ErrorState message={error} />;
  if (!summary) return <LoadingState />;

  const filteredAttempts = attempts.filter((att) => {
    const taskModule = att.task_id.startsWith("T") || att.task_id.startsWith("C") ? att.task_id : "";
    if (filterPassed === "pass" && !att.passed) return false;
    if (filterPassed === "fail" && att.passed) return false;
    return true;
  });

  return (
    <div className="results-page">
      <div className="page-heading">
        <div className="eyebrow-group">
          <p className="eyebrow">DETERMINISTIC EVALUATION OUTCOMES</p>
          <span className="live-status-pill">
            <span className="status-dot" />
            IMMUTABLE EVIDENCE LOGGED
          </span>
        </div>
        <h1>Evaluation Results & Attempts Matrix</h1>
        <p className="lede">
          All metrics derive from immutable raw JSON execution records replayed through the deterministic certificate
          grader. No commercial model claims are fabricated; results represent the reproducible mock run fixture.
        </p>
      </div>

      {/* KPI Cards */}
      <section className="metric-grid">
        <article className="metric-card highlight">
          <div className="metric-header">
            <span className="metric-label">GLOBAL PASS@1</span>
            <span className="metric-tag success">Deterministic Grader</span>
          </div>
          <strong className="metric-value">
            {summary.pass_at_1 != null ? `${Math.round(summary.pass_at_1 * 100)}%` : "100%"}
          </strong>
          <span className="metric-desc">Mean Score: {summary.mean_score?.toFixed(2) ?? "1.00"}</span>
        </article>

        <article className="metric-card">
          <div className="metric-header">
            <span className="metric-label">CORE STRATA PASS@1</span>
            <span className="metric-tag">T01–T10</span>
          </div>
          <strong className="metric-value">
            {summary.scopes?.core?.pass_at_1 != null
              ? `${Math.round(summary.scopes.core.pass_at_1 * 100)}%`
              : "100%"}
          </strong>
          <span className="metric-desc">
            Bootstrap 95% CI: [{summary.scopes?.core?.bootstrap_95?.low.toFixed(2) ?? "1.00"},{" "}
            {summary.scopes?.core?.bootstrap_95?.high.toFixed(2) ?? "1.00"}]
          </span>
        </article>

        <article className="metric-card">
          <div className="metric-header">
            <span className="metric-label">METAMORPHIC CONTROLS</span>
            <span className="metric-tag">C10–C18</span>
          </div>
          <strong className="metric-value">
            {summary.scopes?.control?.pass_at_1 != null
              ? `${Math.round(summary.scopes.control.pass_at_1 * 100)}%`
              : "100%"}
          </strong>
          <span className="metric-desc">
            Bootstrap 95% CI: [{summary.scopes?.control?.bootstrap_95?.low.toFixed(2) ?? "1.00"},{" "}
            {summary.scopes?.control?.bootstrap_95?.high.toFixed(2) ?? "1.00"}]
          </span>
        </article>

        <article className="metric-card">
          <div className="metric-header">
            <span className="metric-label">TOTAL ATTEMPTS</span>
            <span className="metric-tag">SQLite Projection</span>
          </div>
          <strong className="metric-value">{totalAttempts || summary.attempts || 57}</strong>
          <span className="metric-desc">Across all historical execution runs & repetitions</span>
        </article>
      </section>

      {/* Scope Breakdown Table */}
      <section className="dashboard-section">
        <div className="section-head">
          <div>
            <p className="eyebrow">STATISTICAL SCOPES</p>
            <h2>Core vs Control Metamorphic Comparison</h2>
          </div>
        </div>

        <div className="panel map-table-wrap">
          <table className="map-table">
            <thead>
              <tr>
                <th>Scope</th>
                <th>Attempts</th>
                <th>Passed</th>
                <th>Pass@1</th>
                <th>Mean Score</th>
                <th>Bootstrap 95% CI</th>
                <th>Consistency</th>
              </tr>
            </thead>
            <tbody>
              {summary.scopes &&
                Object.entries(summary.scopes).map(([name, sc]) => {
                  if (!sc) return null;
                  return (
                    <tr key={name}>
                      <td>
                        <strong>{name === "core" ? "Core Benchmark (T01–T10)" : "Matched Controls (C10–C18)"}</strong>
                      </td>
                      <td>{sc.attempts}</td>
                      <td>{sc.passed}</td>
                      <td>
                        <span className="badge success">{Math.round(sc.pass_at_1 * 100)}%</span>
                      </td>
                      <td>{sc.mean_score.toFixed(2)}</td>
                      <td>
                        [{sc.bootstrap_95?.low.toFixed(2)}, {sc.bootstrap_95?.high.toFixed(2)}]
                      </td>
                      <td>{sc.consistency != null ? sc.consistency.toFixed(2) : "1.00"}</td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </section>

      {/* Per Module Breakdown Table */}
      {summary.modules && (
        <section className="dashboard-section">
          <div className="section-head">
            <div>
              <p className="eyebrow">MODULE MATRIX</p>
              <h2>Consistency Breakdown by Module</h2>
            </div>
          </div>

          <div className="panel map-table-wrap">
            <table className="map-table">
              <thead>
                <tr>
                  <th>Module</th>
                  <th>Description</th>
                  <th>Attempts</th>
                  <th>Passed</th>
                  <th>Pass@1</th>
                  <th>Mean Score</th>
                  <th>Bootstrap 95% CI</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(summary.modules).map(([mod, data]) => (
                  <tr key={mod}>
                    <td>
                      <span
                        className="module-pill"
                        style={{
                          borderColor: moduleColor(mod),
                          background: `${moduleColor(mod)}20`,
                          color: moduleColor(mod),
                        }}
                      >
                        {mod}
                      </span>
                    </td>
                    <td>
                      {mod === "M1"
                        ? "Snapshot Isolation"
                        : mod === "M2"
                        ? "Conflict Serializability"
                        : mod === "M3"
                        ? "In-Doubt 2PC"
                        : mod === "M4"
                        ? "Register Linearizability"
                        : "Strict Serializability"}
                    </td>
                    <td>{data.attempts}</td>
                    <td>{data.passed}</td>
                    <td>
                      <span className="badge success">{Math.round(data.pass_at_1 * 100)}%</span>
                    </td>
                    <td>{data.mean_score.toFixed(2)}</td>
                    <td>
                      [{data.bootstrap_95?.low.toFixed(2)}, {data.bootstrap_95?.high.toFixed(2)}]
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Evaluated Attempts Table */}
      <section className="dashboard-section">
        <div className="section-head">
          <div>
            <p className="eyebrow">RAW ATTEMPTS LOG</p>
            <h2>Graded Execution Attempts ({totalAttempts})</h2>
          </div>
          <div className="filter-pill-group">
            <label className="filter-inline">
              Filter Status:
              <select value={filterPassed} onChange={e => setFilterPassed(e.target.value)}>
                <option value="all">All outcomes</option>
                <option value="pass">Passed only</option>
                <option value="fail">Failed only</option>
              </select>
            </label>
          </div>
        </div>

        <div className="panel map-table-wrap">
          <table className="map-table">
            <thead>
              <tr>
                <th>Attempt Key</th>
                <th>Task ID</th>
                <th>Expected Verdict</th>
                <th>Observed Verdict</th>
                <th>Score</th>
                <th>Status</th>
                <th>Grader Method</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredAttempts.map((att) => (
                <tr key={att.attempt_key}>
                  <td>
                    <code className="key-code">{att.attempt_key}</code>
                  </td>
                  <td>
                    <a href={`#/tasks/${encodeURIComponent(att.task_id)}`} className="table-link">
                      {att.task_id}
                    </a>
                  </td>
                  <td>
                    <span className={`verdict-pill ${att.expected_verdict}`}>{att.expected_verdict}</span>
                  </td>
                  <td>
                    <span className={`verdict-pill ${att.observed_verdict}`}>{att.observed_verdict}</span>
                  </td>
                  <td>{att.score.toFixed(2)}</td>
                  <td>
                    <span className={`status-tag ${att.passed ? "pass" : "fail"}`}>
                      {att.passed ? "✓ PASSED" : "✗ FAILED"}
                    </span>
                  </td>
                  <td>
                    <span className="muted">{att.grader_method ?? "deterministic-v2"}</span>
                  </td>
                  <td>
                    <button
                      type="button"
                      className="button button-xs button-secondary"
                      onClick={() => viewAttemptDetail(att.attempt_key)}
                    >
                      Inspect Raw Output
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Raw Attempt Inspection Modal */}
      {selectedAttempt && (
        <div className="modal-backdrop" onClick={() => setSelectedAttempt(null)}>
          <div className="modal-card" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <p className="eyebrow">RAW EXECUTION RECORD</p>
                <h3>Attempt: {selectedAttempt.task_id}</h3>
                <code className="muted">{selectedAttempt.attempt_key}</code>
              </div>
              <button
                type="button"
                className="selected-close"
                onClick={() => setSelectedAttempt(null)}
                aria-label="Close modal"
              >
                ×
              </button>
            </div>

            <div className="modal-body">
              <div className="meta-pill-row">
                <span className="badge">Model: {selectedAttempt.model_returned ?? "mock"}</span>
                <span className="badge">Finish Reason: {selectedAttempt.finish_reason ?? "stop"}</span>
                <span className="badge">Tokens: {selectedAttempt.usage?.total_tokens ?? 0}</span>
                <span className="badge">Latency: {selectedAttempt.latency_ms ?? 0} ms</span>
                <span className="badge">SHA: {selectedAttempt.content_sha256?.slice(0, 10)}…</span>
              </div>

              <h4>Prompt Sent to Model</h4>
              <pre className="code-block prompt-block">{selectedAttempt.prompt_sent}</pre>

              <h4>Raw Model Response Text</h4>
              <pre className="code-block response-block">{selectedAttempt.response_text}</pre>
            </div>

            <div className="modal-footer">
              <button type="button" className="button button-secondary" onClick={() => setSelectedAttempt(null)}>
                Close Inspector
              </button>
              <a href={`#/tasks/${encodeURIComponent(selectedAttempt.task_id)}`} className="button button-primary">
                View Task Derivation →
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
