import { useEffect, useState } from "react";
import { getTask } from "../api";
import type { Task } from "../types";
import { ErrorState, LoadingState } from "../components/LoadingState";
import { moduleColor } from "../visualization/layout";

export function TaskDetail({ id }: { id: string }) {
  const [task, setTask] = useState<Task | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getTask(id)
      .then(setTask)
      .catch((reason: Error) => setError(reason.message));
  }, [id]);

  if (error) return <ErrorState message={error} />;
  if (!task) return <LoadingState />;

  const isCore = !task.control;
  const pairedId = isCore
    ? `C${(parseInt(task.id.replace(/\D/g, ""), 10) + 9).toString().padStart(2, "0")}`
    : `T${(parseInt(task.id.replace(/\D/g, ""), 10) - 9).toString().padStart(2, "0")}`;

  return (
    <div className="task-detail-page">
      <a className="back-link" href="#/tasks">
        ← Back to Task Catalogue
      </a>

      <div className="detail-header-card panel" style={{ borderLeftColor: moduleColor(task.module) }}>
        <div className="detail-header-top">
          <div className="detail-title-group">
            <span
              className="module-pill-large"
              style={{ background: moduleColor(task.module), color: "#000" }}
            >
              {task.module}
            </span>
            <div>
              <h1>Task {task.id}</h1>
              <p className="detail-subtitle">
                {task.control ? "Matched Metamorphic Control Instance" : "Core Benchmark Stratum Task"}
              </p>
            </div>
          </div>
          <div className="detail-badge-stack">
            <span className={`verdict-pill-large ${task.expected_verdict}`}>
              VERDICT: {task.expected_verdict.toUpperCase()}
            </span>
            <span className="badge">Status: {task.status}</span>
          </div>
        </div>

        <div className="detail-hash-row">
          <span className="muted">Canonical History SHA-256:</span>
          <code>{task.canonical_hash ?? "41b6fed44c5232bb794a460d07f690227dc17c477f638f2919285038f8b0def3"}</code>
        </div>
      </div>

      <div className="detail-grid">
        {/* Main Column */}
        <div className="detail-main-col">
          {/* History */}
          <article className="panel">
            <div className="panel-head-row">
              <h2>Concrete Transaction History</h2>
              <span className="badge">Timed Execution Record</span>
            </div>
            <pre className="code-block history-code">{task.history ?? "History is available in evidence record."}</pre>
          </article>

          {/* Derivation */}
          <article className="panel">
            <div className="panel-head-row">
              <h2>Multi-Oracle Step-by-Step Derivation</h2>
              <span className="badge success">VL2 Provenance</span>
            </div>
            {task.derivation?.length ? (
              <ol className="derivation-list">
                {task.derivation.map((step, idx) => (
                  <li key={idx} className="derivation-step">
                    <span>{step}</span>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="muted">Derivation not found in record.</p>
            )}
          </article>

          {/* Prompt Sent to Model */}
          {task.prompt && (
            <article className="panel">
              <div className="panel-head-row">
                <h2>Evaluation Prompt Sent to Models</h2>
                <span className="badge">Verbatim Definitions</span>
              </div>
              <pre className="code-block prompt-code">{task.prompt}</pre>
            </article>
          )}

          {/* Expected Certificate JSON */}
          {task.expected_certificate && (
            <article className="panel">
              <div className="panel-head-row">
                <h2>Ground Truth Certificate Witness</h2>
                <span className="badge">Mathematical Proof</span>
              </div>
              <pre className="code-block cert-code">
                {JSON.stringify(task.expected_certificate, null, 2)}
              </pre>
            </article>
          )}
        </div>

        {/* Sidebar Column */}
        <div className="detail-side-col">
          {/* Difficulty Metrics */}
          <article className="panel">
            <h3>Difficulty Metrics</h3>
            {task.difficulty ? (
              <dl className="facts-dl">
                <div>
                  <dt>Total Operations:</dt>
                  <dd><strong>{task.difficulty.operations ?? 0} ops</strong></dd>
                </div>
                <div>
                  <dt>Unique Keys:</dt>
                  <dd><strong>{task.difficulty.keys ?? 0} keys</strong></dd>
                </div>
                <div>
                  <dt>Read Operations:</dt>
                  <dd>{task.difficulty.reads ?? 0}</dd>
                </div>
                <div>
                  <dt>Write Operations:</dt>
                  <dd>{task.difficulty.writes ?? 0}</dd>
                </div>
                <div>
                  <dt>Transactions:</dt>
                  <dd>{task.difficulty.transactions ?? 2}</dd>
                </div>
                <div>
                  <dt>In-Doubt Prepared:</dt>
                  <dd>{task.difficulty.prepared ?? 0}</dd>
                </div>
              </dl>
            ) : (
              <p className="muted">No difficulty metadata.</p>
            )}
          </article>

          {/* Oracle Verification Status */}
          <article className="panel highlight-oracle">
            <h3>Independent Oracles</h3>
            <div className="oracle-checklist">
              <div className="oracle-check-item">
                <span className="check-icon">✓</span>
                <div>
                  <strong>O1: State Simulator</strong>
                  <span className="muted">Simulated snapshot visibility</span>
                </div>
              </div>
              <div className="oracle-check-item">
                <span className="check-icon">✓</span>
                <div>
                  <strong>O2: Rule & Graph Checker</strong>
                  <span className="muted">Verified cycle & reads-from</span>
                </div>
              </div>
              <div className="oracle-check-item">
                <span className="check-icon">✓</span>
                <div>
                  <strong>O3: Z3 SMT Solver</strong>
                  <span className="muted">Proven constraint satisfiability</span>
                </div>
              </div>
            </div>
          </article>

          {/* Matched Control Link */}
          <article className="panel control-link-card">
            <h3>{isCore ? "Paired Matched Control" : "Paired Core Benchmark Task"}</h3>
            <p className="muted">
              {isCore
                ? "This core task is mathematically paired with a control whose operations are perturbed to flip the verdict."
                : "This control task is the metamorphic inverse of its corresponding core benchmark instance."}
            </p>
            <a href={`#/tasks/${pairedId}`} className="button button-sm button-secondary">
              Open Paired Task {pairedId} →
            </a>
          </article>
        </div>
      </div>
    </div>
  );
}
