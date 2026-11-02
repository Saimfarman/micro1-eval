import type { Task } from "../types";
import { StatusBadge } from "./StatusBadge";

export function TaskCard({ task }: { task: Task }) {
  return (
    <a className="task-card" href={`#/tasks/${encodeURIComponent(task.id)}`}>
      <div className="task-card-head"><span>{task.id}</span><StatusBadge value={task.module} /></div>
      <h3>{task.control ? "Matched control" : "Core task"}</h3>
      <p className="muted">Oracle verdict: <strong>{task.expected_verdict}</strong></p>
      <div className="task-card-foot"><span>{task.status}</span><span aria-hidden="true">→</span></div>
    </a>
  );
}
