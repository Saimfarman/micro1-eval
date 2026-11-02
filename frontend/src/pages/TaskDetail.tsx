import { useEffect, useState } from "react";
import { getTask } from "../api";
import type { Task } from "../types";
import { ErrorState, LoadingState } from "../components/LoadingState";
import { StatusBadge } from "../components/StatusBadge";

export function TaskDetail({ id }: { id: string }) {
  const [task, setTask] = useState<Task | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { getTask(id).then(setTask).catch((reason: Error) => setError(reason.message)); }, [id]);
  if (error) return <ErrorState message={error} />;
  if (!task) return <LoadingState />;
  return (
    <>
      <a className="back-link" href="#/tasks">← Back to tasks</a>
      <div className="page-heading"><p className="eyebrow">{task.id} / DETAIL</p><h1>{task.control ? "Matched control" : "Core task"}</h1><div className="detail-meta"><StatusBadge value={task.module} /><span>{task.expected_verdict}</span><span>{task.status}</span></div></div>
      <section className="detail-grid">
        <article className="panel"><h2>History</h2><pre className="history">{task.history ?? "History is available in the evidence record."}</pre></article>
        <article className="panel"><h2>Difficulty</h2>{task.difficulty ? <dl className="facts">{Object.entries(task.difficulty).map(([key, value]) => <div key={key}><dt>{key}</dt><dd>{value}</dd></div>)}</dl> : <p className="muted">No difficulty metadata.</p>}</article>
      </section>
      <article className="panel"><h2>Oracle derivation</h2>{task.derivation?.length ? <ol>{task.derivation.map(step => <li key={step}>{step}</li>)}</ol> : <p className="muted">Derivation is not present in this record.</p>}</article>
    </>
  );
}
