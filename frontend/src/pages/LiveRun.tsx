import { useEffect, useState } from "react";
import { getRuns, subscribeToRun } from "../api";
import type { LiveRunEvent, Run } from "../types";

export function LiveRun() {
  const [runs, setRuns] = useState<Run[]>([]);
  const [runId, setRunId] = useState("");
  const [events, setEvents] = useState<LiveRunEvent[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamError, setStreamError] = useState<string | null>(null);

  useEffect(() => {
    getRuns()
      .then((r) => {
        setRuns(r);
        if (r.length > 0 && !runId) {
          setRunId(r[0].run_id ?? r[0].id ?? "");
        }
      })
      .catch(() => undefined);
  }, []);

  const handleStartStream = () => {
    if (!runId.trim()) return;
    setIsStreaming(true);
    setStreamError(null);
    setEvents([]);
  };

  useEffect(() => {
    if (!isStreaming || !runId.trim()) return;

    const unsubscribe = subscribeToRun(runId.trim(), (event) => {
      setEvents(prev => [...prev.slice(-99), event]);
    });

    return () => {
      unsubscribe();
    };
  }, [isStreaming, runId]);

  return (
    <div className="live-run-page">
      <div className="page-heading">
        <div className="eyebrow-group">
          <p className="eyebrow">REAL-TIME SSE EVENT STREAM</p>
          <span className="live-status-pill">
            <span className="status-dot" />
            LIVE RUN GATEWAY
          </span>
        </div>
        <h1>Live Execution Monitor</h1>
        <p className="lede">
          Listen to live event telemetry from active evaluation batches via Server-Sent Events (SSE). Live runs are
          gated by server authorization tokens to prevent unmetered spending.
        </p>
      </div>

      {/* Safety Policy Notice */}
      <section className="security-banner-card panel">
        <div className="shield-icon" aria-hidden="true">
          🛡️
        </div>
        <div>
          <h3>Safety Policy: Web-Initiated Live Runs Are Protected</h3>
          <p className="muted">
            In accordance with hackathon reproducibility rules, live model requests cannot be dispatched directly from
            an unauthenticated web client. Live runs are triggered through the CLI (<code>python -m evalkit run</code>)
            or an authorized token header.
          </p>
        </div>
      </section>

      {/* Connection Panel */}
      <div className="live-controls-card panel">
        <div className="live-form-grid">
          <div className="live-input-group">
            <label htmlFor="active-run-id-input" className="live-input-label">
              Active Run ID
            </label>
            <input
              id="active-run-id-input"
              type="text"
              className="text-input"
              value={runId}
              onChange={e => setRunId(e.target.value)}
              placeholder="e.g. 20261102T191035Z-db7b409f"
            />
          </div>
          <button
            type="button"
            className={`button ${isStreaming ? "button-danger" : "button-primary"} live-stream-button`}
            onClick={() => (isStreaming ? setIsStreaming(false) : handleStartStream())}
          >
            {isStreaming ? "⏹ Disconnect Stream" : "▶ Listen to Run Events"}
          </button>
        </div>

        {runs.length > 0 && (
          <div className="quick-runs-bar">
            <span className="quick-runs-label">Recent runs:</span>
            <div className="quick-runs-list">
              {runs.map(r => {
                const id = r.run_id ?? r.id ?? "";
                return (
                  <button
                    key={id}
                    type="button"
                    className={`run-chip ${runId === id ? "active" : ""}`}
                    onClick={() => setRunId(id)}
                  >
                    {id}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Event Stream Terminal Box */}
      <section className="events-terminal-panel panel">
        <div className="terminal-header">
          <div className="terminal-dots">
            <span className="dot red" />
            <span className="dot yellow" />
            <span className="dot green" />
          </div>
          <span className="terminal-title">Event Log · {runId || "No Run Selected"}</span>
          <span className="badge">{events.length} events logged</span>
        </div>

        <div className="terminal-body" aria-live="polite">
          {events.length === 0 ? (
            <div className="terminal-empty">
              <p>No telemetry events received yet.</p>
              <span className="muted">
                {isStreaming
                  ? "Connected to SSE stream. Waiting for heartbeat or run progress..."
                  : "Click 'Listen to Run Events' to stream live telemetry for the selected run."}
              </span>
            </div>
          ) : (
            <div className="events-stream-list">
              {events.map((ev, index) => (
                <div key={`${ev.run_id}-${index}`} className="stream-event-row">
                  <span className="event-seq">#{index + 1}</span>
                  <span className={`event-type-badge ${ev.type}`}>{ev.type}</span>
                  <span className="event-payload">
                    {Object.keys(ev.payload || {}).length > 0 ? JSON.stringify(ev.payload) : "Heartbeat tick"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
