import { useEffect, useState } from "react";
import { getTasks } from "../api";
import type { Task } from "../types";
import { ErrorState, LoadingState } from "../components/LoadingState";
import { moduleColor } from "../visualization/layout";

const MODULE_SPECS = [
  {
    id: "M1",
    title: "Snapshot Isolation (Timed Histories)",
    citation: "Berenson et al. (1995); Adya (1999) D1",
    historyType: "Timed (start & commit integer timestamps)",
    rules: [
      {
        name: "Rule (a) Own Writes",
        text: "A read of key k that follows an earlier write of k by the same transaction T returns T's most recent write to k.",
      },
      {
        name: "Rule (b) Snapshot Reads",
        text: "Any other read of key k returns the version installed by the committed transaction with the greatest commit timestamp below start(T), or initial value (0).",
      },
      {
        name: "Rule (c) First Committer Wins",
        text: "No two committed transactions that write a common key are concurrent: start(T1) < commit(T2) and start(T2) < commit(T1) is forbidden.",
      },
    ],
    anomalies: [
      "aborted-read: reading uncommitted or aborted transaction data",
      "intermediate-read: reading an uninstalled intermediate write",
      "snapshot-read: reading a version installed after start timestamp",
      "concurrent write-write skew: concurrent writes to common keys",
    ],
  },
  {
    id: "M2",
    title: "Conflict Serializability (Commit-Ordered)",
    citation: "Adya (1999) D2; Berenson et al. (1995)",
    historyType: "Commit-ordered (dependency graph edges)",
    rules: [
      {
        name: "Edge wr (reads-from)",
        text: "Tj reads the version of key k installed by committed transaction Ti.",
      },
      {
        name: "Edge ww (overwrite)",
        text: "Ti installs a version of key k and Tj installs the next version of k.",
      },
      {
        name: "Edge rw (anti-dependency)",
        text: "Ti reads a version of k and Tj installs the next version of k after it.",
      },
      {
        name: "Cycle Invariance",
        text: "A history is serializable iff the directed dependency graph has no cycles. Cycles are named by edge types.",
      },
    ],
    anomalies: [
      "G1a: Aborted read",
      "G1b: Intermediate read",
      "G1c: Circular dependency made only of ww and wr edges",
      "G-single: Cycle with exactly one rw edge",
      "G2-item: Cycle with two or more rw edges (classic write skew)",
    ],
  },
  {
    id: "M3",
    title: "In-Doubt Transactions (Two-Phase Commit)",
    citation: "Formal 2PC Completion Rule D3",
    historyType: "Prepared state uncertainty",
    rules: [
      {
        name: "Completion Definition",
        text: "A prepared transaction either committed at its stated timestamp or aborted. A completion fixes every in-doubt transaction as committed or aborted.",
      },
      {
        name: "2^k Branch Evaluation",
        text: "A history with k in-doubt transactions is valid iff all 2^k completions are valid, invalid iff all 2^k completions are invalid, and undetermined otherwise.",
      },
    ],
    anomalies: [
      "branch divergence: one branch valid, another branch invalid -> undetermined",
    ],
  },
  {
    id: "M4",
    title: "Register Linearizability",
    citation: "Herlihy & Wing (1990) D4",
    historyType: "Single-register concurrent invocations & responses",
    rules: [
      {
        name: "Real-Time Precedence",
        text: "If operation A responds before operation B is invoked, A must precede B in the sequential linearization order.",
      },
      {
        name: "Register Legality",
        text: "Each read operation must return the value of the most recent preceding write operation in the linearization order, or initial value 0.",
      },
    ],
    anomalies: [
      "inversion of real-time order",
      "stale register read violating sequential order",
    ],
  },
  {
    id: "M5",
    title: "Strict Serializability",
    citation: "Papadimitriou (1979); Herlihy & Wing",
    historyType: "Multi-operation transactions with physical real-time order",
    rules: [
      {
        name: "Real-Time Order Compatibility",
        text: "Serializability plus external consistency: if T1 commits before T2 starts in real time, T1 must precede T2 in the serialization order.",
      },
    ],
    anomalies: ["stale reads across non-overlapping transactions"],
  },
];

