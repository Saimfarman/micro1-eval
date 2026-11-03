import { useEffect, useMemo, useState } from "react";
import { getTasks } from "../api";
import type { ModuleName, Task } from "../types";
import { ErrorState, LoadingState } from "../components/LoadingState";
import { TaskCard } from "../components/TaskCard";

export function Tasks() {
  const [tasks, setTasks] = useState<Task[] | null>(null);
  const [module, setModule] = useState<ModuleName | "all">("all");
  const [setType, setSetType] = useState<"all" | "core" | "control">("all");
  const [verdictFilter, setVerdictFilter] = useState<"all" | "valid" | "invalid">("all");
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getTasks()
      .then(setTasks)
      .catch((reason: Error) => setError(reason.message));
  }, []);

  const filtered = useMemo(() => {
    if (!tasks) return [];
    return tasks.filter((task) => {
      if (module !== "all" && task.module !== module) return false;
      if (setType === "core" && task.control) return false;
      if (setType === "control" && !task.control) return false;
      if (verdictFilter !== "all" && task.expected_verdict !== verdictFilter) return false;
      if (search.trim()) {
        const query = search.toLowerCase();
        const matchesId = task.id.toLowerCase().includes(query);
        const matchesHistory = task.history?.toLowerCase().includes(query);
        if (!matchesId && !matchesHistory) return false;
      }
      return true;
    });
  }, [tasks, module, setType, verdictFilter, search]);

  if (error) return <ErrorState message={error} />;
  if (!tasks) return <LoadingState />;

  const coreCount = tasks.filter(t => !t.control).length;
  const controlCount = tasks.filter(t => t.control).length;

  return (
    <div className="tasks-page">
      <div className="page-heading">
        <div className="eyebrow-group">
          <p className="eyebrow">FROZEN EVALUATION CORPUS</p>
          <span className="live-status-pill">
            <span className="status-dot" />
            19 STRATIFIED INSTANCES
          </span>
        </div>
        <h1>Task Catalogue & Evidence Explorer</h1>
        <p className="lede">
          Browse the full corpus of 10 stratified core instances (T01–T10) and 9 matched metamorphic controls
          (C10–C18). Expected verdicts and certificates are recomputed by three independent oracles.
        </p>
      </div>

      {/* Filter Toolbar */}
      <div className="filters panel" aria-label="Task filters">
        <label>
          Filter Module
          <select
            value={module}
            onChange={event => setModule(event.target.value as ModuleName | "all")}
          >
            <option value="all">All Modules (M1–M5)</option>
            {(["M1", "M2", "M3", "M4", "M5"] as ModuleName[]).map(item => (
              <option key={item}>{item}</option>
            ))}
          </select>
        </label>

        <label>
          Set Stratum
          <select
            value={setType}
            onChange={event => setSetType(event.target.value as typeof setType)}
          >
            <option value="all">Core + Controls ({tasks.length})</option>
            <option value="core">Core Tasks Only ({coreCount})</option>
            <option value="control">Matched Controls Only ({controlCount})</option>
          </select>
        </label>

        <label>
          Expected Verdict
          <select
            value={verdictFilter}
            onChange={event => setVerdictFilter(event.target.value as typeof verdictFilter)}
          >
            <option value="all">All Verdicts</option>
            <option value="valid">Valid only</option>
            <option value="invalid">Invalid only</option>
          </select>
        </label>

        <label className="search-label">
          Search Tasks
          <input
            type="search"
            placeholder="Search by ID or key (e.g. T01, w(x)...)"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </label>

        <span className="filter-count">
          Showing <strong>{filtered.length}</strong> of {tasks.length} tasks
        </span>
      </div>

      {/* Task Grid */}
      {filtered.length === 0 ? (
        <div className="empty-panel panel">
          <p>No tasks match the active filter criteria.</p>
          <button
            type="button"
            className="button button-sm button-secondary"
            onClick={() => {
              setModule("all");
              setSetType("all");
              setVerdictFilter("all");
              setSearch("");
            }}
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <div className="task-grid">
          {filtered.map(task => (
            <TaskCard task={task} key={task.id} />
          ))}
        </div>
      )}
    </div>
  );
}
