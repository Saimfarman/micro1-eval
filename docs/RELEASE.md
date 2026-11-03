# Release checklist and evidence policy

## Required checks

From a clean checkout:

```text
npm ci
python -m pytest
npm run typecheck
npm run build
npm run accessibility
python -m evalkit validate-tasks
python -m evalkit preflight
python -m evalkit package
```

`preflight` checks the task corpus, required documentation, `.env.example`,
absence of committed secret values and non-plan placeholders, manifest
coverage, dependency locks, generated frontend assets, OpenAPI structure,
migration bootstrap, and offline API health. It never makes a provider call.
An external reviewer, live-provider pilot, video URL, participant agreement,
and submission confirmation are not required for this offline release.

## Package contents

`python -m evalkit package` writes `micro1-eval-submission.zip` while excluding
`.env`, virtual environments, caches, node modules, databases, and prior zip
archives. The package contains source, pinned dependency manifests,
documentation, tasks, and generated frontend assets. SQLite remains a derived
local artifact.

## Claims policy

Release notes may claim only commands whose output is attached to the release
record. The current repository evidence is 128 passing Python tests and a
successful Vite production build. No live provider call, human review, or
browser accessibility audit is claimed here. A video link may be added later
to the README without changing the offline release gates. Future claims must
include the command, date, configuration, and artifact hash. Mock results are
not commercial-model results.
