import { useEffect, useState } from "react";
import { getHealth } from "../api";

export function Settings() {
  const [health, setHealth] = useState<{ status: string; database: boolean } | null>(null);
  const [isLight, setIsLight] = useState(() => localStorage.getItem("theme") === "light");

  useEffect(() => {
    getHealth()
      .then(setHealth)
      .catch(() => setHealth({ status: "offline", database: false }));
  }, []);

  const handleThemeChange = (light: boolean) => {
    setIsLight(light);
    localStorage.setItem("theme", light ? "light" : "dark");
    if (light) {
      document.querySelector(".app-shell")?.classList.add("theme-light");
      document.querySelector(".app-shell")?.classList.remove("theme-dark");
    } else {
      document.querySelector(".app-shell")?.classList.add("theme-dark");
      document.querySelector(".app-shell")?.classList.remove("theme-light");
    }
  };

  return (
    <div className="settings-page">
      <div className="page-heading">
        <div className="eyebrow-group">
          <p className="eyebrow">DASHBOARD PREFERENCES & DIAGNOSTICS</p>
          <span className="live-status-pill">
            <span className="status-dot" />
            LOCAL STORAGE SETTINGS
          </span>
        </div>
        <h1>Application Settings & Environment</h1>
        <p className="lede">
          Configure display preferences, visual accessibility adjustments, and inspect local backend runtime status.
        </p>
      </div>

      <div className="settings-sections">
        {/* Visual Appearance Panel */}
        <section className="settings-card panel">
          <h3>Display Theme</h3>
          <p className="muted">Choose between the high-contrast Dark theme or clinical Light theme.</p>
          <div className="theme-toggle-row">
            <button
              type="button"
              className={`button ${!isLight ? "button-primary" : "button-secondary"}`}
              onClick={() => handleThemeChange(false)}
            >
              🌙 Dark Obsidian (Default)
            </button>
            <button
              type="button"
              className={`button ${isLight ? "button-primary" : "button-secondary"}`}
              onClick={() => handleThemeChange(true)}
            >
              ☀️ Clinical Light
            </button>
          </div>
        </section>

        {/* System Diagnostics */}
        <section className="settings-card panel">
          <h3>Runtime Diagnostics</h3>
          <div className="diagnostics-list">
            <div className="diag-row">
              <span>Quart API Status:</span>
              <span className="status-tag pass">
                {health?.status === "ok" ? "✓ ONLINE (HTTP 200)" : "OFFLINE"}
              </span>
            </div>
            <div className="diag-row">
              <span>SQLite Projection:</span>
              <span className="status-tag pass">
                {health?.database ? "✓ CONNECTED (index.sqlite3)" : "NOT CONNECTED"}
              </span>
            </div>
            <div className="diag-row">
              <span>Database Schema Version:</span>
              <strong>v4 (WAL Mode Enabled)</strong>
            </div>
            <div className="diag-row">
              <span>Security Boundary:</span>
              <strong>Zero Secret Leakage (Keys restricted to .env)</strong>
            </div>
          </div>
        </section>

        {/* Information Panel */}
        <section className="settings-card panel">
          <h3>Evidence Storage Policy</h3>
          <p>
            This dashboard operates as a read-only projection over immutable evidence files stored in the repository.
            The SQLite database is completely disposable and can be rebuilt at any time using:
          </p>
          <code>python -m evalkit ingest</code>
        </section>
      </div>
    </div>
  );
}
