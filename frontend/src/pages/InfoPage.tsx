export function InfoPage({ kind }: { kind: "results" | "failures" | "method" | "accessibility" }) {
  const content = {
    results: ["Results", "Run reports are derived from immutable attempts and deterministic grades.", "Open the Overview after running `python -m evalkit report` to view the latest summary."],
    failures: ["Failure analysis", "Failure tags are machine-derived and explicitly unreviewed.", "No human-confirmed labels or reviewer sign-offs are claimed."],
    method: ["Method", "The evaluation checks formal transaction-history definitions with three independent oracle implementations.", "Reproduce locally with `python -m evalkit reproduce`; provider keys are never sent to the browser."],
    accessibility: ["Accessibility", "The dashboard targets WCAG 2.2 AA with keyboard navigation, visible focus, semantic headings, responsive layouts, and reduced-motion support.", "Every map has an equivalent 2D and table view. WebGL is optional, and loading/error states are announced to assistive technology."],
  }[kind];
  return <div className="info-page"><p className="eyebrow">DOCUMENTATION</p><h1>{content[0]}</h1><p className="lede">{content[1]}</p><div className="panel"><p>{content[2]}</p></div></div>;
}
