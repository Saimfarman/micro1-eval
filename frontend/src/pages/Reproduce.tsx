import { useEffect, useState } from "react";
import { getIntegrity, getManifests } from "../api";
import type { IntegrityStatus } from "../types";
import { ErrorState, LoadingState } from "../components/LoadingState";

export function Reproduce() {
  const [integrity, setIntegrity] = useState<IntegrityStatus | null>(null);
  const [manifests, setManifests] = useState<unknown[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  useEffect(() => {
    Promise.all([
      getIntegrity().catch(() => ({ ok: false, errors: ["Failed to fetch integrity API"] })),
      getManifests().catch(() => []),
    ])
      .then(([integ, mans]) => {
        setIntegrity(integ);
        setManifests(mans);
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const commands = [
    { label: "Validate task schemas & hashes", cmd: "python -m evalkit validate-tasks" },
    { label: "Run offline preflight verification", cmd: "python -m evalkit preflight" },
    { label: "Replay & grade attempts without API keys", cmd: "python -m evalkit reproduce" },
    { label: "Verify SHA-256 manifest cryptographic integrity", cmd: "python -m evalkit verify" },
    { label: "Rebuild derived SQLite projection database", cmd: "python -m evalkit ingest" },
    { label: "Launch local offline dashboard server", cmd: "python -m backend.serve" },
  ];

  const copyCmd = (cmd: string, idx: number) => {
    navigator.clipboard.writeText(cmd);
    setCopiedIndex(idx);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  if (error) return <ErrorState message={error} />;
  if (loading) return <LoadingState />;

  return (
    <div className="reproduce-page">
      <div className="page-heading">
        <div className="eyebrow-group">
          <p className="eyebrow">OFFLINE VERIFICATION & REPRODUCIBILITY</p>
          <span className="live-status-pill">
            <span className="status-dot" />
            STANDALONE LOCAL REPLAY
          </span>
        </div>
        <h1>Reproduce Evaluation Results Locally</h1>
        <p className="lede">
          A core requirement of the micro1 evaluation hackathon is that results must be 100% reproducible offline
          without API keys, remote databases, or external network connectivity.
        </p>
      </div>

      {/* Real-time Integrity Status Card */}
      <section className={`integrity-status-card panel ${integrity?.ok ? "success" : "danger"}`}>
        <div className="status-icon" aria-hidden="true">
          {integrity?.ok ? "✓" : "⚠"}
        </div>
        <div className="status-content">
          <h3>
            {integrity?.ok ? "Cryptographic Evidence Integrity: 100% VERIFIED" : "Evidence Integrity Check Required"}
          </h3>
          <p>
            {integrity?.ok
              ? "All immutable task files, raw attempt logs, and manifest entries match exact SHA-256 digests. No tampering or post-run modifications detected."
              : `Discrepancies found: ${integrity?.errors.join("; ")}`}
          </p>
        </div>
      </section>

      {/* Step by Step CLI Commands */}
      <section className="dashboard-section">
        <div className="section-head">
          <div>
            <p className="eyebrow">TERMINAL WORKFLOW</p>
            <h2>Step-by-Step Replay Commands</h2>
          </div>
        </div>

        <div className="commands-list">
          {commands.map((c, i) => (
            <div key={i} className="command-row panel">
              <div className="cmd-meta">
                <span className="step-badge">STEP {i + 1}</span>
                <strong>{c.label}</strong>
              </div>
              <div className="cmd-code-bar">
                <code>{c.cmd}</code>
                <button
                  type="button"
                  className="button button-sm button-secondary"
                  onClick={() => copyCmd(c.cmd, i)}
                >
                  {copiedIndex === i ? "✓ Copied" : "Copy Command"}
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Manifest Information Box */}
      <section className="dashboard-section">
        <div className="section-head">
          <div>
            <p className="eyebrow">CRYPTOGRAPHIC ANCHOR</p>
            <h2>Manifest Verification Policy</h2>
          </div>
        </div>

        <div className="panel manifest-info-box">
          <h4>How Verification Works</h4>
          <p>
            <code>results/MANIFEST.json</code> contains an indexed cryptographic dictionary of every core asset in the
            repository: task JSONs, oracle implementations, code requirements, and raw execution attempt outputs.
          </p>
          <p>
            When <code>python -m evalkit verify</code> executes, it recalculates the SHA-256 hash of each file on disk
            and verifies that every attempt record self-hash matches. Any modified byte fails verification immediately.
          </p>
          <div className="manifest-actions">
            <span className="badge">Results Manifest: results/MANIFEST.json</span>
            <span className="badge">Database: Derived SQLite Projection (Rebuildable)</span>
          </div>
        </div>
      </section>
    </div>
  );
}
