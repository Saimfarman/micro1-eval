# Release checklist and evidence policy

## Local verification

From a clean checkout, install the pinned dependencies and run:

```powershell
npm ci
python -m pip install -r requirements.txt -r requirements-dev.txt
python -m pytest
npm run typecheck
npm run build
npm run accessibility
python -m evalkit validate-tasks
python -m evalkit preflight
```

`preflight` checks the task corpus, required documentation and environment
template, pinned Python requirements, generated frontend assets, manifest
coverage, OpenAPI shape, migration bootstrap, and offline API health. It does
not contact a provider. Run `python -m evalkit ingest` to build the local
dashboard index.

Record the actual command output and artifact hashes for any release claims.
The test count and build status should be taken from a fresh run, not copied
from an older report. Automated accessibility checks do not constitute an
independent browser audit.

## Evidence and packaging

The submission evidence is the checked-in source, tasks, and verified result
files. SQLite is derived and is not the evidence authority. A packaging command
exists in the CLI for local use, but no archive is required in this repository;
create any submission archive separately when preparing the submission.

## Claims policy

The deterministic mock is a pipeline fixture, not a commercial-model result.
Do not claim live-provider findings, human review, reviewer sign-off, or
accessibility conformance without the corresponding recorded evidence. Any
future study should record its command, date, exact model/provider,
configuration, and output artifact hashes.
