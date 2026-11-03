import { useEffect, useState } from "react";
import { Layout } from "./components/Layout";
import { Overview } from "./pages/Overview";
import { TaskDetail } from "./pages/TaskDetail";
import { Tasks } from "./pages/Tasks";
import { FailureMap } from "./pages/FailureMap";
import { Results } from "./pages/Results";
import { Failures } from "./pages/Failures";
import { Modules } from "./pages/Modules";
import { Runs } from "./pages/Runs";
import { Providers } from "./pages/Providers";
import { LiveRun } from "./pages/LiveRun";
import { Grader } from "./pages/Grader";
import { Method } from "./pages/Method";
import { Learn } from "./pages/Learn";
import { Reproduce } from "./pages/Reproduce";
import { Settings } from "./pages/Settings";
import { Accessibility } from "./pages/Accessibility";

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
          <p className="muted">The requested route "#{current.page}" does not exist in this dashboard.</p>
          <a href="#/" className="button button-primary">
            Return to Overview →
          </a>
        </div>
      );
      break;
  }

  return <Layout>{pageContent}</Layout>;
}
