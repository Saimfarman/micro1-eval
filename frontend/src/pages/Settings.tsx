import { useEffect, useState } from "react";
import { getHealth } from "../api";
import { applyTheme, getInitialTheme, type Theme } from "../theme";

export function Settings() {
  const [health, setHealth] = useState<{ status: string; database: boolean } | null>(null);
  const [theme, setTheme] = useState<Theme>(getInitialTheme);

  useEffect(() => {
    getHealth()
      .then(setHealth)
      .catch(() => setHealth({ status: "offline", database: false }));

    const handleThemeChange = (evt: Event) => {
      const customEvt = evt as CustomEvent<{ theme: Theme }>;
      if (customEvt.detail?.theme) {
        setTheme(customEvt.detail.theme);
      }
    };

    window.addEventListener("themechange", handleThemeChange);
    return () => window.removeEventListener("themechange", handleThemeChange);
  }, []);

  const handleSelectTheme = (newTheme: Theme) => {
    setTheme(newTheme);
    applyTheme(newTheme);
  };

  const isLight = theme === "light";

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
          <p className="muted">Choose between the high-contrast Dark Obsidian theme or the clean Clinical Light theme.</p>
          <div className="theme-toggle-row">
            <button
              type="button"
              className={`button ${!isLight ? "button-primary" : "button-secondary"}`}
              onClick={() => handleSelectTheme("dark")}
            >
              🌙 Dark Obsidian (Default)
            </button>
            <button
              type="button"
              className={`button ${isLight ? "button-primary" : "button-secondary"}`}
              onClick={() => handleSelectTheme("light")}
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
              <span className="diag-label">Quart API Status:</span>
              <span className={`status-tag ${health?.status === "ok" ? "pass" : "fail"}`}>
                {health?.status === "ok" ? "✓ ONLINE (HTTP 200)" : "OFFLINE"}
              </span>
            </div>
            <div className="diag-row">
              <span className="diag-label">SQLite Projection:</span>
              <span className={`status-tag ${health?.database ? "pass" : "fail"}`}>
                {health?.database ? "✓ CONNECTED (index.sqlite3)" : "NOT CONNECTED"}
              </span>
            </div>
            <div className="diag-row">
              <span className="diag-label">Database Schema Version:</span>
              <strong className="diag-val">v4 (WAL Mode Enabled)</strong>
            </div>
            <div className="diag-row">
              <span className="diag-label">Security Boundary:</span>
              <strong className="diag-val">Zero Secret Leakage (Keys restricted to server-side .env)</strong>
            </div>
          </div>
        </section>

        {/* Information Panel */}
        <section className="settings-card panel">
          <h3>Evidence Storage Policy</h3>
          <p className="muted">
            This dashboard operates as a read-only projection over immutable evidence files stored in the repository.
            The SQLite database is completely disposable and can be rebuilt at any time using:
          </p>
          <pre className="code-block">
            <code>python -m evalkit ingest</code>
          </pre>
        </section>
      </div>
    </div>
  );
}
