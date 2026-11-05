import { useEffect, useState } from "react";
import { getFailures, getFailuresBreakdown } from "../api";
import type { FailureBreakdown, FailureItem } from "../types";
import { ErrorState, LoadingState } from "../components/LoadingState";

const TAXONOMY_DEFINITIONS = [
  {
    tag: "wrong_verdict",
    title: "Wrong Verdict",
    severity: "High",
    color: "#ef4444",
    description:
      "The model concluded 'valid' for an invalid history, or 'invalid' for a valid history. Demonstrates fundamental failure to evaluate consistency rules.",
    typicalCause:
      "Overlooking an uncommitted write, missing an rw anti-dependency edge, or misunderstanding snapshot start times.",
  },
  {
    tag: "wrong_certificate",
    title: "Wrong Certificate",
    severity: "Critical",
    color: "#f97316",
    description:
      "The model arrived at the correct verdict string, but provided an invalid or hallucinated certificate (e.g. inventing a cycle that does not exist in the history, or citing incorrect reads-from mappings).",
    typicalCause:
      "Hallucinating dependency edges without verifying the actual version order or commit sequence.",
  },
  {
    tag: "calculation_error",
    title: "Calculation / Timestamp Error",
    severity: "Medium",
    color: "#eab308",
    description:
      "The model miscalculated integer timestamps (e.g. asserting start(T1) < commit(T2) when the opposite holds in the concrete history).",
    typicalCause:
      "Arithmetic or comparison error on integer timestamps in timed histories (M1 Snapshot Isolation).",
  },
  {
    tag: "format_violation",
    title: "Format / Schema Violation",
    severity: "Medium",
    color: "#a855f7",
    description:
      "The model failed to produce a valid fenced JSON block matching the required output schema, or omitted mandatory fields like 'verdict' or 'certificate'.",
    typicalCause:
      "Unfenced reasoning output, malformed JSON syntax, or conversational filler before the JSON block.",
  },
  {
    tag: "incomplete_answer",
    title: "Incomplete Answer",
    severity: "Medium",
    color: "#3b82f6",
    description:
      "The model provided an ambiguous response, stopped reasoning prematurely, or stated that the history cannot be evaluated without giving a valid 2PC branch completion analysis.",
    typicalCause:
      "Token truncation, hesitation, or failure to explore all 2^k completions in M3 (In-doubt transactions).",
  },
  {
    tag: "refusal",
    title: "Model Refusal",
    severity: "Low",
    color: "#6b7280",
    description:
      "The model explicitly declined to answer or issued a boilerplate safety disclaimer instead of performing mathematical history evaluation.",
    typicalCause:
      "False-positive alignment triggers on words like 'transaction', 'abort', or 'exploit'.",
  },
];

export function Failures() {
  const [breakdown, setBreakdown] = useState<FailureBreakdown | null>(null);
  const [failures, setFailures] = useState<FailureItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      getFailuresBreakdown().catch(() => ({ total: 0, by_reason: {} })),
      getFailures().catch(() => []),
    ])
      .then(([bd, fl]) => {
        setBreakdown(bd);
        setFailures(fl);
      })
      .catch((err: Error) => setError(err.message));
  }, []);

  if (error) return <ErrorState message={error} />;
  if (!breakdown) return <LoadingState />;

  return (
    <div className="failures-page">
      <div className="page-heading">
        <div className="eyebrow-group">
          <p className="eyebrow">DIAGNOSTIC REASONING BREAKDOWN</p>
          <span className="live-status-pill">
            <span className="status-dot" />
            6-CLASS TAXONOMY
          </span>
        </div>
        <h1>Failure Mode Taxonomy & Analysis</h1>
        <p className="lede">
          Models are evaluated not merely on binary text match, but on
          certificate soundness. When an attempt fails, it is deterministically
          classified into one of six failure categories. Human review is never
          claimed or required.
        </p>
      </div>

      {/* Summary KPI Banner */}
      <section className="failure-summary-panel">
        <div className="panel-col">
          <span className="label">TOTAL LOGGED FAILURES</span>
          <strong className="huge-num">{breakdown.total}</strong>
          <span className="sub">In current fixture</span>
        </div>
        <div className="panel-col-desc">
          <h3>Reproducible Fixture Status</h3>
          <p>
            The bundled mock provider is a deterministic pipeline fixture with
            100% pass@1. When testing live commercial providers (e.g. Groq,
            Gemini, OpenRouter), failures populate into the taxonomy cards below
            and project onto the 3D Failure Map.
          </p>
          <a href="#/failure-map" className="button button-sm button-primary">
            Explore Failure Clusters on 3D Map →
          </a>
        </div>
      </section>

      {/* 6-Category Taxonomy Cards */}
      <section className="dashboard-section">
        <div className="section-head">
          <div>
            <p className="eyebrow">FORMAL CLASSIFICATION</p>
            <h2>The 6 Failure Modes</h2>
          </div>
        </div>

        <div className="taxonomy-grid">
          {TAXONOMY_DEFINITIONS.map((tax) => {
            const count = breakdown.by_reason[tax.tag] ?? 0;
            return (
              <div
                key={tax.tag}
                className="taxonomy-card"
                style={{ borderTopColor: tax.color }}
              >
                <div className="tax-head">
                  <div>
                    <span className="tax-tag" style={{ color: tax.color }}>
                      {tax.tag}
                    </span>
                    <h3>{tax.title}</h3>
                  </div>
                  <span
                    className="count-badge"
                    style={{ background: `${tax.color}20`, color: tax.color }}
                  >
                    {count} instances
                  </span>
                </div>
                <p className="tax-desc">{tax.description}</p>
                <div className="tax-cause">
                  <strong>Typical Root Cause:</strong>
                  <p>{tax.typicalCause}</p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Live Failures Table if any exist */}
      {failures.length > 0 && (
        <section className="dashboard-section">
          <div className="section-head">
            <div>
              <p className="eyebrow">RECORDED INCIDENTS</p>
              <h2>Logged Model Failures ({failures.length})</h2>
            </div>
          </div>

          <div className="panel map-table-wrap">
            <table className="map-table">
              <thead>
                <tr>
                  <th>Task ID</th>
                  <th>Model</th>
                  <th>Failure Tag</th>
                  <th>Reason</th>
                </tr>
              </thead>
              <tbody>
                {failures.map((f, i) => (
                  <tr key={f.id ?? i}>
                    <td>
                      <a
                        href={`#/tasks/${encodeURIComponent(f.task_id)}`}
                        className="table-link"
                      >
                        {f.task_id}
                      </a>
                    </td>
                    <td>{f.model}</td>
                    <td>
                      <span className="badge warning">{f.tag}</span>
                    </td>
                    <td>{f.reason ?? "Automated classification"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
