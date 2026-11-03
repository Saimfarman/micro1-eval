import { useEffect, useState } from "react";
import { Layout } from "./components/Layout";
import { Overview } from "./pages/Overview";
import { TaskDetail } from "./pages/TaskDetail";
import { Tasks } from "./pages/Tasks";
import { FailureMap } from "./pages/FailureMap";
import { SectionPage } from "./pages/SectionPage";

function route() {
  const parts = window.location.hash.replace(/^#\/?/, "").split("/").filter(Boolean);
  return { page: parts[0] ?? "overview", id: parts[1] ? decodeURIComponent(parts[1]) : undefined };
}

export function App() {
  const [current, setCurrent] = useState(route());
  useEffect(() => { const update = () => setCurrent(route()); window.addEventListener("hashchange", update); return () => window.removeEventListener("hashchange", update); }, []);
  const sections = ["modules", "runs", "providers", "live-run", "results", "failures", "grader", "method", "reproduce", "learn", "settings", "accessibility"];
  let page = current.page === "tasks" && current.id ? <TaskDetail id={current.id} /> :
    current.page === "tasks" ? <Tasks /> :
    current.page === "failure-map" ? <FailureMap /> :
    sections.includes(current.page) ? <SectionPage kind={current.page} /> : <SectionPage kind="not-found" />;
  return <Layout>{page}</Layout>;
}
