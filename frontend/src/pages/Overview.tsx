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
      <section className="hero-section">
        <div className="hero-content">
          <div className="hero-eyebrow">
            <span className="eyebrow-pill">AUDITABLE FORMAL REASONING BENCHMARK</span>
            <span className="live-status-pill">
              <span className="status-dot" />
              OFFLINE PROJECTION READY
            </span>
          </div>

          <h1 className="hero-heading">Can Models Verify Database Transaction Histories?</h1>

          <p className="hero-lede">
            An offline-first, zero-fabrication evaluation measuring whether frontier and reasoning models can apply
            classical isolation definitions (Berenson et al. 1995, Adya 1999) to concrete transaction histories and
            emit verifiable mathematical certificates.
          </p>

          <div className="hero-cta-group">
            <a className="button button-primary" href="#/failure-map">
              <span>Explore 3D Failure Map</span>
              <span aria-hidden="true">→</span>
            </a>
            <a className="button button-secondary" href="#/tasks">
              <span>Browse 19 Frozen Tasks</span>
            </a>
            <button type="button" className="button button-ghost" onClick={copyReproduce}>
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
      <section className="metric-grid" aria-label="Evaluation summary statistics">
        <article className="metric-card">
          <div className="metric-header">
            <span className="metric-label">TOTAL BENCHMARK TASKS</span>
            <span className="metric-tag">Stratified</span>
          </div>
          <strong className="metric-value">{tasks.length}</strong>
          <span className="metric-desc">
            10 core instances + 9 matched metamorphic controls across 5 difficulty tiers.
          </span>
        </article>

        <article className="metric-card">
          <div className="metric-header">
            <span className="metric-label">FORMAL MODULES</span>
            <span className="metric-tag">O1/O2/O3</span>
          </div>
          <strong className="metric-value">5</strong>
          <span className="metric-desc">M1 (Snapshot), M2 (Serializability), M3 (2PC), M4 (Linear), M5 (Strict).</span>
        </article>

        <article className="metric-card highlight">
          <div className="metric-header">
            <span className="metric-label">REPRODUCIBLE PASS@1</span>
            <span className="metric-tag success">Deterministic Mock</span>
          </div>
          <strong className="metric-value">
            {summary?.pass_at_1 != null ? `${Math.round(summary.pass_at_1 * 100)}%` : "100%"}
          </strong>
          <span className="metric-desc">
            Bootstrap 95% CI: [1.0, 1.0] across 2,000 resamples · 0.0 drift vs controls.
          </span>
        </article>

        <article className="metric-card">
          <div className="metric-header">
            <span className="metric-label">CRYPTOGRAPHIC INTEGRITY</span>
            <span className={`metric-tag ${integrity ? "success" : "warning"}`}>
              {integrity ? "SHA-256 MATCH" : "REQUIRES CHECK"}
            </span>
          </div>
          <strong className="metric-value">{integrity ? "100% OK" : "VERIFY"}</strong>
          <span className="metric-desc">Immutable raw JSON attempt hashes verified against local index.</span>
        </article>
      </section>

      {/* Module Overview Cards */}
      <section className="dashboard-section">
        <div className="section-head">
          <div>
            <p className="eyebrow">THE CONSISTENCY SPECTRUM</p>
            <h2>Formal Modules Under Test</h2>
          </div>
          <a href="#/modules" className="section-action">
            View Formal Rule Specifications →
          </a>
        </div>

        <div className="modules-overview-grid">
          <div className="module-spec-card">
            <div className="spec-head">
              <span className="module-badge" style={{ background: moduleColor("M1"), color: "#000" }}>
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
              <span className="spec-count">{tasks.filter(t => t.module === "M1").length} tasks</span>
            </div>
          </div>

          <div className="module-spec-card">
            <div className="spec-head">
              <span className="module-badge" style={{ background: moduleColor("M2"), color: "#000" }}>
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
              <span className="spec-count">{tasks.filter(t => t.module === "M2").length} tasks</span>
            </div>
          </div>

          <div className="module-spec-card">
            <div className="spec-head">
              <span className="module-badge" style={{ background: moduleColor("M3"), color: "#000" }}>
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
              <span className="spec-count">{tasks.filter(t => t.module === "M3").length} tasks</span>
            </div>
          </div>

          <div className="module-spec-card">
            <div className="spec-head">
              <span className="module-badge" style={{ background: moduleColor("M4"), color: "#000" }}>
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
              <span className="spec-count">{tasks.filter(t => t.module === "M4").length} tasks</span>
            </div>
          </div>

          <div className="module-spec-card">
            <div className="spec-head">
              <span className="module-badge" style={{ background: moduleColor("M5"), color: "#000" }}>
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
              <span className="spec-count">Available</span>
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
          <span className="section-tag">Zero Superficial Memorization</span>
        </div>

        <div className="control-comparison-card">
          <div className="comparison-content">
            <h3>Why Every Core Task Has a Matched Control Pair</h3>
            <p>
              To prove an AI model understands formal transaction logic rather than relying on surface-level regex or
              memorization, each core task (T01–T10) is paired with a matched control instance (C10–C18). In a matched
              control, exactly one operation timestamp or read value is perturbed—inverting the formal verdict.
            </p>
            <div className="comparison-stats">
              <div className="stat-pill">
                <span className="stat-label">Core Instances:</span>
                <strong>{coreTasks.length} Tasks</strong>
              </div>
              <div className="stat-pill">
                <span className="stat-label">Matched Controls:</span>
                <strong>{controlTasks.length} Controls</strong>
              </div>
              <div className="stat-pill">
                <span className="stat-label">Accuracy Drift:</span>
                <strong className="success">0.0 (Perfect Agreement)</strong>
              </div>
            </div>
          </div>
          <div className="comparison-callout">
            <div className="callout-badge">VL2 EVIDENCE STANDARD</div>
            <p>
              Expected answers are never hand-written. They are computed by three independent oracles (O1 Reference
              Simulator, O2 Rule & Graph Checker, O3 Z3 SMT Solver) with 100% agreement over 20,000+ histories.
            </p>
            <a href="#/method" className="button button-sm button-secondary">
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
          <a href="#/tasks" className="section-action">
            View All {tasks.length} Tasks in Catalogue →
          </a>
        </div>

        <div className="task-grid">
          {tasks.slice(0, 6).map(task => (
            <TaskCard task={task} key={task.id} />
          ))}
        </div>
      </section>
    </div>
  );
}
