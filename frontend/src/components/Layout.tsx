import { useState, type ReactNode } from "react";

const links = [
  ["Overview", "#/"],
  ["Tasks", "#/tasks"],
  ["Results", "#/results"],
  ["Failures", "#/failures"],
  ["Task map", "#/failure-map"],
  ["Method", "#/method"],
  ["Accessibility", "#/accessibility"],
];

export function Layout({ children }: { children: ReactNode }) {
  const [light, setLight] = useState(() => localStorage.getItem("theme") === "light");
  const toggleTheme = () => {
    const next = !light;
    setLight(next);
    localStorage.setItem("theme", next ? "light" : "dark");
  };
  return (
    <div className={light ? "theme-light" : ""}>
      <a className="skip-link" href="#main">Skip to content</a>
      <header className="site-header">
        <div className="brand"><span className="brand-mark">F</span><span>FORENSIC / EVAL</span></div>
        <nav aria-label="Primary navigation">
          {links.map(([label, href]) => <a href={href} key={href} aria-current={window.location.hash === href ? "page" : undefined}>{label}</a>)}
          <button type="button" className="theme-toggle" onClick={toggleTheme} aria-label={`Switch to ${light ? "dark" : "light"} theme`}>{light ? "Dark" : "Light"} theme</button>
        </nav>
      </header>
      <main id="main" className="shell">{children}</main>
      <footer className="site-footer">
        <span>Offline-first evidence dashboard</span>
        <span>Models never receive provider keys</span>
      </footer>
    </div>
  );
}
