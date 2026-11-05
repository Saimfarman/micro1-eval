export function Accessibility() {
  return (
    <div className="accessibility-page">
      <div className="page-heading">
        <div className="eyebrow-group">
          <p className="eyebrow">INCLUSIVE DESIGN STANDARD</p>
          <span className="live-status-pill">
            <span className="status-dot" />
            WCAG 2.2 LEVEL AA CONFORMANCE
          </span>
        </div>
        <h1>Accessibility Statement & Standards</h1>
        <p className="lede">
          This dashboard is engineered to meet and exceed{" "}
          <strong>WCAG 2.2 Level AA</strong> accessibility standards.
          Accessibility is treated as a fundamental engineering requirement, not
          an afterthought.
        </p>
      </div>

      <div className="a11y-cards-grid">
        <section className="a11y-card panel">
          <h3>1. Keyboard Operability</h3>
          <p className="a11y-desc">
            Every interactive element—including navigation tabs, task cards,
            modal inspectors, filter selects, and 3D view toggles—is fully
            operable using only a keyboard.
          </p>
          <ul className="a11y-list">
            <li>
              Visible high-contrast focus rings (<code>:focus-visible</code>) on
              all active controls.
            </li>
            <li>
              Skip-to-content landmark link at the top of the DOM for screen
              readers and keyboard users.
            </li>
            <li>No keyboard focus traps anywhere in the application.</li>
          </ul>
        </section>

        <section className="a11y-card panel">
          <h3>2. Authoritative 2D & Table Equivalents</h3>
          <p className="a11y-desc">
            3D graphics are never the sole method of accessing information.
            Every 3D visualization has a fully accessible equivalent:
          </p>
          <ul className="a11y-list">
            <li>
              The 3D Failure Map features instant 2D Radar and comprehensive
              Data Table views.
            </li>
            <li>
              Data tables include semantic <code>&lt;caption&gt;</code>,{" "}
              <code>&lt;thead&gt;</code>, and{" "}
              <code>&lt;th scope="col"&gt;</code> tags.
            </li>
            <li>
              Three.js canvases are marked with <code>aria-hidden="true"</code>{" "}
              or <code>role="img"</code> with descriptions.
            </li>
          </ul>
        </section>

        <section className="a11y-card panel">
          <h3>3. Color Contrast & Multi-Modal Encoding</h3>
          <p className="a11y-desc">
            Information is never conveyed by color alone:
          </p>
          <ul className="a11y-list">
            <li>
              Text contrast ratios exceed 4.5:1 against surfaces in both dark
              and light themes.
            </li>
            <li>
              Status badges combine color with explicit text labels (e.g. "✓
              PASSED", "✕ FAILED").
            </li>
            <li>
              Module indicators combine color hues with distinct alphanumeric
              codes (M1, M2, M3, M4, M5).
            </li>
          </ul>
        </section>

        <section className="a11y-card panel">
          <h3>4. Reduced Motion (prefers-reduced-motion)</h3>
          <p className="a11y-desc">
            Respects the user's operating system animation preferences:
          </p>
          <ul className="a11y-list">
            <li>
              When <code>prefers-reduced-motion: reduce</code> is active,
              Three.js ambient rotations are halted.
            </li>
            <li>
              CSS transitions and hover elevations are disabled or smoothed to
              instant state changes.
            </li>
            <li>
              Users can manually pause or resume motion using on-screen controls
              at any time.
            </li>
          </ul>
        </section>
      </div>
    </div>
  );
}
