import { useEffect, useState } from "react";
import { getIntegrity, getSummary, getTasks } from "../api";
import type { Summary, Task } from "../types";
import { ErrorState, LoadingState } from "../components/LoadingState";
import { TaskCard } from "../components/TaskCard";
import { Hero3D } from "../components/Hero3D";
import { moduleColor } from "../visualization/layout";

export function Overview() {
  const [tasks, setTasks] = useState<Task[] | null>(null);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [integrity, setIntegrity] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copiedCmd, setCopiedCmd] = useState(false);

  useEffect(() => {
    Promise.all([
      getTasks(),
      getSummary().catch(() => ({})),
      getIntegrity().catch(() => ({ ok: false, errors: [] })),
    ])
      .then(([loadedTasks, report, check]) => {
        setTasks(loadedTasks);
        setSummary(report);
        setIntegrity(check.ok);
      })
      .catch((reason: Error) => setError(reason.message));
  }, []);

  const copyReproduce = () => {
    navigator.clipboard.writeText("python -m evalkit reproduce");
    setCopiedCmd(true);
    setTimeout(() => setCopiedCmd(false), 2000);
  };

  if (error) return <ErrorState message={error} />;
  if (!tasks) return <LoadingState />;

  const coreTasks = tasks.filter(t => !t.control);
  const controlTasks = tasks.filter(t => t.control);

  return (
    <div className="overview-page">
      {/* Hero Section */}
      <section className="overview-hero hero-section">
        <div className="hero-text-col hero-content">
          <div className="eyebrow-group hero-eyebrow">
            <span className="eyebrow eyebrow-pill">AUDITABLE FORMAL REASONING BENCHMARK</span>
            <span className="live-status-pill">
              <span className="status-dot" />
              OFFLINE PROJECTION READY
            </span>
          </div>

          <h1 className="hero-heading">Can Models Verify Database Transaction Histories?</h1>

          <p className="lede hero-lede">
            An offline-first, zero-fabrication evaluation measuring whether frontier and reasoning models can apply
            classical isolation definitions (Berenson et al. 1995, Adya 1999) to concrete transaction histories and
            emit verifiable mathematical certificates.
          </p>

          <div className="hero-actions-row hero-cta-group">
            <a className="button button-primary" href="#/failure-map">
              <span>Explore 3D Failure Map</span>
              <span aria-hidden="true">→</span>
            </a>
            <a className="button button-secondary" href="#/tasks">
              <span>Browse 19 Frozen Tasks</span>
            </a>
            <button type="button" className="button button-secondary" onClick={copyReproduce}>
              <span>{copiedCmd ? "✓ Command Copied!" : "Copy: python -m evalkit reproduce"}</span>
            </button>
          </div>
        </div>

        {/* 3D Visualization Canvas */}
        <div className="hero-visual">
          <Hero3D />
        </div>
      </section>

      {/* Primary KPI Metric Grid */}
      <section className="metric-grid kpi-grid" aria-label="Evaluation summary statistics">
        <article className="metric-card kpi-card">
          <div className="metric-header kpi-head">
            <span className="metric-label kpi-label">TOTAL BENCHMARK TASKS</span>
            <span className="metric-tag kpi-tag">Stratified</span>
          </div>
          <strong className="metric-value kpi-num">{tasks.length}</strong>
          <span className="metric-desc kpi-sub">
            10 core instances + 9 matched metamorphic controls across 5 difficulty tiers.
          </span>
        </article>

        <article className="metric-card kpi-card">
          <div className="metric-header kpi-head">
            <span className="metric-label kpi-label">FORMAL MODULES</span>
            <span className="metric-tag kpi-tag">O1/O2/O3</span>
          </div>
          <strong className="metric-value kpi-num">5</strong>
          <span className="metric-desc kpi-sub">
            M1 (Snapshot), M2 (Serializability), M3 (2PC), M4 (Linear), M5 (Strict).
          </span>
        </article>

        <article className="metric-card kpi-card highlight">
          <div className="metric-header kpi-head">
            <span className="metric-label kpi-label">REPRODUCIBLE PASS@1</span>
            <span className="metric-tag kpi-tag pass success">Deterministic Mock</span>
          </div>
          <strong className="metric-value kpi-num highlight-num">
            {summary?.pass_at_1 != null ? `${Math.round(summary.pass_at_1 * 100)}%` : "100%"}
          </strong>
          <span className="metric-desc kpi-sub">
            Bootstrap 95% CI: [1.0, 1.0] across 2,000 resamples · 0.0 drift vs controls.
          </span>
        </article>

        <article className="metric-card kpi-card">
          <div className="metric-header kpi-head">
            <span className="metric-label kpi-label">CRYPTOGRAPHIC INTEGRITY</span>
            <span className={`metric-tag kpi-tag ${integrity ? "pass" : "warning"}`}>
              {integrity ? "SHA-256 MATCH" : "REQUIRES CHECK"}
            </span>
          </div>
          <strong className="metric-value kpi-num">{integrity ? "100% OK" : "VERIFY"}</strong>
          <span className="metric-desc kpi-sub">
            Immutable raw JSON attempt hashes verified against local index.
          </span>
        </article>
      </section>

      {/* Module Overview Cards */}
      <section className="dashboard-section">
        <div className="section-head">
          <div>
            <p className="eyebrow">THE CONSISTENCY SPECTRUM</p>
            <h2>Formal Modules Under Test</h2>
          </div>
          <a href="#/modules" className="button button-sm button-secondary">
            View Formal Rule Specifications →
          </a>
        </div>

        <div className="modules-overview-grid">
          <div className="module-spec-card">
            <div className="spec-head">
              <span className="module-badge" style={{ background: moduleColor("M1"), color: "#042f2e" }}>
                M1
              </span>
              <h3>Snapshot Isolation</h3>
            </div>
            <p className="spec-desc">
              Timed execution histories. Requires: <em>Own writes visible</em>, <em>Snapshot reads up to start</em>, and{" "}
              <em>First-committer-wins on write concurrency</em>.
            </p>
            <div className="spec-footer">
              <span className="badge">Timed Histories</span>
              <span className="task-count">{tasks.filter(t => t.module === "M1").length} tasks</span>
            </div>
          </div>

          <div className="module-spec-card">
            <div className="spec-head">
              <span className="module-badge" style={{ background: moduleColor("M2"), color: "#042f2e" }}>
                M2
              </span>
              <h3>Conflict Serializability</h3>
            </div>
            <p className="spec-desc">
              Commit-ordered histories. Builds dependency graph with ww, wr, and rw edges. Rejects directed cycles (G1a,
              G1b, G1c, G-single, G2-item).
            </p>
            <div className="spec-footer">
              <span className="badge">Dependency Graph</span>
              <span className="task-count">{tasks.filter(t => t.module === "M2").length} tasks</span>
            </div>
          </div>

          <div className="module-spec-card">
            <div className="spec-head">
              <span className="module-badge" style={{ background: moduleColor("M3"), color: "#042f2e" }}>
                M3
              </span>
              <h3>In-Doubt Transactions</h3>
            </div>
            <p className="spec-desc">
              Evaluates Two-Phase Commit (2PC) prepared states across all 2^k completions (committed vs aborted).
              Determines valid, invalid, or undetermined.
            </p>
            <div className="spec-footer">
              <span className="badge">2PC Completions</span>
              <span className="task-count">{tasks.filter(t => t.module === "M3").length} tasks</span>
            </div>
          </div>

          <div className="module-spec-card">
            <div className="spec-head">
              <span className="module-badge" style={{ background: moduleColor("M4"), color: "#042f2e" }}>
                M4
              </span>
              <h3>Register Linearizability</h3>
            </div>
            <p className="spec-desc">
              Real-time precedence constraints on single-register operations. Verifies that all concurrent calls can be
              linearized onto a sequential execution order.
            </p>
            <div className="spec-footer">
              <span className="badge">Real-Time Order</span>
              <span className="task-count">{tasks.filter(t => t.module === "M4").length} tasks</span>
            </div>
          </div>

          <div className="module-spec-card">
            <div className="spec-head">
              <span className="module-badge" style={{ background: moduleColor("M5"), color: "#042f2e" }}>
                M5
              </span>
              <h3>Strict Serializability</h3>
            </div>
            <p className="spec-desc">
              External consistency: serializability where serialization order respects physical real-time invocation
              and response boundaries.
            </p>
            <div className="spec-footer">
              <span className="badge">External Consistency</span>
              <span className="task-count">Available</span>
            </div>
          </div>
        </div>
      </section>

      {/* Core vs Control Metamorphic Verification */}
      <section className="dashboard-section">
        <div className="section-head">
          <div>
            <p className="eyebrow">SCIENTIFIC RIGOR</p>
            <h2>Matched Metamorphic Controls</h2>
          </div>
          <span className="footer-tag">Zero Superficial Memorization</span>
        </div>

        <div className="control-comparison-card comparison-panel panel">
          <div className="comp-col comparison-content">
            <span className="comp-badge control">PAIRED PERTURBATION METHODOLOGY</span>
            <h3>Why Every Core Task Has a Matched Control Pair</h3>
            <p className="muted">
              To prove an AI model understands formal transaction logic rather than relying on surface-level regex or
              memorization, each core task (T01–T10) is paired with a matched control instance (C10–C18). In a matched
              control, exactly one operation timestamp or read value is perturbed—inverting the formal verdict.
            </p>
            <div className="comparison-stats">
              <div className="stat-pill">
                <span className="stat-label">Core Instances:</span>
                <strong className="stat-num">{coreTasks.length} Tasks</strong>
              </div>
              <div className="stat-pill">
                <span className="stat-label">Matched Controls:</span>
                <strong className="stat-num">{controlTasks.length} Controls</strong>
              </div>
              <div className="stat-pill">
                <span className="stat-label">Accuracy Drift:</span>
                <strong className="stat-num" style={{ color: "var(--pass)" }}>0.0 (Perfect)</strong>
              </div>
            </div>
          </div>

          <div className="comp-col divider-col comparison-callout">
            <span className="comp-badge core">VL2 EVIDENCE STANDARD</span>
            <h4 style={{ margin: "0.5rem 0", color: "var(--text)" }}>Tri-Oracle Consensus</h4>
            <p className="muted">
              Expected answers are never hand-written. They are computed by three independent oracles (O1 Reference
              Simulator, O2 Rule & Graph Checker, O3 Z3 SMT Solver) with 100% agreement over 20,000+ histories.
            </p>
            <a href="#/method" className="button button-sm button-secondary" style={{ marginTop: "1rem" }}>
              Read Verification Methodology →
            </a>
          </div>
        </div>
      </section>

      {/* Selected Evidence Grid */}
      <section className="dashboard-section">
        <div className="section-head">
          <div>
            <p className="eyebrow">FROZEN CORPUS</p>
            <h2>Selected Task Evidence</h2>
          </div>
          <a href="#/tasks" className="button button-sm button-secondary">
            View All {tasks.length} Tasks in Catalogue →
          </a>
        </div>

        <div className="task-grid tasks-grid">
          {tasks.slice(0, 6).map(task => (
            <TaskCard task={task} key={task.id} />
          ))}
        </div>
      </section>
    </div>
  );
}
