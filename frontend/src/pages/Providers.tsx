import { useEffect, useState } from "react";
import { getModels, getProviders } from "../api";
import type { ModelConfig, Provider } from "../types";
import { ErrorState, LoadingState } from "../components/LoadingState";

export function Providers() {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [models, setModels] = useState<ModelConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      getProviders().catch(() => []),
      getModels().catch(() => []),
    ])
      .then(([p, m]) => {
        setProviders(p);
        setModels(m);
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (error) return <ErrorState message={error} />;
  if (loading) return <LoadingState />;

  return (
    <div className="providers-page">
      <div className="page-heading">
        <div className="eyebrow-group">
          <p className="eyebrow">INFERENCE PROTOCOLS & QUOTA PACING</p>
          <span className="live-status-pill">
            <span className="status-dot" />
            ISOLATED CREDENTIAL BOUNDARY
          </span>
        </div>
        <h1>Supported Model Providers & Quotas</h1>
        <p className="lede">
          The evaluation harness includes a multi-provider adapter supporting local deterministic mocks and
          OpenAI-compatible endpoints. Provider credentials remain strictly server-side in <code>.env</code> and are
          never transmitted to the client.
        </p>
      </div>

      {/* Security Callout Banner */}
      <section className="security-banner-card">
        <div className="shield-icon" aria-hidden="true">
          🛡️
        </div>
        <div>
          <h3>Zero Secret Leakage Architecture</h3>
          <p>
            API keys are read exclusively on the backend from <code>.env</code>. They are omitted from task records,
            raw attempt JSONs, database indices, and all API responses. Live runs are completely opt-in and disabled
            by default.
          </p>
        </div>
      </section>

      {/* Models / Providers Grid */}
      <div className="providers-grid">
        {models.map((mod) => (
          <article key={mod.id} className="provider-card panel">
            <div className="provider-head">
              <div>
                <span className="badge primary">{mod.provider.toUpperCase()}</span>
                <h3>{mod.display_name ?? mod.id}</h3>
              </div>
              <span className={`status-tag ${mod.id === "mock" ? "pass" : "muted"}`}>
                {mod.id === "mock" ? "ONLINE FIXTURE" : "OPT-IN API"}
              </span>
            </div>

            <div className="provider-specs-grid">
              <div className="spec-row">
                <span>Protocol:</span>
                <strong>{mod.id === "mock" ? "Local Simulator" : "OpenAI-Compatible"}</strong>
              </div>
              <div className="spec-row">
                <span>Requests / Min:</span>
                <strong>{mod.requests_per_minute ?? 60} RPM</strong>
              </div>
              <div className="spec-row">
                <span>Requests / Day:</span>
                <strong>{mod.requests_per_day ?? 10000} RPD</strong>
              </div>
              <div className="spec-row">
                <span>Tokens / Min:</span>
                <strong>{(mod.tokens_per_minute ?? 100000).toLocaleString()} TPM</strong>
              </div>
              <div className="spec-row">
                <span>Tokens / Day:</span>
                <strong>{(mod.tokens_per_day ?? 1000000).toLocaleString()} TPD</strong>
              </div>
              <div className="spec-row">
                <span>Max Context Tokens:</span>
                <strong>{mod.max_tokens ?? 4096}</strong>
              </div>
            </div>

            {mod.key_env && (
              <div className="key-env-box">
                <span className="muted">Environment Secret:</span>
                <code>{mod.key_env}</code>
              </div>
            )}
          </article>
        ))}
      </div>
    </div>
  );
}
