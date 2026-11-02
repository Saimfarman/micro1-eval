import { useEffect, useState } from "react";
import { Layout } from "./components/Layout";
import { InfoPage } from "./pages/InfoPage";
import { Overview } from "./pages/Overview";
import { TaskDetail } from "./pages/TaskDetail";
import { Tasks } from "./pages/Tasks";
import { FailureMap } from "./pages/FailureMap";

function route() {
  const parts = window.location.hash.replace(/^#\/?/, "").split("/").filter(Boolean);
  return { page: parts[0] ?? "overview", id: parts[1] ? decodeURIComponent(parts[1]) : undefined };
}

export function App() {
  const [current, setCurrent] = useState(route());
  useEffect(() => { const update = () => setCurrent(route()); window.addEventListener("hashchange", update); return () => window.removeEventListener("hashchange", update); }, []);
  let page = current.page === "tasks" && current.id ? <TaskDetail id={current.id} /> :
    current.page === "tasks" ? <Tasks /> :
    current.page === "results" ? <InfoPage kind="results" /> :
    current.page === "failures" ? <InfoPage kind="failures" /> :
    current.page === "failure-map" ? <FailureMap /> :
    current.page === "method" ? <InfoPage kind="method" /> :
    current.page === "accessibility" ? <InfoPage kind="accessibility" /> : <Overview />;
  return <Layout>{page}</Layout>;
}
