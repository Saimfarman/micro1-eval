import { useEffect, useMemo, useState } from "react";
import { getTasks } from "../api";
import type { ModuleName, Task } from "../types";
import { ErrorState, LoadingState } from "../components/LoadingState";
import { TaskCard } from "../components/TaskCard";

export function Tasks() {
  const [tasks, setTasks] = useState<Task[] | null>(null);
  const [module, setModule] = useState<ModuleName | "all">("all");
  const [showControls, setShowControls] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { getTasks().then(setTasks).catch((reason: Error) => setError(reason.message)); }, []);
  const filtered = useMemo(() => tasks?.filter(task =>
    (module === "all" || task.module === module) && (showControls || !task.control)
  ), [tasks, module, showControls]);
  if (error) return <ErrorState message={error} />;
  if (!tasks || !filtered) return <LoadingState />;
  return (
    <>
      <div className="page-heading"><p className="eyebrow">CORPUS / TASKS</p><h1>Task catalogue</h1><p className="lede">Every expected answer is recomputed from the oracle implementations.</p></div>
      <div className="filters" aria-label="Task filters">
        <label>Module<select value={module} onChange={event => setModule(event.target.value as ModuleName | "all")}><option value="all">All modules</option>{(["M1", "M2", "M3", "M4"] as ModuleName[]).map(item => <option key={item}>{item}</option>)}</select></label>
        <label className="checkbox"><input type="checkbox" checked={showControls} onChange={event => setShowControls(event.target.checked)} /> Include controls</label>
        <span className="filter-count">{filtered.length} tasks</span>
      </div>
      <div className="task-grid">{filtered.map(task => <TaskCard task={task} key={task.id} />)}</div>
    </>
  );
}
