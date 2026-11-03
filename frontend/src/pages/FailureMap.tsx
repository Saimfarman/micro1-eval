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
      <div className="map-controls" aria-label="Map controls">
        <label htmlFor="map-module">
          Module
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
          Set
          <select
            id="map-control"
            value={control}
            onChange={event => setControl(event.target.value as typeof control)}
          >
            <option value="all">Core + Controls ({points.length})</option>
            <option value="core">Core only</option>
            <option value="control">Controls only</option>
          </select>
        </label>

        <label htmlFor="map-category">
          Failure category
          <select id="map-category" value={category} onChange={event => setCategory(event.target.value)}>
            <option value="all">All categories</option>
            {categories.map(item => (
              <option key={item}>{item}</option>
            ))}
          </select>
        </label>

        <label htmlFor="map-model">
          Model
          <select id="map-model" value={model} onChange={event => setModel(event.target.value)}>
            <option value="all">All models</option>
            {models.map(item => (
              <option key={item}>{item}</option>
            ))}
          </select>
        </label>

        <div className="view-switch" role="group" aria-label="Map view">
          {(["3d", "2d", "table"] as ViewMode[]).map(item => (
            <button
              type="button"
              aria-pressed={view === item}
              className={view === item ? "selected" : ""}
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
              className="control-button"
              aria-pressed={paused}
              onClick={() => setPaused(value => !value)}
            >
              {paused ? "▶ Resume" : "⏸ Pause"}
            </button>
            <button type="button" className="control-button" onClick={() => setPaused(false)}>
              Reset Motion
            </button>
          </div>
        )}
      </div>

      {unsupported && view === "3d" && (
        <div className="fallback-note" role="status">
          WebGL is unavailable in this environment. Falling back to the 2D plane and accessible data table below.
        </div>
      )}

      {/* 3D Map View */}
      {view === "3d" && !unsupported && (
        <div className="map-view-container">
          <span id="map-description" className="sr-only">
            Interactive visualization only. Use the 2D view or data table to inspect and navigate individual tasks.
          </span>
          <TaskMap3D
            points={points}
            paused={paused}
            onUnsupported={() => setUnsupported(true)}
            onSelectPoint={pt => setSelectedPoint(pt)}
          />
        </div>
      )}

      {/* 2D Plane View */}
      {view === "2d" && (
        <div className="map-2d" aria-label="Two dimensional task map">
          {points.map(point => (
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
          ))}
        </div>
      )}

      {/* Table Accessible Equivalent */}
      {view === "table" && (
        <div className="panel map-table-wrap">
          <table className="map-table">
            <caption>
              Task map data ({points.length} items) · Authoritative equivalent to 3D and 2D projections
            </caption>
            <thead>
              <tr>
                <th>Task ID</th>
                <th>Module</th>
                <th>Expected Verdict</th>
                <th>Type</th>
                <th>Difficulty (Ops)</th>
                <th>Keys</th>
                <th>Failure Category</th>
                <th>Action</th>
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
        <div className="task-inspection-card">
          <div className="inspection-header">
            <div className="inspection-title">
              <span className="badge" style={{ background: moduleColor(selectedPoint.task.module), color: "#000" }}>
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
              ×
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
                <div>
                  <span>Expected Verdict:</span> <strong>{selectedPoint.task.expected_verdict}</strong>
                </div>
                <div>
                  <span>Total Operations:</span> <strong>{selectedPoint.task.difficulty?.operations ?? "—"}</strong>
                </div>
                <div>
                  <span>Keys Accessed:</span> <strong>{selectedPoint.task.difficulty?.keys ?? "—"}</strong>
                </div>
                <div>
                  <span>Derivation Steps:</span>{" "}
                  <strong>{selectedPoint.task.derivation?.length ?? 0} formal steps</strong>
                </div>
              </div>
              <a href={`#/tasks/${encodeURIComponent(selectedPoint.task.id)}`} className="button button-sm button-primary">
                Open Full Task Detail & Multi-Oracle Derivation →
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Module Legend */}
      <div className="legend" aria-label="Module legend">
        {(["M1", "M2", "M3", "M4", "M5"] as ModuleName[]).map(item => (
          <span key={item}>
            <i style={{ background: moduleColor(item) }} />
            {item} {item === "M1" ? "(Snapshot)" : item === "M2" ? "(Serializability)" : item === "M3" ? "(2PC In-Doubt)" : item === "M4" ? "(Linearizability)" : "(Strict Serial)"}
          </span>
        ))}
      </div>
    </div>
  );
}
