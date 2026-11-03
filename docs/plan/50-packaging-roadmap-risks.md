<!-- Packaging, README, video, preflight, roadmap, risks, checklist. Section 0.1 and 0.6 override older dates and scope elsewhere. -->

## 15. Packaging, README, video and preflight

### 15.1 `preflight` (exit non-zero on any failure)

- **README:** at the root; the eight required headings present, in order; no TODO or placeholder text; video link present and answering with HTTP success (and a printed reminder to open it in a private window); short description present.
- **Tasks:** none with `status` placeholder or draft; every task has `verified_by`; schema valid; task hashes match the manifest.
- **Results:** an attempt exists for every task, model and repetition; `verify` passes; the model IDs, run date and settings quoted in the README match `run.json`. README tables are **generated** by `report` between marker comments, never typed by hand, so they cannot drift from the data.
- **Secrets:** `.env.example` exists and contains names only; no `.env`; a scan of every file to be packaged for API-key patterns and high-entropy strings.
- **Size and contents:** zip at most 50 MB (aim for under 10 MB); no single file over about 5 MB; no video or large media; no `node_modules`, virtual environment, `.git` or caches.
- **Dependencies:** `requirements.txt` present and pinned; `frontend/package-lock.json` present; `dist` build stamp matches the source hash.
- **Disclosures and licence:** `docs/DISCLOSURES.md` non-empty (AI tools used, prior work, datasets, benchmarks); `LICENSE` present; every task has provenance; no third-party text copied verbatim.
- **`preflight --clean-room`****:** unzip into a temporary directory, create a fresh virtual environment, `pip install -r requirements.txt`, run `python -m evalkit reproduce`, start the backend, request `/api/health` and `/`, and print total time. This is the single best predictor of passing the judges’ reproducibility check. Run it on Windows as well as Linux or macOS if at all possible.

### 15.2 README content guide

Use the eight headings from Section 1.2, then “Limitations and threats to validity” and “Repository map”. Content for each:

1. **Short description:** at most five sentences: domain, gap, headline result with its interval, why it matters.
2. **Video:** the link, plus links to captions and transcript.
3. **Domain and expertise:** specific, honest and verifiable experience. No inflated claims.
4. **What it tests:** the capability measured, who needs it, the real-world stakes, and what the eval deliberately does **not** measure.
5. **Setup and run:** prerequisites (Python version) and a quick start of at most four commands:

```
python -m venv .venv      # then activate it for your shell
pip install -r requirements.txt
python -m evalkit reproduce      # no API keys needed; re-scores the committed outputs
python -m backend.serve          # dashboard at http://localhost:5000
```

Then the live-run path (copy `.env.example` to `.env`, add keys, run `estimate`, then `run`), notes for Windows, macOS and Linux, the estimated and actual runtime and cost, and an optional container recipe.

1. **Models and results:** generated table with the exact model IDs the APIs returned, run date, settings, runs per task, pass@1 with intervals, consistency, and control versus core.
2. **Failure analysis:** taxonomy breakdown, three to five annotated raw examples, the explanation of why models fail, and what the evidence does not show.
3. **Prior work and sources:** pre-existing code and libraries, benchmarks or datasets consulted, how AI coding tools were used, and which parts were written by hand.

### 15.3 Video script (target 4:30, hard limit 5:00)

- **0:00 to 0:25:** hook with one concrete, striking failure and the domain.
- **0:25 to 1:10:** the gap: what an expert does, what the models do instead, why it matters.
- **1:10 to 2:10:** the eval: task design, matched controls, the grader and its measured reliability.
- **2:10 to 3:30:** results: the real dashboard, the Failure Map, the task matrix, one raw failure opened on screen.
- **3:30 to 4:10:** what the failures reveal, plus honest limitations.
- **4:10 to 4:30:** reproduce it: show the one command and the integrity check passing.