export function Modules() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getTasks()
      .then((t) => setTasks(t))
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (error) return <ErrorState message={error} />;
  if (loading) return <LoadingState />;

  return (
    <div className="modules-page">
      <div className="page-heading">
        <div className="eyebrow-group">
          <p className="eyebrow">FORMAL DATABASE CONSISTENCY CRITERIA</p>
          <span className="live-status-pill">
            <span className="status-dot" />
            STANDARDS-ALIGNED SPECIFICATIONS
          </span>
        </div>
        <h1>Consistency Modules & Formal Rules</h1>
        <p className="lede">
          The single source of truth for all oracles, prompts, and graders.
          Every task prompt contains these exact definitions verbatim,
          guaranteeing that models are evaluated on formal rules rather than
          ambiguous terminology.
        </p>
      </div>

      {/* Syntax Guide Panel */}
      <section className="syntax-guide-card panel">
        <div className="syntax-head">
          <span className="syntax-badge">SPECIFICATION GRAMMAR</span>
          <h3>Transaction History Notation Grammar</h3>
        </div>
        <p className="muted">
          Every transaction history evaluated by the benchmark follows this
          strict, unambiguous syntax:
        </p>
        <div className="grammar-example">
          <code>
            Keys: x, y. Initial: x=0, y=0. Every written value is unique per
            key.
            <br />
            T1 start=1 commit=6 r(x)=0 w(y)=1
            <br />
            T2 start=2 commit=5 r(y)=0 w(x)=1
          </code>
        </div>
        <div className="grammar-breakdown">
          <div className="grammar-item">
            <strong>T1, T2:</strong>
            <span>Distinct transaction identifiers.</span>
          </div>
          <div className="grammar-item">
            <strong>start=t, commit=t:</strong>
            <span>
              Distinct integer timestamps on a linear real-time scale.
            </span>
          </div>
          <div className="grammar-item">
            <strong>r(k)=v:</strong>
            <span>Read key k returning value v.</span>
          </div>
          <div className="grammar-item">
            <strong>w(k)=v:</strong>
            <span>Write unique value v to key k.</span>
          </div>
          <div className="grammar-item">
            <strong>prepared:</strong>
            <span>In-doubt transaction awaiting 2PC completion (M3).</span>
          </div>
        </div>
      </section>

      {/* Module Specifications */}
      <div className="modules-list">
        {MODULE_SPECS.map((spec) => {
          const modTasks = tasks.filter((t) => t.module === spec.id);
          const color = moduleColor(spec.id);
          return (
            <article
              key={spec.id}
              className="module-detail-panel panel"
              style={{ borderLeft: `4px solid ${color}` }}
            >
              <div className="panel-top">
                <div className="panel-title-group">
                  <span
                    className="module-pill-large"
                    style={{ background: color, color: "#042f2e" }}
                  >
                    {spec.id}
                  </span>
                  <div>
                    <h2>{spec.title}</h2>
                    <span className="citation">{spec.citation}</span>
                  </div>
                </div>
                <div className="panel-badge-group">
                  <span className="badge">{spec.historyType}</span>
                  <span className="badge success">
                    {modTasks.length} tasks in corpus
                  </span>
                </div>
              </div>

              {/* Rules List */}
              <div className="rules-section">
                <h4>Formal Validity Axioms</h4>
                <div className="rules-grid">
                  {spec.rules.map((rule, idx) => (
                    <div key={idx} className="rule-card">
                      <strong>{rule.name}</strong>
                      <p>{rule.text}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Anomalies List */}
              <div className="anomalies-section">
                <h4>Detectable Invalidation Anomalies</h4>
                <ul className="anomalies-list">
                  {spec.anomalies.map((anom, idx) => (
                    <li key={idx}>
                      <code>{anom}</code>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Linked Tasks */}
              {modTasks.length > 0 && (
                <div className="linked-tasks-section">
                  <h4>Associated Evaluation Tasks</h4>
                  <div className="linked-tasks-grid">
                    {modTasks.map((t) => (
                      <a
                        key={t.id}
                        href={`#/tasks/${t.id}`}
                        className="linked-task-chip"
                      >
                        <strong>{t.id}</strong>
                        <span
                          className="task-verdict-dot"
                          style={{
                            background:
                              t.expected_verdict === "valid"
                                ? "var(--pass)"
                                : "var(--fail)",
                          }}
                        />
                        <span>{t.expected_verdict}</span>
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </article>
          );
        })}
      </div>
    </div>
  );
}
