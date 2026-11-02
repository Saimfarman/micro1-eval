<!-- Frontend (React + Vite + three.js), WCAG 2.2 AA, testing. Section 0.1 and 0.6 override older dates and scope elsewhere. -->

## 12. Frontend (React + Vite + three.js)

### 12.1 Design direction

The dashboard must look unlike a template. Choose one distinctive concept and apply it everywhere; a suggested one is “forensic lab meets observatory”: a dark-first theme with a fully designed light theme, a strong typographic hierarchy, generous space, and one accent hue plus semantic pass/fail colours that are always paired with an icon or shape.

- Design tokens as CSS custom properties (colour, type scale, spacing, radii, elevation, motion durations), defined once, with light, dark, `prefers-contrast: more` and `forced-colors` variants.
- Self-hosted, subset WOFF2 variable fonts with real fallback stacks. No external font or script requests.
- Motion is purposeful: it explains state changes and guides attention. Every animation has a reduced-motion alternative.
- Document the concept, palette (with measured contrast ratios) and type scale in `docs/ARCHITECTURE.md`.

### 12.2 Routes and what each must do

- **`/`**** Overview:** the headline finding in one sentence with one large number and its confidence interval, a calm 3D hero, three key metrics, and clear paths to the Failure Map and the tasks. A judge should grasp the whole story in 30 seconds.
- **`/failure-map`****:** the signature 3D view with 2D and table equivalents (12.3).
- **`/tasks`**** and ****`/tasks/:id`****:** filterable explorer (category, difficulty, core or control, edge case, judgment call); detail shows the prompt, expected answer, rubric, provenance, per-model results and the matched control side by side.
- **`/results`****:** task by model heat-matrix, pass@1 with intervals, consistency, core versus control.
- **`/attempts/:id`****:** the raw-output viewer: model output beside the expected answer, per-criterion verdicts, judge rationale, failure tags, copyable permalink. This is the page that earns judges’ trust.
- **`/failures`****:** taxonomy breakdown by tag, model and category, with linked example attempts.
- **`/grader`****:** reliability: confusion matrix, false-pass and false-fail rates, kappa, example disagreements.
- **`/method`****:** plain-language methodology, scoring formula, limitations and threats to validity.
- **`/reproduce`****:** copy-able commands, a live integrity badge (manifest status from `/api/integrity`), and the optional clearly labelled live demo.
- **`/accessibility`****:** the conformance statement.

### 12.3 The 3D layer: purposeful, fast, never the only way in

1. **Hero field:** a restrained instanced-point field or slowly morphing form that reacts gently to the pointer. Purely decorative, so it is hidden from assistive technology. It pauses when the tab is hidden or the canvas is off-screen, is static under reduced motion, and has a visible pause control.
2. **Failure Map (the signature view):** each task is a pair of columns on a shared plane. The short column is the matched control, the tall one the core task; the visible difference between them is the gap. Axes are category and difficulty; column height is failure rate across models and runs; a toggle switches between models. Selection opens an ordinary DOM card (not a canvas overlay) with the numbers and a link to the task.
3. **Equivalents:** a view switcher offers 3D, 2D chart and data table, remembers the choice, and defaults to the table or 2D chart when WebGL is unavailable.

**Interaction rules for the Failure Map**

- A DOM listbox (roving tabindex) mirrors the nodes. Arrow keys move the selection and fly the camera to it; Enter opens the task; Escape resets the camera. A live region announces the selection (for example: “Task T07, category X, core: failed by 4 of 5 models”).
- Orbit, zoom and reset are available as on-screen buttons as well as by drag, pinch and wheel, so nothing depends on a dragging gesture.
- The canvas never traps focus. Tab always leaves it.

**Performance and robustness**

- Lazy-load the 3D chunk (`React.lazy` with a Suspense skeleton). Cap the device pixel ratio (about 1.75 on desktop, 1.25 on mobile). Use instancing, on-demand rendering (`frameloop="demand"`, invalidating on interaction) everywhere except the hero, and adaptive quality (downgrade on slow frames). Dispose geometries, materials and textures on unmount.
- Detect WebGL support and handle `webglcontextlost`; fall back to the 2D chart or table and explain why.
- Wrap the canvas in an error boundary.
- Budgets: initial route JavaScript excluding the 3D chunk under about 200 KB gzipped; Largest Contentful Paint under 2.5 s and layout shift under 0.1 on a throttled mid-range mobile profile; 60 fps target on desktop, 30 fps acceptable on low-end devices.
- Keep layout maths in pure, unit-tested TypeScript functions (for example `computeFailureMapLayout`), separate from rendering.

### 12.4 Data visualisation rules

