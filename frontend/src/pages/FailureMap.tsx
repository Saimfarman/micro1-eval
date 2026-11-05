import { useEffect, useMemo, useState } from "react";
import { getTasks } from "../api";
import { ErrorState, LoadingState } from "../components/LoadingState";
import { TaskMap3D } from "../components/TaskMap3D";
import type { ModuleName, Task } from "../types";
import { moduleColor, taskMapLayout, type MapPoint } from "../visualization/layout";

type ViewMode = "3d" | "2d" | "table";

export function FailureMap() {
  const [tasks, setTasks] = useState<Task[] | null>(null);
  const [module, setModule] = useState<ModuleName | "all">("all");
  const [control, setControl] = useState<"all" | "control" | "core">("all");
  const [category, setCategory] = useState("all");
  const [model, setModel] = useState("all");
  const [view, setView] = useState<ViewMode>("3d");
  const [paused, setPaused] = useState(false);
  const [unsupported, setUnsupported] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedPoint, setSelectedPoint] = useState<MapPoint | null>(null);

  useEffect(() => {
    getTasks()
      .then(setTasks)
      .catch((reason: Error) => setError(reason.message));
  }, []);

  const points = useMemo(
    () =>
      taskMapLayout(tasks ?? []).filter(
        point =>
          (module === "all" || point.task.module === module) &&
          (control === "all" || (control === "control" ? point.task.control : !point.task.control)) &&
          (model === "all" || point.model === model) &&
          (category === "all" || point.category === category)
      ),
    [tasks, module, control, category, model]
  );

  const categories = useMemo(
    () => [...new Set(taskMapLayout(tasks ?? []).map(point => point.category))].sort(),
    [tasks]
  );
  const models = useMemo(
    () => [...new Set((tasks ?? []).map(task => task.model ?? "all models"))].sort(),
    [tasks]
  );

  if (error) return <ErrorState message={error} />;
  if (!tasks) return <LoadingState />;

  const resetFilters = () => {
    setModule("all");
    setControl("all");
    setCategory("all");
    setModel("all");
  };

  return (
    <div className="failure-map-page">
      <div className="page-heading">
        <div className="eyebrow-group">
          <p className="eyebrow">TASK TOPOLOGY & CONSISTENCY MAP</p>
          <span className="live-status-pill">
            <span className="status-dot" />
            3D SPATIAL PROJECTION
          </span>
        </div>
        <h1>3D Failure & Complexity Map</h1>
        <p className="lede">
          An interactive topological visualization of task complexity, module distribution, and consistency failure
          strata. Y-axis maps operation count; Z-axis maps key spread; node diameter scales with difficulty.
        </p>
      </div>

      {/* Map Controls Toolbar */}
      <div className="map-controls panel" aria-label="Map controls">
        <div className="map-filter-group">
          <label htmlFor="map-module">
            <span>Module</span>
            <select
              id="map-module"
              value={module}
              onChange={event => setModule(event.target.value as ModuleName | "all")}
            >
              <option value="all">All modules (M1–M5)</option>
              {(["M1", "M2", "M3", "M4", "M5"] as ModuleName[]).map(item => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </label>

          <label htmlFor="map-control">
            <span>Set</span>
            <select
              id="map-control"
              value={control}
              onChange={event => setControl(event.target.value as typeof control)}
            >
              <option value="all">Core + Controls ({tasks.length})</option>
              <option value="core">Core only ({tasks.filter(t => !t.control).length})</option>
              <option value="control">Controls only ({tasks.filter(t => t.control).length})</option>
            </select>
          </label>

          <label htmlFor="map-category">
            <span>Failure Category</span>
            <select id="map-category" value={category} onChange={event => setCategory(event.target.value)}>
              <option value="all">All categories</option>
              {categories.map(item => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </label>

          <label htmlFor="map-model">
            <span>Model</span>
            <select id="map-model" value={model} onChange={event => setModel(event.target.value)}>
              <option value="all">All models</option>
              {models.map(item => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </label>
        </div>

        <div className="map-view-actions">
          <div className="view-switch" role="group" aria-label="Map view">
            {(["3d", "2d", "table"] as ViewMode[]).map(item => (
              <button
                type="button"
                aria-pressed={view === item}
                className={`view-toggle-btn ${view === item ? "selected" : ""}`}
                key={item}
                onClick={() => setView(item)}
              >
                {item === "3d" ? "3D SPHERE MAP" : item === "2d" ? "2D RADAR" : "DATA TABLE"}
              </button>
            ))}
          </div>

          {view === "3d" && (
            <div className="action-buttons-group">
              <button
                type="button"
                className="button button-sm button-secondary"
                aria-pressed={paused}
                onClick={() => setPaused(value => !value)}
              >
                {paused ? "▶ Resume" : "⏸ Pause"}
              </button>
              <button
                type="button"
                className="button button-sm button-secondary"
                onClick={() => setPaused(false)}
              >
                Reset Motion
              </button>
            </div>
          )}
        </div>
      </div>

      {unsupported && view === "3d" && (
        <div className="fallback-note panel" role="status">
          WebGL is unavailable in this environment. Falling back to the 2D plane and accessible data table below.
        </div>
      )}

      {/* 3D Map View Container */}
      {view === "3d" && !unsupported && (
        <div className="map-view-container map-container-card">
          <span id="map-description" className="sr-only">
            Interactive visualization only. Use the 2D view or data table to inspect and navigate individual tasks.
          </span>
          {points.length === 0 ? (
            <div className="map-empty-state">
              <div className="empty-icon" aria-hidden="true">🌐</div>
              <h3>No Data Points Match Filter</h3>
              <p className="muted">
                No evaluation tasks match the selected failure category or model filters.
              </p>
              <button type="button" className="button button-primary" onClick={resetFilters}>
                Reset Filter Settings
              </button>
            </div>
          ) : (
            <TaskMap3D
              points={points}
              paused={paused}
              onUnsupported={() => setUnsupported(true)}
              onSelectPoint={pt => setSelectedPoint(pt)}
            />
          )}
        </div>
      )}

      {/* 2D Plane View */}
      {view === "2d" && (
        <div className="map-2d panel" aria-label="Two dimensional task map">
          {points.length === 0 ? (
            <div className="map-empty-state">
              <h3>No Data Points Match Filter</h3>
              <button type="button" className="button button-primary" onClick={resetFilters}>
                Reset Filters
              </button>
            </div>
          ) : (
            points.map(point => (
              <a
                key={point.task.id}
                href={`#/tasks/${encodeURIComponent(point.task.id)}`}
                className="map-dot"
                style={{
                  left: `${((point.x + 7) / 14) * 100}%`,
                  top: `${100 - ((point.y + 3) / 8) * 100}%`,
                  background: moduleColor(point.task.module),
                  width: `${point.size * 180}px`,
                  height: `${point.size * 180}px`,
                }}
                title={`${point.task.id}: ${point.task.module} (${point.task.expected_verdict})`}
              >
                <span className="dot-label">{point.task.id}</span>
              </a>
            ))
          )}
        </div>
      )}

      {/* Table Accessible Equivalent */}
      {view === "table" && (
        <div className="panel map-table-wrap">
          <table className="map-table data-table">
            <caption>Task map data ({points.length} items) · Authoritative equivalent to 3D and 2D projections</caption>
            <thead>
              <tr>
                <th scope="col">Task ID</th>
                <th scope="col">Module</th>
                <th scope="col">Expected Verdict</th>
                <th scope="col">Type</th>
                <th scope="col">Difficulty (Ops)</th>
                <th scope="col">Keys</th>
                <th scope="col">Failure Category</th>
                <th scope="col">Action</th>
              </tr>
            </thead>
            <tbody>
              {points.map(point => (
                <tr key={point.task.id}>
                  <td>
                    <strong>{point.task.id}</strong>
                  </td>
                  <td>
                    <span
                      className="module-pill"
                      style={{
                        background: `${moduleColor(point.task.module)}20`,
                        borderColor: moduleColor(point.task.module),
                        color: moduleColor(point.task.module),
                      }}
                    >
                      {point.task.module}
                    </span>
                  </td>
                  <td>
                    <span
                      className={`verdict-pill ${
                        point.task.expected_verdict === "valid" ? "valid" : "invalid"
                      }`}
                    >
                      {point.task.expected_verdict}
                    </span>
                  </td>
                  <td>{point.task.control ? "Matched Control" : "Core Instance"}</td>
                  <td>{point.task.difficulty?.operations ?? point.difficulty} ops</td>
                  <td>{point.task.difficulty?.keys ?? 1} keys</td>
                  <td>
                    <span className="muted">{point.category}</span>
                  </td>
                  <td>
                    <a href={`#/tasks/${encodeURIComponent(point.task.id)}`} className="table-link">
                      View Derivation →
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Selected Task Inspection Card (DOM overlay, not canvas) */}
      {selectedPoint && (
        <div className="task-inspect-card panel">
          <div className="inspection-header">
            <div className="inspection-title">
              <span className="badge" style={{ background: moduleColor(selectedPoint.task.module), color: "#042f2e" }}>
                {selectedPoint.task.module}
              </span>
              <h3>Task {selectedPoint.task.id}</h3>
              <span className="control-flag">
                {selectedPoint.task.control ? "Matched Control" : "Core Benchmark Task"}
              </span>
            </div>
            <button
              type="button"
              className="selected-close"
              onClick={() => setSelectedPoint(null)}
              aria-label="Close inspector"
            >
              ✕
            </button>
          </div>

          <div className="inspection-grid">
            <div className="inspection-history">
              <h4>Concrete Transaction History</h4>
              <pre className="code-block">{selectedPoint.task.history ?? "History in evidence record."}</pre>
            </div>
            <div className="inspection-details">
              <h4>Formal Properties</h4>
              <div className="facts-list">
                <div className="fact-row">
                  <span className="muted">Expected Verdict:</span>
                  <span className={`verdict-pill ${selectedPoint.task.expected_verdict}`}>
                    {selectedPoint.task.expected_verdict}
                  </span>
                </div>
                <div className="fact-row">
                  <span className="muted">Total Operations:</span>
                  <strong>{selectedPoint.task.difficulty?.operations ?? "—"}</strong>
                </div>
                <div className="fact-row">
                  <span className="muted">Keys In Scope:</span>
                  <strong>{selectedPoint.task.difficulty?.keys ?? "—"}</strong>
                </div>
              </div>
              <a href={`#/tasks/${encodeURIComponent(selectedPoint.task.id)}`} className="button button-sm button-primary" style={{ marginTop: "1rem" }}>
                Open Full Task Detail & Multi-Oracle Derivation →
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Module Legend */}
      <div className="map-legend-panel panel" aria-label="Module legend">
        <span className="legend-title">MODULE PALETTE:</span>
        <div className="legend-items-list">
          {(["M1", "M2", "M3", "M4", "M5"] as ModuleName[]).map(item => (
            <div key={item} className="legend-pill">
              <span className="legend-dot" style={{ background: moduleColor(item) }} />
              <strong>{item}</strong>
              <span className="muted">
                {item === "M1"
                  ? "Snapshot Isolation"
                  : item === "M2"
                  ? "Conflict Serializability"
                  : item === "M3"
                  ? "2PC In-Doubt"
                  : item === "M4"
                  ? "Register Linearizability"
                  : "Strict Serializability"}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
