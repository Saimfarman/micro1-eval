# Accessibility and frontend quality

The dashboard targets WCAG 2.2 AA. Its UI uses semantic landmarks, keyboard
focus styling, labelled controls, responsive layouts, status/error states, and
a light/dark theme. The application includes an accessibility statement, but
its content is not a substitute for an independent conformance audit.

The Failure Map is progressive enhancement: Three.js is optional, reduced
motion is respected, and the visualization has 2D and table alternatives.
Users can browse the plotted records without WebGL.

All dashboard pages use hash routes; unknown routes have an explicit not-found
state. The browser does not receive provider credentials. No external CDN,
font, or script is required.

Run the local checks from the repository root:

```powershell
npm run accessibility
npm run typecheck
npm run build
```

These are automated project checks, not a claim that a manual browser or
assistive-technology audit has been completed.