Record at 1080p with large type, never show keys, upload captions, and use an unlisted link that works in a private window without sign-in. Keep the script in `docs/VIDEO_SCRIPT.md`. Do not put the video in the zip.

### 15.4 Submission procedure

1. Run `scripts/check_all.py`, then `preflight`, then `package`.
2. Unzip into a brand-new folder and run the clean-room check there.
3. Open the video link in a private window; confirm the description and link match the README.
4. Upload the zip; only the latest upload counts, so submit early and replace it if you improve it.
5. Accept the Participant Agreement, keep a screenshot of the confirmation, and keep a backup copy of the zip with its SHA-256.
6. Keep the providers’ usage dashboards and billing records as private evidence that the runs really happened.

## 16. Phased roadmap with acceptance criteria

The deadline is 6 November 2026, so Section 0.3 gives the actual day-by-day schedule; the phases below are ordered by dependency and supply the acceptance criteria. Work back from the deadline and **freeze features at least one day before it**.

**Parallel tracks.** After Phase 1 fixes the interfaces (task schema, attempt schema, OpenAPI document), these can proceed in parallel against fixtures: A) eval content (owner), B) harness, C) backend, D) frontend.

### Phase 0: Foundations (gate G0)

Scaffold the repo, tooling, pinned toolchains, CI skeleton, `eval.config.yaml`, `docs/DOMAIN.md`, `docs/DECISIONS.md`. **Accept when:** a fresh clone installs, the empty test suites run green, linters pass, and the domain record is complete.

### Phase 1: Harness core with the mock provider

Task schema and loader, mock provider, graders (exact, numeric, structured, rubric), scoring, statistics, raw attempt records, manifest, `verify`, `replay`, `reproduce`, CLI. **Accept when:** a mock run goes end to end; tamper tests fail as they should; replay is identical; coverage targets are met.

### Phase 2: Real providers and pilot (gate G1)

Adapters for at least three providers, `estimate`, spend cap, resumability. The owner drafts 25 to 40 candidate tasks; run the pilot; review every failure by hand. **Accept when:** pilot results exist, every failure has been judged genuine or discarded, and cost stayed within budget.

### Phase 3: Final tasks and grader validation (gate G2)

Final 8 to 10 core tasks and their controls, provenance and verification metadata, the calibration set (at least 40 items, including adversarial ones; in the Section 20 pack, the evidence ladder and mutation suite instead), grader unit tests per task. **Accept when:** `validate-tasks` is clean, the grader reliability bar is met (or the rubric was revised and re-measured), and the task set is tagged and frozen.

### Phase 4: Final run and analysis (gates G3 and G4)

The final run at 3 to 5 repetitions per task and model; manifest; failure tagging; statistics; generated README tables. **Accept when:** `reproduce` passes from a clean clone, every number traces to raw attempts, and every failure tag is human-confirmed.

### Phase 5: Backend and database

Ingest, API, security, SSE, tests. **Accept when:** every endpoint is tested, coverage is at least 85%, and it works on the real results.

### Phase 6: Frontend foundation

Design tokens, layout, routes, API client, accessible components, charts with table equivalents, task and attempt viewers, responsive behaviour. **Accept when:** every route is axe-clean, fully keyboard-operable and reflows at 320 pixels.

### Phase 7: 3D layer

Hero field, Failure Map, view switcher, fallbacks, performance budgets. **Accept when:** keyboard, reduced-motion and no-WebGL paths are tested and the budgets are met on a throttled mobile profile.

### Phase 8: Accessibility and quality hardening

Manual assistive-technology passes, fixes, cross-browser checks, Lighthouse, `docs/ACCESSIBILITY.md`. **Accept when:** zero serious or critical axe violations and the manual checklist is recorded.

### Phase 9: Documentation, video and packaging (gates G5 and G6)

README, METHODOLOGY, SCORING, transcript, video, `preflight --clean-room`, `package`. **Accept when:** preflight is green, the video link works in a private window, and the zip is within the limit.

