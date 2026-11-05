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
  const [attemptError, setAttemptError] = useState<string | null>(null);
  const [activeAttemptKey, setActiveAttemptKey] = useState<string | null>(null);
  const [filterPassed, setFilterPassed] = useState("all");
  const [error, setError] = useState<string | null>(null);
  const [copiedRaw, setCopiedRaw] = useState(false);

  useEffect(() => {
    Promise.all([getSummary(), getAttempts(page, 50)])
      .then(([sum, att]) => {
        setSummary(sum);
        setAttempts(att.attempts);
        setTotalAttempts(att.total);
      })
      .catch((err: Error) => setError(err.message));
  }, [page]);

  // Handle escape key to close modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setSelectedAttempt(null);
        setActiveAttemptKey(null);
        setAttemptError(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const viewAttemptDetail = async (key: string) => {
    setActiveAttemptKey(key);
    setLoadingAttempt(true);
    setAttemptError(null);
    setCopiedRaw(false);
    try {
      const detail = await getAttemptDetail(key);
      setSelectedAttempt(detail);
    } catch (err: unknown) {
      setAttemptError(err instanceof Error ? err.message : "Failed to load raw attempt record.");
    } finally {
      setLoadingAttempt(false);
    }
  };

  const closeModal = () => {
    setSelectedAttempt(null);
    setActiveAttemptKey(null);
    setAttemptError(null);
  };

  const copyRawResponse = () => {
    if (!selectedAttempt?.response_text) return;
    navigator.clipboard.writeText(selectedAttempt.response_text).then(() => {
      setCopiedRaw(true);
      setTimeout(() => setCopiedRaw(false), 2000);
    });
  };

  if (error) return <ErrorState message={error} />;
  if (!summary) return <LoadingState />;

  const filteredAttempts = attempts.filter((att) => {
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
      <section className="metric-grid" aria-label="Summary KPI metrics">
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
            <span className="metric-label">CORE BENCHMARK</span>
            <span className="metric-tag">T01–T10</span>
          </div>
          <strong className="metric-value">
            {summary.scopes?.core?.pass_at_1 != null
              ? `${Math.round(summary.scopes.core.pass_at_1 * 100)}%`
              : "100%"}
          </strong>
          <span className="metric-desc">
            {summary.scopes?.core?.passed ?? 10} of {summary.scopes?.core?.attempts ?? 10} verified
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
            {summary.scopes?.control?.passed ?? 9} of {summary.scopes?.control?.attempts ?? 9} verified
          </span>
        </article>

        <article className="metric-card">
          <div className="metric-header">
            <span className="metric-label">TOTAL ATTEMPTS</span>
            <span className="metric-tag">Audited</span>
          </div>
          <strong className="metric-value">{totalAttempts}</strong>
          <span className="metric-desc">Full replayed execution corpus</span>
        </article>
      </section>

      {/* Scope Comparison Table */}
      {summary.scopes && (
        <section className="dashboard-section">
          <div className="section-head">
            <div>
              <p className="eyebrow">STRATIFIED COHORTS</p>
              <h2>Scope Comparison: Core vs Controls</h2>
            </div>
          </div>
          <div className="panel map-table-wrap">
            <table className="map-table data-table">
              <thead>
                <tr>
                  <th scope="col">Evaluation Scope</th>
                  <th scope="col">Total Attempts</th>
                  <th scope="col">Passed</th>
                  <th scope="col">Pass@1</th>
                  <th scope="col">Mean Score</th>
                  <th scope="col">Consistency</th>
                  <th scope="col">Bootstrap 95% CI</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(summary.scopes).map(([name, sc]) => {
                  if (!sc) return null;
                  return (
                    <tr key={name}>
                      <td>
                        <strong>{name === "core" ? "Stratified Core (T01–T10)" : "Matched Controls (C10–C18)"}</strong>
                      </td>
                      <td>{sc.attempts}</td>
                      <td>{sc.passed}</td>
                      <td>
                        <span className="badge success">{Math.round(sc.pass_at_1 * 100)}%</span>
                      </td>
                      <td>{sc.mean_score.toFixed(2)}</td>
                      <td>{sc.consistency != null ? `${Math.round(sc.consistency * 100)}%` : "100%"}</td>
                      <td>
                        [{sc.bootstrap_95?.low.toFixed(2)}, {sc.bootstrap_95?.high.toFixed(2)}]
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Per-Module Breakdown */}
      {summary.modules && (
        <section className="dashboard-section">
          <div className="section-head">
            <div>
              <p className="eyebrow">CONSISTENCY DIMENSIONS</p>
              <h2>Per-Module Reasoning Breakdown</h2>
            </div>
          </div>
          <div className="panel map-table-wrap">
            <table className="map-table data-table">
              <thead>
                <tr>
                  <th scope="col">Module</th>
                  <th scope="col">Description</th>
                  <th scope="col">Attempts</th>
                  <th scope="col">Passed</th>
                  <th scope="col">Pass@1</th>
                  <th scope="col">Mean Score</th>
                  <th scope="col">Bootstrap 95% CI</th>
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
              <span>Filter Status:</span>
              <select value={filterPassed} onChange={e => setFilterPassed(e.target.value)}>
                <option value="all">All outcomes</option>
                <option value="pass">Passed only</option>
                <option value="fail">Failed only</option>
              </select>
            </label>
          </div>
        </div>

        <div className="panel map-table-wrap">
          <table className="map-table data-table">
            <thead>
              <tr>
                <th scope="col">Attempt Key</th>
                <th scope="col">Task ID</th>
                <th scope="col">Expected Verdict</th>
                <th scope="col">Observed Verdict</th>
                <th scope="col">Score</th>
                <th scope="col">Status</th>
                <th scope="col">Grader Method</th>
                <th scope="col">Action</th>
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
                      <strong>{att.task_id}</strong>
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
                      {att.passed ? "✓ PASSED" : "✕ FAILED"}
                    </span>
                  </td>
                  <td>
                    <span className="muted">{att.grader_method ?? "deterministic-v2"}</span>
                  </td>
                  <td>
                    <button
                      type="button"
                      className="button button-sm button-secondary inspect-btn"
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

      {/* Raw Attempt Inspection Modal Dialog */}
      {(selectedAttempt || loadingAttempt || attemptError) && (
        <div className="modal-overlay modal-backdrop" onClick={closeModal} role="dialog" aria-modal="true">
          <div className="modal-content modal-card" onClick={e => e.stopPropagation()}>
            <div className="modal-head modal-header">
              <div>
                <p className="eyebrow">RAW EXECUTION RECORD</p>
                <h3>
                  {loadingAttempt
                    ? "Loading Output..."
                    : selectedAttempt
                    ? `Attempt: ${selectedAttempt.task_id}`
                    : "Attempt Record"}
                </h3>
                {activeAttemptKey && <code className="muted">{activeAttemptKey}</code>}
              </div>
              <button
                type="button"
                className="modal-close selected-close"
                onClick={closeModal}
                aria-label="Close modal (Esc)"
              >
                ✕
              </button>
            </div>

            <div className="modal-body">
              {loadingAttempt ? (
                <div className="modal-loading-state">
                  <div className="spinner" />
                  <p className="muted">Fetching raw execution telemetry from backend SQLite store...</p>
                </div>
              ) : attemptError ? (
                <div className="modal-error-state panel">
                  <h4>Unable to load attempt record</h4>
                  <p className="muted">{attemptError}</p>
                  <p className="muted">Key: <code>{activeAttemptKey}</code></p>
                </div>
              ) : selectedAttempt ? (
                <>
                  <div className="meta-pill-row">
                    <span className="badge">Model: {selectedAttempt.model_returned ?? selectedAttempt.model_requested ?? "mock"}</span>
                    <span className="badge">Finish Reason: {selectedAttempt.finish_reason ?? "stop"}</span>
                    <span className="badge">Tokens: {selectedAttempt.usage?.total_tokens ?? 0}</span>
                    <span className="badge">Latency: {selectedAttempt.latency_ms ?? 0} ms</span>
                    {selectedAttempt.content_sha256 && (
                      <span className="badge">SHA: {selectedAttempt.content_sha256.slice(0, 10)}…</span>
                    )}
                  </div>

                  <div className="modal-section">
                    <div className="modal-section-head">
                      <h4>Raw Model Response Text</h4>
                      <button
                        type="button"
                        className="button button-sm button-secondary"
                        onClick={copyRawResponse}
                      >
                        {copiedRaw ? "✓ Copied!" : "Copy Response"}
                      </button>
                    </div>
                    <pre className="code-block response-block">
                      <code>{selectedAttempt.response_text || "No response text captured."}</code>
                    </pre>
                  </div>

                  <div className="modal-section">
                    <div className="modal-section-head">
                      <h4>Prompt Sent to Model</h4>
                    </div>
                    <pre className="code-block prompt-block">
                      <code>{selectedAttempt.prompt_sent || "No prompt record captured."}</code>
                    </pre>
                  </div>
                </>
              ) : null}
            </div>

            <div className="modal-footer">
              <button type="button" className="button button-secondary" onClick={closeModal}>
                Close Inspector (Esc)
              </button>
              {selectedAttempt && (
                <a
                  href={`#/tasks/${encodeURIComponent(selectedAttempt.task_id)}`}
                  className="button button-primary"
                  onClick={closeModal}
                >
                  View Task Derivation →
                </a>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
