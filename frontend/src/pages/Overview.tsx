import { useEffect, useState } from "react";
import { getIntegrity, getSummary, getTasks } from "../api";
import type { Summary, Task } from "../types";
import { ErrorState, LoadingState } from "../components/LoadingState";
import { TaskCard } from "../components/TaskCard";

export function Overview() {
  const [tasks, setTasks] = useState<Task[] | null>(null);
  const [summary, setSummary] = useState<Summary>({});
  const [integrity, setIntegrity] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    Promise.all([getTasks(), getSummary().catch(() => ({})), getIntegrity().catch(() => ({ ok: false }))])
      .then(([loaded, report, check]) => { setTasks(loaded); setSummary(report); setIntegrity(check.ok); })
      .catch((reason: Error) => setError(reason.message));
  }, []);
  if (error) return <ErrorState message={error} />;
  if (!tasks) return <LoadingState />;
  return (
    <>
      <section className="hero">
        <p className="eyebrow">AUDITABLE REASONING BENCHMARK</p>
        <h1>Can models verify transaction histories?</h1>
        <p className="lede">A reproducible evaluation of snapshot isolation, serializability, in-doubt transactions, and linearizability.</p>
        <a className="button" href="#/tasks">Explore the evidence <span aria-hidden="true">→</span></a>
      </section>
      <section className="metric-grid" aria-label="Evaluation summary">
        <article className="metric"><strong>{tasks.length}</strong><span>frozen tasks</span></article>
        <article className="metric"><strong>4</strong><span>formal modules</span></article>
        <article className="metric"><strong>{summary.pass_at_1 == null ? "—" : `${Math.round(summary.pass_at_1 * 100)}%`}</strong><span>latest pass@1</span></article>
        <article className="metric"><strong>{integrity == null ? "…" : integrity ? "OK" : "CHECK"}</strong><span>evidence integrity</span></article>
      </section>
      <section className="section-heading"><div><p className="eyebrow">FROZEN CORPUS</p><h2>Selected evidence</h2></div><a href="#/tasks">View all tasks →</a></section>
      <div className="task-grid">{tasks.slice(0, 6).map(task => <TaskCard task={task} key={task.id} />)}</div>
    </>
  );
}
