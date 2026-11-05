import type { Task } from "../types";
import { moduleColor } from "../visualization/layout";

export function TaskCard({ task }: { task: Task }) {
  const ops = task.difficulty?.operations ?? 1;
  const keys = task.difficulty?.keys ?? 1;
  const reads = task.difficulty?.reads ?? 0;
  const writes = task.difficulty?.writes ?? 0;

  return (
    <a
      className="task-card panel"
      href={`#/tasks/${encodeURIComponent(task.id)}`}
      style={{ borderLeftColor: moduleColor(task.module) }}
    >
      <div className="task-card-head">
        <div className="task-id-group">
          <span className="task-id">{task.id}</span>
          <span
            className="module-pill"
            style={{
              borderColor: moduleColor(task.module),
              background: `${moduleColor(task.module)}20`,
              color: moduleColor(task.module),
            }}
          >
            {task.module}
          </span>
        </div>
        <span className={`verdict-pill ${task.expected_verdict}`}>
          {task.expected_verdict}
        </span>
      </div>

      <div className="task-card-body">
        <h3 className="task-card-title">{task.control ? "Matched Metamorphic Control" : "Core Benchmark Task"}</h3>
        <p className="task-desc">
          {ops} operations · {keys} keys accessed · {reads} reads / {writes} writes
        </p>
      </div>

      <div className="task-card-foot">
        <span className="task-tier-tag">
          {task.control ? "Metamorphic Pair" : "Stratified Core"}
        </span>
        <span className="task-arrow-link" aria-hidden="true">
          <span>Inspect Derivation</span>
          <span>→</span>
        </span>
      </div>
    </a>
  );
}