- SVG charts built with d3 scales or visx. Every chart has a title and description (`<title>`, `<desc>`, `aria-labelledby`), a visible table equivalent and keyboard-reachable tooltips.
- Never encode meaning by colour alone: add patterns, shapes, direct labels or values. Use a colour-vision-safe palette and check it with a simulator.
- Always show uncertainty (intervals) and sample sizes. State units.

### 12.5 Responsive behaviour

- Mobile-first; fluid type with `clamp()`; CSS grid, flexbox and container queries; no horizontal page scroll down to 320 CSS pixels. Wide tables and code blocks scroll inside their own container, which is keyboard-focusable and labelled.
- Touch targets at least 44 by 44 CSS pixels (the AA minimum is 24 by 24). Respect safe-area insets. Never lock orientation.
- Verify at 320, 375, 768, 1024, 1440 and very wide screens.

### 12.6 State, data and errors

- TanStack Query with a typed API client generated from the OpenAPI document. Route-level code splitting. Filter state in the URL so any view can be linked.
- Every view has designed loading (`aria-busy`, skeletons), empty and error states, with a retry action.

### 12.7 Untrusted content

Model outputs are untrusted. Render them as plain text, or as Markdown through a sanitiser. Never use `dangerouslySetInnerHTML` without sanitising. External links get `rel="noopener noreferrer"`. The build must be compatible with a strict CSP (no inline scripts).

### 12.8 Build

`npm ci` then `npm run build` produces `frontend/dist`, which is **committed and shipped in the zip** so judges need no Node. The build writes a `build-info.json` containing a hash of `src/`; preflight fails if `dist` is stale relative to the source.

## 13. Accessibility (WCAG 2.2 Level AA)

Target: conformance with WCAG 2.2 AA on every route, with AAA touches where they are cheap (enhanced contrast for body text, 44-pixel targets, strong focus indicators). Semantic HTML first, ARIA only where HTML cannot express the semantics, accessible primitives for complex widgets, real assistive-technology testing.

### 13.1 Requirements and how to meet them

**Perceivable**

- **1.1.1 Non-text content:** every chart and 3D view has a short accessible name, a longer description and a data table. A meaningful canvas gets `role="img"` with a label and description; a decorative one is `aria-hidden`.
- **1.2.2 and 1.2.5 Video:** the walkthrough has accurate captions and a transcript that also describes the on-screen visuals (`docs/VIDEO_TRANSCRIPT.md`, linked in the README).
- **1.3.1 Structure:** landmarks (header, nav, main, footer), one `h1` per route and a logical heading order, real tables with header cells and scope, real lists.
- **1.3.4 Orientation:** both orientations supported.
- **1.4.1 and 1.4.11:** colour is never the only cue; UI components and chart marks have at least 3:1 contrast against their surroundings.
- **1.4.3:** text at least 4.5:1 (3:1 for large text), verified in both themes.
- **1.4.4, 1.4.10, 1.4.12:** usable at 200% zoom, reflows at 320 CSS pixels, survives user text-spacing overrides.
- **1.4.13:** hover or focus content (tooltips) is dismissible, hoverable and persistent.
- Support `forced-colors` and `prefers-contrast`.

**Operable**

- **2.1.1 and 2.1.2:** everything works by keyboard and nothing traps focus, including the 3D canvas.
- **2.2.2 and 2.3.1:** any motion lasting more than five seconds can be paused; nothing flashes more than three times per second.
- **2.4.1 to 2.4.7:** skip link; unique, descriptive page titles updated on every route change; logical focus order; meaningful link text; visible focus.
- **2.4.11 Focus not obscured:** sticky headers must not cover focused elements (use `scroll-padding` and test it).
- **2.5.1, 2.5.2, 2.5.3, 2.5.7, 2.5.8:** single-pointer alternatives to gestures, cancellable pointer actions, visible labels contained in accessible names, no dragging-only operations, minimum target size.

**Understandable**

- **3.1.1:** `lang` set on the document. **3.2.x:** consistent navigation and help placement, no unexpected context changes.
- **3.3.1 to 3.3.3, 3.3.7:** form fields have programmatic labels; errors are identified in text and tied to their fields (`aria-describedby`, `role="alert"`); no redundant entry. There is no authentication, so 3.3.8 does not apply; say so in the statement.

**Robust**

- **4.1.2:** correct name, role and value for every custom widget (prefer primitives from React Aria or Radix).
- **4.1.3 Status messages:** `role="status"` or polite live regions for loading, result counts after filtering, and live-run progress, throttled so screen readers are not flooded.

### 13.2 Single-page-app behaviour