### Phase 10: Optional extras (only after Phase 9 is accepted)

Live demo polish, container recipe, additional visuals.

### Cut-lines if time runs short

- **P0, never cut:** everything the brief requires and the integrity and reproducibility machinery (Phases 0 to 4, the README, the video, preflight).
- **P1, cut last:** grader reliability evidence, controls, failure taxonomy, the raw-output viewer.
- **P2, trim if needed:** the full dashboard breadth, live demo, visual regression tests.
- **P3, cut first:** 3D polish beyond the Failure Map, container recipe, extra themes.

## 17. Risks and mitigations

- **Models do not actually fail on your tasks.** Pilot early. Change tasks or domain rather than forcing a result; report honestly, because a narrower, rigorously shown gap beats an exaggerated one.
- **Grader false passes or false fails.** Deterministic graders first; calibration set; adversarial calibration items, including responses that try to manipulate an LLM judge (for example by instructing it to mark the answer correct); treat response text strictly as delimited data in judge prompts.
- **Judges cannot reproduce.** Pinned dependencies, replay mode, prebuilt `dist`, no Node requirement, clean-room test on Windows and Linux or macOS.
- **Model deprecation or API drift before judging.** Record returned model IDs, commit raw outputs; replay needs no API.
- **Cost overrun or rate limits.** `estimate`, spend cap, resumable runs, start with a small k and scale up.
- **Leaked secrets.** Ignore rules, `.env.example`, secret scan; rotate any key you suspect was exposed.
- **Confidential or third-party content.** Original scenarios only; cite sources rather than copying; provenance field; owner review before packaging.
- **Accusation of fabricated results.** Manifest, provider response IDs, raw logs, retained billing and usage records.
- **Selection bias and over-claiming.** Disclose the pilot and selection, include controls, report intervals, and word conclusions no more broadly than the evidence allows.
- **3D performance or accessibility regressions.** Budgets, fallbacks, an easy off-switch, tests for each path.
- **Scope creep.** The UI never blocks the eval; use the cut-lines.
- **Video over five minutes.** Rehearse against the script and cut.

## 18. Definition of done

- [ ] Domain record written; gap evidenced by the pilot and hand-reviewed failures
- [ ] 8 to 10 core tasks (plus controls where possible), each verified to evidence level VL2 or higher (Section 20.2), frozen and tagged
- [ ] Grader reliability measured and reported; grader unit tests green
- [ ] Final run complete with at least three repetitions per task and model; raw outputs and scores committed
- [ ] `python -m evalkit reproduce` passes from a clean unzip, with no API keys
- [ ] Failure taxonomy applied and human-confirmed; representative examples chosen
- [ ] Backend, frontend and harness test suites green; coverage targets met
- [ ] Every route axe-clean; manual assistive-technology and keyboard passes recorded in `docs/ACCESSIBILITY.md`
- [ ] 3D Failure Map has keyboard, reduced-motion and no-WebGL equivalents; budgets met
- [ ] README has all eight sections with generated tables; disclosures complete
- [ ] Video of at most five minutes, captioned, link tested in a private window
- [ ] `preflight --clean-room` green; zip under 50 MB; no secrets, videos or confidential data
- [ ] Participant Agreement and submission confirmation (deferred; not part of
      the offline release)

## 19. Inputs the owner must provide before coding starts

1. **Domain and gap hypothesis** (Section 4), and your honest expertise summary.
2. **The judging rubric and the full participant’s guide**, so Section 1.5 can be replaced with real weights.
3. **The deadline and your daily time budget**, so the phases can be turned into dates.
4. **Your operating system and hardware**, to confirm the cross-platform choices.
5. **Which model providers you have API access to and a spend cap** (at least three providers are recommended).
6. **Whether you have a second expert** who can review the definitions and a sample of the evidence (optional, strongly advised for the computer-science pack).
