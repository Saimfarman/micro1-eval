import { lazy, Suspense, useEffect, useState } from "react";
import { Layout } from "./components/Layout";
import { LoadingState } from "./components/LoadingState";

const Overview = lazy(() =>
  import("./pages/Overview").then((module) => ({ default: module.Overview })),
);
const TaskDetail = lazy(() =>
  import("./pages/TaskDetail").then((module) => ({
    default: module.TaskDetail,
  })),
);
const Tasks = lazy(() =>
  import("./pages/Tasks").then((module) => ({ default: module.Tasks })),
);
const FailureMap = lazy(() =>
  import("./pages/FailureMap").then((module) => ({
    default: module.FailureMap,
  })),
);
const Results = lazy(() =>
  import("./pages/Results").then((module) => ({ default: module.Results })),
);
const Failures = lazy(() =>
  import("./pages/Failures").then((module) => ({ default: module.Failures })),
);
const Modules = lazy(() =>
  import("./pages/Modules").then((module) => ({ default: module.Modules })),
);
const Runs = lazy(() =>
  import("./pages/Runs").then((module) => ({ default: module.Runs })),
);
const Providers = lazy(() =>
  import("./pages/Providers").then((module) => ({
    default: module.Providers,
  })),
);
const LiveRun = lazy(() =>
  import("./pages/LiveRun").then((module) => ({ default: module.LiveRun })),
);
const Grader = lazy(() =>
  import("./pages/Grader").then((module) => ({ default: module.Grader })),
);
const Method = lazy(() =>
  import("./pages/Method").then((module) => ({ default: module.Method })),
);
const Learn = lazy(() =>
  import("./pages/Learn").then((module) => ({ default: module.Learn })),
);
const Reproduce = lazy(() =>
  import("./pages/Reproduce").then((module) => ({
    default: module.Reproduce,
  })),
);
const Settings = lazy(() =>
  import("./pages/Settings").then((module) => ({ default: module.Settings })),
);
const Accessibility = lazy(() =>
  import("./pages/Accessibility").then((module) => ({
    default: module.Accessibility,
  })),
);

function parseHashRoute() {
  const hash = window.location.hash.replace(/^#\/?/, "");
  const parts = hash.split("/").filter(Boolean);
  const page = parts[0] ? parts[0].toLowerCase() : "overview";
  const id = parts[1] ? decodeURIComponent(parts[1]) : undefined;
  return { page, id };
}

export function App() {
  const [current, setCurrent] = useState(parseHashRoute);

  useEffect(() => {
    const handleHashChange = () => setCurrent(parseHashRoute());
    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  let pageContent: React.ReactNode;

  switch (current.page) {
    case "":
    case "overview":
      pageContent = <Overview />;
      break;
    case "failure-map":
      pageContent = <FailureMap />;
      break;
    case "tasks":
      pageContent = current.id ? <TaskDetail id={current.id} /> : <Tasks />;
      break;
    case "results":
      pageContent = <Results />;
      break;
    case "failures":
      pageContent = <Failures />;
      break;
    case "modules":
      pageContent = <Modules />;
      break;
    case "runs":
      pageContent = <Runs />;
      break;
    case "providers":
      pageContent = <Providers />;
      break;
    case "live-run":
      pageContent = <LiveRun />;
      break;
    case "grader":
      pageContent = <Grader />;
      break;
    case "method":
      pageContent = <Method />;
      break;
    case "learn":
      pageContent = <Learn />;
      break;
    case "reproduce":
      pageContent = <Reproduce />;
      break;
    case "settings":
      pageContent = <Settings />;
      break;
    case "accessibility":
      pageContent = <Accessibility />;
      break;
    default:
      pageContent = (
        <div className="not-found-panel panel">
          <h2>Page Not Found</h2>
          <p className="muted">
            The requested route "#{current.page}" does not exist in this
            dashboard.
          </p>
          <a href="#/" className="button button-primary">
            Return to Overview →
          </a>
        </div>
      );
      break;
  }

  return (
    <Layout>
      <Suspense fallback={<LoadingState label="Loading page…" />}>
        {pageContent}
      </Suspense>
    </Layout>
  );
}