On every route change: update the document title, move focus to the new `h1` (`tabindex="-1"`), announce the change through a polite live region and reset scroll. Preserve scroll and focus when the user goes back.

### 13.3 Tooling gates (CI fails on violations)

- `eslint-plugin-jsx-a11y` at error level.
- `jest-axe` in every component test.
- `@axe-core/playwright` on every route across a matrix: light and dark themes, forced-colors emulation, reduced motion, 320 and 1280 pixel viewports. Zero serious or critical violations.
- Lighthouse CI accessibility score of at least 95 (informational only; it proves nothing alone).

### 13.4 Manual testing (required, because automated tools find only part of the problems)

- Keyboard-only run of every user journey, including the Failure Map.
- NVDA with Firefox or Chrome on Windows; VoiceOver with Safari on macOS or iOS if available.
- 200% and 400% zoom; text-spacing override; Windows High Contrast or forced colours; reduced-motion on; colour-vision simulation; 3D disabled.
- Record date, tool and version, tester, result and notes for each pass in `docs/ACCESSIBILITY.md`, together with a plain-language conformance statement and a list of known limitations. Claim only what was actually tested.

## 14. Testing strategy

There are two kinds of tests: the **eval test cases** (the tasks and controls in Section 5) and the **software tests** below. Both ship in the zip and run in CI. No test may call a live model API (mark such tests `live`; they are skipped by default). Test fixtures are synthetic, flagged as such, and live under `tests/fixtures`, never in `tasks/` or `results/`.

### 14.1 Harness (pytest, no network)

- Schema and semantic validation: one valid case and one test per class of invalid task.
- Graders: the Section 6.4 suite for every task and every grader type.
- Scoring maths: weights, critical criteria, thresholds, pass@1, consistency, using hand-computed fixtures.
- Statistics: bootstrap determinism with a fixed seed; interval sanity on known data.
- Providers (HTTP mocked with `respx`): success, 429 and 5xx retry, timeout, refusal, truncation, malformed payload; no retry on wrong answers; spend-cap abort; resume after an interrupted run with no duplicates.
- Mock end-to-end run: run, grade, score, report on a tiny synthetic set.
- Reproducibility: replay twice gives identical output; `verify` passes on pristine data and fails after a one-byte change in a raw attempt, grade, task, prompt or config (parametrised tamper tests).
- Executable-grader sandbox: timeout, memory limit, no network, cleanup.
- Preflight and package: each failure mode is detected (missing README heading, placeholder task, secret pattern, oversize file, placeholder video link, missing `.env.example`, zip over the limit, stale `dist`).
- Coverage: at least 90% on graders, scoring, stats and verify; at least 80% overall.

### 14.2 Backend (pytest-asyncio with the Quart test client)

- Every endpoint: success, filters, pagination, not found, validation errors as problem+json, empty database.
- Ingest idempotency and stale-database detection via the manifest hash; the integrity endpoint reflects tampering.
- Security headers present, CORS closed, rate limit enforced, live runs disabled by default.
- SSE: event order, heartbeat, cleanup on client disconnect.
- Static serving, SPA fallback, cache headers.
- Contract: responses validate against the generated OpenAPI schema (optionally fuzz it with Schemathesis).
- Small concurrency smoke test (about 50 parallel reads). Coverage at least 85%.

### 14.3 Frontend

- **Unit (Vitest):** layout maths, formatters, filters, URL state; data hooks against Mock Service Worker.
- **Component (React Testing Library plus jest-axe):** every component is axe-clean; keyboard behaviour of tabs, listbox, dialogs and the view switcher; loading, empty and error states; reduced-motion hook; WebGL-unavailable fallback with a mocked context; theme switching.
- **3D:** do not pixel-test WebGL in unit tests. Test layout functions and scene props; add a Playwright smoke test that the canvas renders non-blank in headless Chromium with software WebGL, and another that the fallback appears with WebGL disabled.
- **End-to-end (Playwright on Chromium, Firefox and WebKit, plus phone emulation):** overview to Failure Map, select a node by keyboard, open task detail, open the raw attempt; filter tasks and confirm the live-region count; toggle theme; integrity badge on `/reproduce`; unknown route. A global assertion fails any test that makes a request to a non-local origin.
- **Visual regression (optional):** screenshots at 320, 768 and 1280 pixels in both themes with the canvas masked.

### 14.4 CI and the single check command

`.github/workflows/ci.yml` and a local `python scripts/check_all.py` run, in order: lint and type-check (ruff, mypy, eslint, tsc), unit and component tests, backend tests, frontend build, end-to-end and accessibility tests, `evalkit validate-tasks`, `evalkit verify`, `evalkit reproduce`. Pin action versions. Nothing merges or ships with a failing step.
