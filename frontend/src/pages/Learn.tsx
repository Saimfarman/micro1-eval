import { useState } from "react";

export function Learn() {
  const [selectedScenario, setSelectedScenario] = useState<
    "write_skew" | "dirty_read" | "lost_update"
  >("write_skew");

  const scenarios = {
    write_skew: {
      title: "Write Skew (G2-item Cycle)",
      module: "M2 Serializability",
      history:
        "Keys: x, y. Initial: x=0, y=0.\nT1 start=1 commit=6 r(x)=0 w(y)=1\nT2 start=2 commit=5 r(y)=0 w(x)=1",
      explanation:
        "T1 reads x=0 and updates y=1. Concurrently, T2 reads y=0 and updates x=1. Under Snapshot Isolation this is permitted (neither overwrote the other's written key), but under Serializability it creates an rw-cycle: T1 reads initial x before T2's write (T1 -> T2), and T2 reads initial y before T1's write (T2 -> T1). This directed cycle proves no serial equivalent exists!",
      verdict: "INVALID under Serializability (Valid under Snapshot Isolation)",
    },
    dirty_read: {
      title: "Dirty / Aborted Read (G1a Anomaly)",
      module: "M1 & M2",
      history:
        "Keys: x. Initial: x=0.\nT1 start=1 abort=4 w(x)=99\nT2 start=2 commit=6 r(x)=99",
      explanation:
        "T1 writes x=99 but later aborts. T2 reads x=99 written by T1. Because T1 was aborted, its written versions must never be visible to any committed transaction. Reading uncommitted or aborted writes violates both Snapshot Isolation and Serializability.",
      verdict: "INVALID under both M1 and M2",
    },
    lost_update: {
      title: "Concurrent Overlapping Writes (First-Committer-Wins Violation)",
      module: "M1 Snapshot Isolation",
      history:
        "Keys: x. Initial: x=0.\nT1 start=1 commit=5 w(x)=1\nT2 start=2 commit=6 w(x)=2",
      explanation:
        "T1 and T2 run concurrently (start(T2)=2 < commit(T1)=5) and both write to the same key x. Snapshot Isolation enforces the 'first-committer-wins' rule: concurrent transactions writing to a common key must abort one transaction to prevent lost updates.",
      verdict: "INVALID under Snapshot Isolation",
    },
  };

  const current = scenarios[selectedScenario];

  return (
    <div className="learn-page">
      <div className="page-heading">
        <div className="eyebrow-group">
          <p className="eyebrow">INTERACTIVE EDUCATIONAL PRIMER</p>
          <span className="live-status-pill">
            <span className="status-dot" />
            SELF-CONTAINED COURSE
          </span>
        </div>
        <h1>Understanding Transaction Consistency & Oracles</h1>
        <p className="lede">
          A step-by-step primer on database isolation levels, dependency graph
          anomalies, and how automated mathematical oracles verify transaction
          histories.
        </p>
      </div>

      {/* Guide Steps Grid */}
      <div className="learn-steps-grid">
        <div className="learn-step-card panel">
          <div className="step-tag">LESSON 1</div>
          <h3>Why Isolation Matters</h3>
          <p>
            When multiple transactions execute concurrently on a database, their
            interleaved operations can cause corrupted states—such as
            double-spending account balances or displaying phantom records.
            Classical database theory classifies these anomalies into formal
            levels: <em>Read Committed</em>, <em>Snapshot Isolation</em>, and{" "}
            <em>Serializability</em>.
          </p>
        </div>

        <div className="learn-step-card panel">
          <div className="step-tag">LESSON 2</div>
          <h3>The Anatomy of a History</h3>
          <p>
            A history records the exact chronological sequence of operations:
          </p>
          <code>T1 start=1 commit=6 r(x)=0 w(y)=1</code>
          <p>
            <code>start=1</code> marks when T1 begins reading its snapshot.{" "}
            <code>r(x)=0</code> means T1 read value 0 from key x.{" "}
            <code>w(y)=1</code> writes value 1 to key y. <code>commit=6</code>{" "}
            is the linear commit point.
          </p>
        </div>

        <div className="learn-step-card panel">
          <div className="step-tag">LESSON 3</div>
          <h3>The Three Dependency Edges</h3>
          <p>
            Conflict Serializability (Adya 1999) models history as a directed
            graph with 3 edge types:
          </p>
          <ul>
            <li>
              <strong>wr (reads-from):</strong> Ti writes a version, and Tj
              reads that version.
            </li>
            <li>
              <strong>ww (overwrite):</strong> Ti writes a version, and Tj
              overwrites it next.
            </li>
            <li>
              <strong>rw (anti-dependency):</strong> Ti reads an old version
              before Tj writes a new version.
            </li>
          </ul>
        </div>

        <div className="learn-step-card panel">
          <div className="step-tag">LESSON 4</div>
          <h3>What Is a Certificate?</h3>
          <p>A certificate is a mathematical witness proving the verdict:</p>
          <ul>
            <li>
              <strong>Valid Certificate:</strong> The complete mapping of which
              committed write each read returned.
            </li>
            <li>
              <strong>Invalid Certificate:</strong> The exact directed cycle
              (e.g. <code>T1 -rw-&gt; T2 -rw-&gt; T1</code>) or rule violation
              witness.
            </li>
          </ul>
        </div>
      </div>

      {/* Interactive Scenario Explorer */}
      <section className="dashboard-section">
        <div className="section-head">
          <div>
            <p className="eyebrow">PRACTICAL LAB</p>
            <h2>Interactive Anomaly Playground</h2>
          </div>
        </div>

        <div className="scenario-explorer panel">
          <div className="scenario-tabs" role="tablist">
            <button
              type="button"
              className={`tab-btn ${selectedScenario === "write_skew" ? "active" : ""}`}
              onClick={() => setSelectedScenario("write_skew")}
            >
              Write Skew (G2-item)
            </button>
            <button
              type="button"
              className={`tab-btn ${selectedScenario === "dirty_read" ? "active" : ""}`}
              onClick={() => setSelectedScenario("dirty_read")}
            >
              Dirty Read (G1a)
            </button>
            <button
              type="button"
              className={`tab-btn ${selectedScenario === "lost_update" ? "active" : ""}`}
              onClick={() => setSelectedScenario("lost_update")}
            >
              Concurrent Write Collision
            </button>
          </div>

          <div className="scenario-content">
            <div className="scenario-top">
              <h3>{current.title}</h3>
              <span className="badge">{current.module}</span>
            </div>

            <div className="scenario-history">
              <h4>History Specification</h4>
              <pre className="code-block">{current.history}</pre>
            </div>

            <div className="scenario-explanation">
              <h4>Formal Analysis & Oracle Walkthrough</h4>
              <p>{current.explanation}</p>
              <div className="verdict-banner">
                <span>Formal Outcome:</span> <strong>{current.verdict}</strong>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
