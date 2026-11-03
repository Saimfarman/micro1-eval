import { useEffect, useState, type ReactNode } from "react";
import { getIntegrity } from "../api";

export interface NavItem {
  id: string;
  label: string;
  href: string;
  badge?: string;
  icon: (active: boolean) => ReactNode;
}

const navSections: { category: string; items: NavItem[] }[] = [
  {
    category: "Evidence & Benchmarks",
    items: [
      {
        id: "overview",
        label: "Overview",
        href: "#/",
        icon: (a) => (
          <svg className="nav-icon" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={a ? "2.2" : "1.8"}>
            <rect x="2" y="2" width="7" height="7" rx="1.5" />
            <rect x="11" y="2" width="7" height="4" rx="1.5" />
            <rect x="11" y="8" width="7" height="10" rx="1.5" />
            <rect x="2" y="11" width="7" height="7" rx="1.5" />
          </svg>
        ),
      },
      {
        id: "failure-map",
        label: "3D Failure Map",
        href: "#/failure-map",
        badge: "3D",
        icon: (a) => (
          <svg className="nav-icon" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={a ? "2.2" : "1.8"}>
            <circle cx="10" cy="10" r="3" />
            <ellipse cx="10" cy="10" rx="8" ry="4" transform="rotate(-30 10 10)" />
            <ellipse cx="10" cy="10" rx="8" ry="4" transform="rotate(30 10 10)" />
          </svg>
        ),
      },
      {
        id: "tasks",
        label: "Tasks",
        href: "#/tasks",
        badge: "19",
        icon: (a) => (
          <svg className="nav-icon" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={a ? "2.2" : "1.8"}>
            <path d="M4 5h12M4 10h12M4 15h7" strokeLinecap="round" />
            <circle cx="16" cy="15" r="2" />
          </svg>
        ),
      },
      {
        id: "results",
        label: "Results",
        href: "#/results",
        icon: (a) => (
          <svg className="nav-icon" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={a ? "2.2" : "1.8"}>
            <path d="M3 17V10M8 17V6M13 17V3M18 17V12" strokeLinecap="round" />
          </svg>
        ),
      },
      {
        id: "failures",
        label: "Failures",
        href: "#/failures",
        icon: (a) => (
          <svg className="nav-icon" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={a ? "2.2" : "1.8"}>
            <path d="M10 2L2 17h16L10 2zM10 8v4M10 14.5v.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        ),
      },
    ],
  },
  {
    category: "System & Architecture",
    items: [
      {
        id: "modules",
        label: "Modules",
        href: "#/modules",
        badge: "M1-M5",
        icon: (a) => (
          <svg className="nav-icon" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={a ? "2.2" : "1.8"}>
            <path d="M10 2l8 4-8 4-8-4 8-4zM2 10l8 4 8-4M2 14l8 4 8-4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        ),
      },
      {
        id: "runs",
        label: "Runs",
        href: "#/runs",
        icon: (a) => (
          <svg className="nav-icon" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={a ? "2.2" : "1.8"}>
            <circle cx="10" cy="10" r="7" />
            <path d="M10 6v4l3 2" strokeLinecap="round" />
          </svg>
        ),
      },
      {
        id: "providers",
        label: "Providers",
        href: "#/providers",
        icon: (a) => (
          <svg className="nav-icon" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={a ? "2.2" : "1.8"}>
            <rect x="3" y="3" width="14" height="5" rx="1" />
            <rect x="3" y="12" width="14" height="5" rx="1" />
            <circle cx="6" cy="5.5" r="1" fill="currentColor" />
            <circle cx="6" cy="14.5" r="1" fill="currentColor" />
          </svg>
        ),
      },
      {
        id: "live-run",
        label: "Live Run",
        href: "#/live-run",
        badge: "GATE",
        icon: (a) => (
          <svg className="nav-icon" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={a ? "2.2" : "1.8"}>
            <path d="M4 10a6 6 0 0112 0M7 10a3 3 0 016 0M10 13a1 1 0 100-2 1 1 0 000 2z" strokeLinecap="round" />
          </svg>
        ),
      },
      {
        id: "grader",
        label: "Grader",
        href: "#/grader",
        icon: (a) => (
          <svg className="nav-icon" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={a ? "2.2" : "1.8"}>
            <path d="M9 12l2 2 4-4M4 7l6-4 6 4v5a9 9 0 01-6 8 9 9 0 01-6-8V7z" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        ),
      },
    ],
  },
  {
    category: "Methodology & Audit",
    items: [
      {
        id: "method",
        label: "Method",
        href: "#/method",
        icon: (a) => (
          <svg className="nav-icon" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={a ? "2.2" : "1.8"}>
            <path d="M4 4h12v13H4zM8 8h4M8 12h4" strokeLinecap="round" />
          </svg>
        ),
      },
      {
        id: "learn",
        label: "Learn",
        href: "#/learn",
        icon: (a) => (
          <svg className="nav-icon" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={a ? "2.2" : "1.8"}>
            <path d="M10 3L2 7l8 4 8-4-8-4zM2 11l8 4 8-4M2 15l8 4 8-4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        ),
      },
      {
        id: "reproduce",
        label: "Reproduce",
        href: "#/reproduce",
        icon: (a) => (
          <svg className="nav-icon" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={a ? "2.2" : "1.8"}>
            <rect x="2" y="3" width="16" height="14" rx="2" />
            <path d="M6 8l3 2-3 2M11 12h3" strokeLinecap="round" />
          </svg>
        ),
      },
      {
        id: "settings",
        label: "Settings",
        href: "#/settings",
        icon: (a) => (
          <svg className="nav-icon" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={a ? "2.2" : "1.8"}>
            <circle cx="10" cy="10" r="3" />
            <path d="M10 2v2M10 16v2M2 10h2M16 10h2M4.9 4.9l1.4 1.4M13.7 13.7l1.4 1.4M4.9 15.1l1.4-1.4M13.7 6.3l1.4-1.4" strokeLinecap="round" />
          </svg>
        ),
      },
      {
        id: "accessibility",
        label: "Accessibility",
        href: "#/accessibility",
        badge: "AA",
        icon: (a) => (
          <svg className="nav-icon" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={a ? "2.2" : "1.8"}>
            <circle cx="10" cy="4" r="2" />
            <path d="M4 8h12M10 8v8M7 16l3-5 3 5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        ),
      },
    ],
  },
];

export function Layout({ children }: { children: ReactNode }) {
  const [light, setLight] = useState(() => localStorage.getItem("theme") === "light");
  const [integrityOk, setIntegrityOk] = useState<boolean | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [currentHash, setCurrentHash] = useState(() => window.location.hash || "#/");

  useEffect(() => {
    const handleHash = () => {
      setCurrentHash(window.location.hash || "#/");
      setMobileMenuOpen(false);
    };
    window.addEventListener("hashchange", handleHash);
    getIntegrity()
      .then(res => setIntegrityOk(res.ok))
      .catch(() => setIntegrityOk(false));
    return () => window.removeEventListener("hashchange", handleHash);
  }, []);

  const toggleTheme = () => {
    const next = !light;
    setLight(next);
    localStorage.setItem("theme", next ? "light" : "dark");
  };

  const isCurrentActive = (href: string) => {
    if (href === "#/") {
      return currentHash === "" || currentHash === "#/" || currentHash === "#" || currentHash === "#/overview";
    }
    return currentHash.startsWith(href);
  };

  return (
    <div className={`app-shell ${light ? "theme-light" : "theme-dark"}`}>
      <a className="skip-link" href="#main">
        Skip to content
      </a>

      {/* Top Header Bar */}
      <header className="site-header">
        <div className="header-inner">
          <div className="brand-group">
            <a href="#/" className="brand-link" aria-label="Transaction History Eval Home">
              <span className="brand-logo" aria-hidden="true">
                <span className="brand-symbol">◈</span>
              </span>
              <div className="brand-text">
                <span className="brand-title">TRANSACTION / EVAL</span>
                <span className="brand-sub">micro1 hackathon · formal oracle verification</span>
              </div>
            </a>
          </div>

          {/* Quick status & Actions */}
          <div className="header-actions">
            <div
              className={`integrity-badge ${integrityOk === null ? "checking" : integrityOk ? "ok" : "err"}`}
              title={integrityOk ? "Cryptographic manifest verified" : "Integrity check required"}
            >
              <span className="pulse-dot" />
              <span className="integrity-text">
                {integrityOk === null ? "CHECKING INTEGRITY" : integrityOk ? "MANIFEST: 100% OK" : "INTEGRITY CHECK"}
              </span>
            </div>

            <button
              type="button"
              className="theme-toggle"
              onClick={toggleTheme}
              aria-label={`Switch to ${light ? "dark" : "light"} theme`}
            >
              {light ? (
                <svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16">
                  <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
                </svg>
              ) : (
                <svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16">
                  <path
                    fillRule="evenodd"
                    d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z"
                    clipRule="evenodd"
                  />
                </svg>
              )}
              <span className="theme-text">{light ? "Dark theme" : "Light theme"}</span>
            </button>

            <button
              type="button"
              className="mobile-toggle"
              onClick={() => setMobileMenuOpen(prev => !prev)}
              aria-label="Toggle menu"
              aria-expanded={mobileMenuOpen}
            >
              <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" width="20" height="20">
                {mobileMenuOpen ? (
                  <path d="M4 4l12 12M16 4L4 16" strokeWidth="2" strokeLinecap="round" />
                ) : (
                  <path d="M3 6h14M3 10h14M3 14h14" strokeWidth="2" strokeLinecap="round" />
                )}
              </svg>
            </button>
          </div>
        </div>

        {/* Primary Tab Navigation */}
        <nav aria-label="Primary navigation" className={`primary-nav ${mobileMenuOpen ? "mobile-open" : ""}`}>
          <div className="nav-scroll-container">
            {navSections.map((sec, secIdx) => (
              <div key={sec.category} className="nav-group">
                <span className="nav-group-title">{sec.category}</span>
                <div className="nav-items-row">
                  {sec.items.map(item => {
                    const active = isCurrentActive(item.href);
                    return (
                      <a
                        key={item.id}
                        href={item.href}
                        className={`nav-tab ${active ? "active" : ""}`}
                        aria-current={active ? "page" : undefined}
                      >
                        <span className="nav-tab-icon">{item.icon(active)}</span>
                        <span className="nav-tab-label">{item.label}</span>
                        {item.badge && <span className="nav-tab-badge">{item.badge}</span>}
                        {active && <span className="active-pill-indicator" />}
                      </a>
                    );
                  })}
                </div>
                {secIdx < navSections.length - 1 && <div className="nav-divider" aria-hidden="true" />}
              </div>
            ))}
          </div>
        </nav>
      </header>

      {/* Main Content Area */}
      <main id="main" className="shell">
        {children}
      </main>

      {/* Footer */}
      <footer className="site-footer">
        <div className="footer-left">
          <div className="footer-brand">
            <strong>Transaction History Evaluation Benchmark</strong> · micro1 AI Hackathon
          </div>
          <div className="footer-sub">
            Formal mathematical consistency oracles (O1 Reference Simulator, O2 Rule & Graph Checker, O3 Z3 SMT Solver).
            Berenson et al. (1995) & Adya (1999).
          </div>
        </div>
        <div className="footer-right">
          <span className="footer-tag">Offline-First</span>
          <span className="footer-tag">Zero Fabrication</span>
          <span className="footer-tag">WCAG 2.2 AA</span>
          <span className="footer-tag">SQLite Projection v5</span>
        </div>
      </footer>
    </div>
  );
}
