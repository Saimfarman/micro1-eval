import { useEffect, useMemo, useState } from "react";
import { getTasks } from "../api";
import { ErrorState, LoadingState } from "../components/LoadingState";
import { TaskMap3D } from "../components/TaskMap3D";
import type { ModuleName, Task } from "../types";
import { moduleColor, taskMapLayout } from "../visualization/layout";

type ViewMode = "3d" | "2d" | "table";

export function FailureMap() {
  const [tasks, setTasks] = useState<Task[] | null>(null);
  const [module, setModule] = useState<ModuleName | "all">("all");
  const [view, setView] = useState<ViewMode>("3d");
  const [paused, setPaused] = useState(false);
  const [unsupported, setUnsupported] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { getTasks().then(setTasks).catch((reason: Error) => setError(reason.message)); }, []);
  const points = useMemo(() => taskMapLayout((tasks ?? []).filter(task => module === "all" || task.module === module)), [tasks, module]);
  if (error) return <ErrorState message={error} />;
  if (!tasks) return <LoadingState />;
  return (
    <>
      <div className="page-heading"><p className="eyebrow">TASK TOPOLOGY / MAP</p><h1>Failure map</h1><p className="lede">A visual index of task complexity and module coverage. This map does not claim model failures; the table remains the authoritative equivalent.</p></div>
      <div className="map-controls" aria-label="Map controls">
        <label htmlFor="map-module">Module<select id="map-module" value={module} onChange={event => setModule(event.target.value as ModuleName | "all")}><option value="all">All modules</option>{(["M1", "M2", "M3", "M4"] as ModuleName[]).map(item => <option key={item}>{item}</option>)}</select></label>
        <div className="view-switch" role="group" aria-label="Map view">{(["3d", "2d", "table"] as ViewMode[]).map(item => <button type="button" aria-pressed={view === item} className={view === item ? "selected" : ""} key={item} onClick={() => setView(item)}>{item.toUpperCase()}</button>)}</div>
        {view === "3d" && <button type="button" className="control-button" aria-pressed={paused} onClick={() => setPaused(value => !value)}>{paused ? "Resume" : "Pause"}</button>}
        {view === "3d" && <button type="button" className="control-button" onClick={() => setPaused(false)}>Reset motion</button>}
      </div>
      {unsupported && view === "3d" && <div className="fallback-note" role="status">WebGL is unavailable. Use the 2D or table view below.</div>}
      {view === "3d" && !unsupported && <><span id="map-description" className="sr-only">Interactive visualization only. Use the 2D view or data table to inspect and navigate individual tasks.</span><TaskMap3D points={points} paused={paused} onUnsupported={() => setUnsupported(true)} /></>}
      {view === "2d" && <div className="map-2d" aria-label="Two dimensional task map">{points.map(point => <a key={point.task.id} href={`#/tasks/${encodeURIComponent(point.task.id)}`} className="map-dot" style={{ left: `${((point.x + 7) / 14) * 100}%`, top: `${100 - ((point.y + 3) / 8) * 100}%`, background: moduleColor(point.task.module), width: `${point.size * 180}px`, height: `${point.size * 180}px` }} title={`${point.task.id}: ${point.task.module}`}><span className="sr-only">{point.task.id}</span></a>)}</div>}
      {view === "table" && <div className="panel map-table-wrap"><table className="map-table"><caption>Task map data</caption><thead><tr><th>Task</th><th>Module</th><th>Operations</th><th>Control</th><th>Verdict</th></tr></thead><tbody>{points.map(point => <tr key={point.task.id}><td><a href={`#/tasks/${encodeURIComponent(point.task.id)}`}>{point.task.id}</a></td><td>{point.task.module}</td><td>{point.task.difficulty?.operations ?? "—"}</td><td>{point.task.control ? "Yes" : "No"}</td><td>{point.task.expected_verdict}</td></tr>)}</tbody></table></div>}
      <div className="legend" aria-label="Module legend">{(["M1", "M2", "M3", "M4"] as ModuleName[]).map(item => <span key={item}><i style={{ background: moduleColor(item) }} />{item}</span>)}</div>
    </>
  );
}
