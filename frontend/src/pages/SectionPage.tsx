import { useEffect, useState } from "react";
import { getModules, getProviders, getRuns, subscribeToRun } from "../api";
import type { LiveRunEvent, ModuleInfo, Provider, Run } from "../types";

const copy: Record<string, [string, string]> = {
  results: ["Results", "Deterministic grades and summaries derived from immutable evidence."],
  failures: ["Failures", "Machine-derived failure categories. Human review is never implied."],
  grader: ["Grader", "Certificate-based grading and reliability metadata."],
  method: ["Method", "Formal transaction-history definitions and independent checkers."],
  reproduce: ["Reproduce", "Offline replay instructions and evidence integrity status."],
  learn: ["Learn", "Understand the modules, certificates, and evaluation workflow."],
  settings: ["Settings", "Display preferences and offline-only dashboard settings."],
  accessibility: ["Accessibility", "Keyboard-first controls, visible focus, reduced motion, and equivalent views."],
  "not-found": ["Page not found", "This dashboard route does not exist."],
};

function List({ title, rows }: { title: string; rows: Record<string, unknown>[] }) {
  return <section className="panel"><h2>{title}</h2><ul>{rows.map((row, index) => <li key={String(row.id ?? row.run_id ?? index)}>{String(row.id ?? row.run_id ?? "record")} <span className="muted">{String(row.status ?? row.provider ?? "")}</span></li>)}</ul></section>;
}

export function SectionPage({ kind }: { kind: string }) {
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  useEffect(() => {
    const load = kind === "modules" ? getModules() : kind === "providers" ? getProviders() : getRuns();
    if (["modules", "providers", "runs"].includes(kind)) load.then(value => setRows(value as Record<string, unknown>[])).catch(() => setRows([]));
  }, [kind]);
  const [heading, description] = copy[kind] ?? [kind, "This route is available offline and uses safe text rendering."];
  return <div className="info-page"><p className="eyebrow">EVALUATION DASHBOARD</p><h1>{heading}</h1><p className="lede">{description}</p>{kind === "modules" && <List title="Modules" rows={rows} />}{kind === "providers" && <List title="Providers" rows={rows} />}{kind === "runs" && <List title="Runs" rows={rows} />}{kind === "live-run" && <LiveRun />}{!["modules", "providers", "runs", "live-run"].includes(kind) && <div className="panel"><p>Data is derived from the local projection. No provider keys or raw prompts are rendered here.</p></div>}</div>;
}

function LiveRun() {
  const [runId, setRunId] = useState("");
  const [events, setEvents] = useState<LiveRunEvent[]>([]);
  useEffect(() => runId ? subscribeToRun(runId, event => setEvents(previous => [...previous.slice(-49), event])) : undefined, [runId]);
  return <div className="panel"><label>Run ID<input value={runId} onChange={event => setRunId(event.target.value)} placeholder="Enter an approved run ID" /></label><p className="muted">Streaming is disabled unless the server explicitly enables live runs.</p><ul aria-live="polite">{events.map((event, index) => <li key={`${event.run_id}-${index}`}>{event.type}</li>)}</ul></div>;
}
