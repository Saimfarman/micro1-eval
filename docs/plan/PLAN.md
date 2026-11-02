
# micro1 Eval Hackathon: Implementation Plan

*Agent-agnostic build plan · Quart backend · React + Vite + three.js frontend · WCAG 2.2 AA · Prepared 30 October 2026*

## 0. Read this first

This plan is written for any coding agent (or a human developer). It uses no tool-specific syntax. Give it to the agent in parts (see 0.4) and follow the six-day schedule in Section 0.3; Section 16 remains the reference for acceptance criteria. Every phase ends with acceptance criteria; do not start the next phase until they pass.

Four ideas drive every decision below:

- **The eval is the product.** Judges score a real gap, rigorous tasks, a trustworthy grader and reproducibility. The web app is a lens on the eval, not a substitute for it. A beautiful dashboard on a weak eval loses to a plain repo with a rigorous one.
- **Reproducibility is a gate, not a bonus.** The brief says a submission is scored only after it passes eligibility, completeness, integrity and reproducibility checks. The core eval must therefore run from a plain command line with no Node, no database server and (for re-scoring) no API keys. The web stack is an optional layer on top.
- **Nothing may be fabricated.** The brief states that fabricated results lead to disqualification. Every number in the README, video and dashboard must trace back to raw model outputs produced by the harness.
- **Some inputs only the owner can supply:** the domain choice, API keys, your review of the evidence behind every task, and the video. In the computer-science domain pack (Section 20) nobody types the expected answers: they are computed by independently built, cross-checked checkers and explained step by step. The agent builds everything around these inputs and stops at the human gates in Section 2.

**Open item:** the screenshots mention a participant’s guide and a judging rubric that were not visible when this plan was written. Paste the rubric’s categories and weights into Section 1.5 as soon as you have them and re-prioritise the phases accordingly.

### 0.1 Six-day edition for the 6 November deadline (this overrides Sections 16 and 20 where they conflict, and the dates in 0.3 are superseded by 0.6)

Facts as of 31 October 2026: the deadline is 6 November, so there are six working days (31 October to 5 November) plus 6 November as a reserve; the budget is $0; the owner is a solo computer-science student on Windows, using GitHub Copilot in VS Code, with no reviewer, recording the video personally with a screen recorder. Check the exact cut-off time and time zone on the submission page. Plan to **submit on the evening of 5 November** and use 6 November only for emergencies, never for features. The full plan is far larger than six days allow, so this edition fixes what is built, what is cut, and in which order.

**Decisions**

1. **M4 (linearizability) is out of the submission.** It adds a different certificate type and an exhaustive verifier, and a half-finished extra module lowers quality. Reconsider only if everything else is frozen by the end of Day 4. State it as future work in the README.
2. **M1 and M2 are the core.** M3 (in-doubt transactions) goes in only if the parser, checkers and vectors are done by the end of Day 2, because it is the judgment-call module and cheap once the checkers exist.
3. **Checkers:** O1 (reference simulator) and O2 (rule and graph checker) are mandatory. O3 (Z3) only if ahead of schedule. The external Elle check and the independent human reviewer are dropped. Evidence levels become: **VL1** = O1 and O2 agree on the item, all vectors pass, the metamorphic suite is green, and at least 20,000 differential cases agree; **VL2** = VL1 plus a derivation the owner has read and signed. Every core task needs VL2. The README must say plainly that there was no independent reviewer. Instead, the owner compares the definitions in 20.4 with two public sources (the Jepsen consistency pages and Kleppmann, chapter 7) and records the result in `docs/DECISIONS.md`.
4. **Extended study:** shrink it to what the free quotas allow (for example three sizes, 8 to 10 instances each, one or two models). Optional.
5. **Dashboard MVP (about a day and a half in total):** routes Overview, Failure Map (3D with a table equivalent), Tasks and task detail with the derivation and timeline, Results, and Method with Reproduce. A minimal Quart API and a small SQLite ingest. Accessibility: `eslint-plugin-jsx-a11y`, axe checks on every route in Chromium, a keyboard-only pass, reduced-motion support, one NVDA pass (NVDA is free for Windows), and the text equivalents. Skip Firefox and WebKit matrices, Lighthouse CI, Docker and a full CI workflow; one local `check_all.py` script is enough.
6. **Never cut:** the vectors and the O1/O2 agreement; the pilot and the pre-registered selection; certificate graders with the mutation suite; raw outputs, manifest, `verify` and `replay`; README sections 1 to 8; the video; preflight and the clean-room test; basic accessibility.

**Cut order if you fall behind (first to cut first):** the 3D hero field; the interactive Learn route (keep a static page of V1 to V10 with derivations); the extended study; Try-it mode; M3; O3; the 30-item audit (reduce to 15); controls for all but five tasks; core tasks from 10 down to 8.

### 0.2 Running the eval at $0

Quotas below are as reported by third-party roundups dated 22 October 2026. They change often, so check each provider’s own console before relying on them.

- **Google Gemini API free tier:** Gemini 3.8 Flash and 3.6 Flash, the Flash-Lite models and Gemma 4, with no card. Roughly 20 requests per day and 5 per minute for the 3.x Flash models and about 500 per day for Flash-Lite. The free tier may use your inputs to improve Google’s products, which is acceptable here because every history is synthetic; never send personal data.
- **Groq:** `openai/gpt-oss-120b` at about 30 requests per minute, 1,000 per day, 8,000 tokens per minute and 200,000 tokens per day. The token caps, not the request caps, will be the binding limit for long reasoning.
- **OpenRouter:** `:free` models at about 20 requests per minute and 50 per day. The free list rotates, so pin the exact ID on the day you run and record it.
- **Mistral free tier:** limits appear in your console; it may require agreeing to data use for training.
- **NVIDIA API catalog:** free prototyping access through the NVIDIA Developer Program.
- **GitHub Models** was reported retired on 30 July 2026, and a Copilot subscription does not give API access to models for the harness. Do not plan around either.

Quota-aware harness requirements:

1. `models.yaml` stores each model’s requests per minute, requests per day, tokens per minute and tokens per day. `estimate` prints how many **days** a run needs.
2. The runner paces itself, stops cleanly when a daily quota is exhausted, and resumes the next day. A run may span several days; record the dates in `run.json` and the README.
3. Keep prompts compact, set a documented `max_tokens`, and record every truncation.
4. Use at least three providers so one exhausted quota does not stop everything.

**One adapter covers most providers.** To save time, write a single generic OpenAI-compatible adapter that takes the base URL, the key variable name and the model ID from `models.yaml`. Groq, OpenRouter, Mistral and the NVIDIA catalog publish OpenAI-compatible endpoints, and Gemini and Azure can be reached the same way or with small variations (confirm each in its documentation). Add a provider-specific adapter only when a provider cannot be reached this way. The one-file-per-provider layout in Section 9.2 is optional in this edition.

Budget arithmetic: 10 core tasks plus 10 controls is 20 items; two runs per model is 40 calls per model. That is about two days on Gemini 3.x Flash and one day each on Groq and OpenRouter, so about 120 calls over two to three days. The pilot (about 24 instances across two or three models) is Day 2; the final run is Days 3 and 4.

**Manual flagship check (optional, free, honest).** Paste each core and control prompt into the free chat interfaces of one or two top assistants. Save the raw replies with `python -m evalkit import-manual`, recording the product name and the model label as shown, the date and time, and whether a reasoning mode was on. Grade them with the same graders and report them in a **separate** table labelled “manual chat collection; settings not controllable”. Never mix them into the API statistics.

**Honest model wording.** Do not call free-tier models “frontier” unless that is accurate. Write what was actually tested, for example “strong, publicly available models reachable on free tiers (list with exact IDs), plus a manual check of X”. State plainly that the budget was $0.

### 0.3 Day-by-day schedule (Windows, solo, six days)

**Day 1, Saturday 31 October: foundations**

- Install Python 3.12, the current Node LTS, Git and VS Code (for example `winget install Python.Python.3.12`). Create a private GitHub repository for backup. Create free API keys for at least three providers and put them in a git-ignored `.env`. Never paste keys into chat or into the zip.
- Save the plan as files under `docs/plan/`, add the Copilot instructions file (0.4), copy Section 20.4 into docs/MODELS.md, and run prompts P1 to P4.
- Learning path, part 1 (Kleppmann chapter 7 and the Jepsen pages, about 3 hours).
- **Gate:** parser and printer round-trip tests pass; V1 to V10 pass under O2; a one-call test succeeds for each provider.

**Day 2, Sunday 1 November: checkers, graders, runner, pilot**

- O1 built in a fresh Copilot chat without opening O2’s code; differential test (at least 20,000 histories) and metamorphic tests; generator for M1 and M2; prompt template; graders with certificate verifiers and the mutation suite; runner with quota pacing; manifest, `verify`, `replay`; `import-manual`.
- Pilot: about 24 pilot-seed instances (sizes 6 to 12, balanced) on two or three models. Open about ten failures and confirm they are real model errors, not parsing, token-budget or grader defects.
- **Gate and decision (night of Day 2):** go, or raise difficulty, or switch theme (option 2 or 3 from the earlier list). Do not continue to the dashboard without a go.

**Day 3, Monday 2 November: select, freeze, start final runs**

- Commit `docs/SELECTION.md` with the rules and the final seed before examining pilot details. Generate final candidates; select the core strata; build controls; generate derivations; read every derivation and sign VL2. Add M3 if on schedule.
- Freeze the oracle and the tasks (git tag `freeze-1`, hashes in the manifest). Start the final API runs in daily batches, and the manual check.
- Start the Quart API skeleton in parallel.
- **Gate:** tasks frozen and the final run started.

**Day 4, Tuesday 3 November: results and the app foundation**

- Continue the final batches. Auto-tagging, statistics (bootstrap intervals), generated README tables.
- Quart endpoints, SQLite ingest, React shell, routes, results matrix, task detail with derivation and timeline.
- **Gate:** the final run is complete by the morning of Day 5 at the latest; API tests pass.

**Day 5, Wednesday 4 November: finish the app, audit, document**

- Failure Map in 3D with the table equivalent; attempt viewer; accessibility pass (axe, keyboard, NVDA); build `frontend/dist`.
- Run the audit sample; generate the README tables; write the README sections 1 to 8, limitations and disclosures; write the video script.
- **Gate:** the dashboard starts with one command and every route passes the axe check.

**Day 6, Thursday 5 November: video, package, submit**

- Record the video (target 4:30, hard maximum 5:00), upload it as unlisted or anyone-with-link, and test it in a private window.
- Run `preflight`, then the clean-room test from a fresh unzip; fix only defects; package; upload; accept the Participant Agreement; keep the confirmation.
- **Gate:** submitted by the evening of 5 November.

**Friday 6 November:** reserve only. No new features.

### 0.4 GitHub Copilot starter kit (VS Code, agent mode)

**How to feed the plan.** The full plan is too long for one prompt. Save it as files under `docs/plan/` (for example one file per major part), keep this Section 0 and Section 20 handy, and attach only the relevant file to each prompt. Work in small steps: one deliverable per prompt, run `python -m pytest -q` yourself after each, and commit when green. Copilot plans have usage limits; check yours and save premium requests for the oracle design and the graders. Ask Copilot to explain anything you do not understand, because you must be able to explain the project in the video.

**Save as ****`.github/copilot-instructions.md`****:**

```
# Project rules for GitHub Copilot (micro1 eval hackathon)
- Goal: an eval of AI models on checking database-transaction histories. Plan files are in docs/plan/.
- NEVER invent or hand-write expected answers, model outputs, scores, costs, citations or reviewer sign-offs.
  Expected answers come only from the code in evalkit/domain/oracle.
- NEVER put API keys in code, logs, tests or the frontend. Keys come from environment variables (.env, git-ignored).
  .env.example lists names only.
- After the freeze tag, do not edit evalkit/domain/oracle. Never change a test just to make it pass; explain any test change.
- Windows: use pathlib, no symlinks, no bash-only scripts, PowerShell-friendly commands.
- Python 3.12, Quart, pytest. Frontend: React + Vite + TypeScript + three.js. Accessibility: WCAG 2.2 AA.
- Small steps: write or update tests first, implement, run pytest -q, show the result, then stop.
- Pin dependencies. Tell me why before adding any new one.
- No external CDNs: everything must work offline.
- Ask before deleting files or running anything that calls an API or could cost money.
```

**First prompts** (attach the named section from the plan to each):

```
P1 Scaffold (Section 8, trimmed to what exists so far)
  Create the repository scaffold for Phases 0 to 1b only: pyproject.toml (ruff, pytest), pinned requirements.txt and
  requirements-dev.txt, .gitignore (.env, .venv, node_modules, results/live), .env.example (GEMINI_API_KEY,
  GROQ_API_KEY, OPENROUTER_API_KEY, MISTRAL_API_KEY with no values), a README stub with the eight required headings.
  Write no eval logic yet. Run pytest and show it passes on the empty suite.

P2 Parser and printer (Section 20.5)
  Implement evalkit/domain/history.py: dataclasses plus a strict parser and printer for the timed and commit-ordered
  notations, with golden-file and round-trip tests. Do not implement any checker yet.

P3 Vectors as tests (Section 20.11)
  Create tests/domain/test_vectors.py with V1 to V10 as parametrised tests that call check(history, module).
  The function does not exist yet. Do not implement it.

P4 Checker O2 (Section 20.4 and 20.6)
  Implement evalkit/domain/oracle/rules.py following D1, D2 and D3 exactly. Make every vector test pass.
  Produce certificates and the deterministic plain-English derivation. Do not alter the vector tests.

P5 Checker O1 (use a NEW chat; do not open rules.py)
  From Section 20.4 and 20.6 only, implement evalkit/domain/oracle/reference.py: the slow reference simulator.
  Then write tests/domain/test_differential.py comparing O1 and O2 on random small histories, and report disagreements.

P6 Metamorphic tests (Section 20.6)
  Add tests/domain/test_metamorphic.py with the renaming, timestamp-shift, reorder, delete-aborted and
  add-fresh-key transformations. Do not change the checkers; report any failure.
```

Later prompts follow the same pattern: the generator, graders and mutation suite, the quota-aware runner, manifest and replay, the Quart API, the React app, and the preflight command. Each prompt names one deliverable, one plan section and one test to pass.

**Windows commands:**

```
py -3.12 -m venv .venv
.\.venv\Scripts\Activate.ps1          # if blocked: Set-ExecutionPolicy -Scope CurrentUser RemoteSigned
pip install -r requirements.txt -r requirements-dev.txt
python -m pytest -q
```

**End-of-day routine:** run the tests, commit, push to your private repository, and write three lines in `docs/DECISIONS.md` about what changed and why. It protects you if a tool or a laptop fails.

### 0.5 What the student benefits change (GitHub Copilot Student and Azure for Students)

This adds to 0.2 and 0.4. The details below come from public pages and announcements read on 31 October 2026 and may change, so check your own accounts.

**GitHub Copilot Student (free for verified students)**

- It includes unlimited code completions, plus a monthly allowance of GitHub AI Credits for chat and agent use. Since 1 June 2026 usage is billed by tokens instead of counted as premium requests. I could not find the size of the Student allowance, so open your Copilot usage page in your GitHub settings on Day 1 and note the number.
- Since 12 March 2026, premium models (for example Claude Opus, Claude Sonnet and GPT-5.4) are no longer selectable by hand on the Student plan; they are used only when Copilot chooses the model for you (Auto mode).
- **Budget your Copilot usage.** Use inline completions freely. Spend chat and agent calls on the hard parts: the checkers, the graders, the runner and the Quart API. Give one-file, one-test prompts, avoid long autonomous runs and large attachments, and ask for diffs rather than rewrites.
- **Never use Copilot Chat as a source of eval outputs.** You cannot choose the model, and Copilot adds its own hidden instructions, so the results could not be attributed to a named model with known settings. Do not script or automate Copilot either; use it by hand as a coding assistant.
- If the allowance runs out, you may finish with other free assistants. The brief allows AI coding tools, but list every one in `docs/DISCLOSURES.md` and read every line you paste.

**Azure ****(tested on 31 October; see the results below****)**

- Microsoft offers verified full-time university students a $100 credit for 12 months with no credit card, and its page highlights Azure OpenAI.
- If a chat model can be deployed under your student subscription, the credit covers this eval easily: 120 to 300 calls of a few thousand tokens each cost a few dollars at most. That would give you stronger models, real API settings and far higher rate limits than the free tiers in 0.2.
- **Unverified:** student subscriptions can restrict which models and regions are available. Test it with a hard time cap: create the subscription, open Microsoft Foundry, try to deploy one chat model, and send one request from Python. If you are blocked within 30 minutes, stop and use the free tiers.
- **Cost safety:** set a budget alert in Azure, and set `MAX_SPEND_USD` in `.env` to a low cap (for example 20). Credits are not unlimited.
- **If it works:** add an `azure` provider adapter (endpoint, API version and deployment name in environment variables, key in `.env`, never committed), record the exact deployed model names and versions, and change the README budget statement to “$0 out of pocket (free-account credit)”.
- I did not verify any other Student Developer Pack partner credits for model APIs. Look at the pack’s offers page yourself, and treat anything you find as optional.

**Update, 31 October:** the account that was actually created is the standard Azure free account (a credit of about $200 usable within 30 days, plus 12 months of selected free services), not Azure for Students. Everything above still applies with two changes: the credit expires about 30 days after sign-up, which is after the deadline, and the README budget wording becomes “$0 out of pocket (free-account credit)”. Check the real balance under Cost Management and Billing, then Credits. Never click Upgrade: it moves the account to pay-as-you-go billing.

**Result of the test, 31 October (passed):** a `gpt-5-mini` deployment was created in a Foundry project named `micro1-eval` on the free account and answered a test message in about two seconds, so model deployment works on this account. The deployment was then deleted to leave nothing running; redeploy it when the first provider test or the pilot needs it (Day 2). Notes for the harness and the README:

- `gpt-5-mini` is a small reasoning model. Describe it as such, never as frontier. Try one larger OpenAI model and one non-OpenAI model that Azure sells directly; skip any that report quota or unavailable, and never upgrade.
- Reasoning models spend hidden reasoning tokens (a one-word greeting used about 4,100 tokens). Use `max_completion_tokens` rather than `max_tokens`, budget several thousand tokens per call, and record the reported usage for every attempt.
- Environment variables in the git-ignored `.env`: `AZURE_OPENAI_ENDPOINT`, `AZURE_OPENAI_API_KEY`, `AZURE_OPENAI_DEPLOYMENT`. The endpoint pattern for the generic OpenAI-compatible adapter is the resource address ending in `/openai/v1`, with the deployment name as the model.
- The credit is the only protection against charges, so leave the account on the free plan, never press Upgrade, check the balance daily under Cost Management and Billing, then Credits (usage can lag by up to a day), and keep `MAX_SPEND_USD` low.
- Copilot Student on 31 October: 149 of 200 AI credits used (74%), resetting on 1 November at 05:00. Each credit costs $0.01, so the allowance is about $2 a month. Do the setup and manual steps first, run the credit-heavy prompts (P2 and P4) after the reset, and keep every prompt to one file and one test.

**Changes to the Day 1 schedule:** both checks are done (the Copilot usage page was read and the Azure test passed); the free-tier route in 0.2 remains the fallback.

### 0.6 Re-baselined schedule and the starter pack (1 November)

Work started on Sunday 1 November, one day later than 0.3 assumed. The remaining days are:

- **Day 1, Sunday 1 November:** install the starter pack and run its tests; build the instance generator, the prompt builder and the certificate graders with their mutation tests; the OpenAI-compatible provider adapter with quota pacing; learning path part 1.
- **Day 2, Monday 2 November:** the pilot (about 24 instances on two or three models) and the go or no-go decision in the morning; commit `docs/SELECTION.md` with the final seed; runner, raw records, manifest, `verify` and `replay`; select core tasks and controls; read the derivations and sign; freeze (tag `freeze-1`); start the final runs.
- **Day 3, Tuesday 3 November:** final runs in daily batches; statistics, tags and generated tables; Quart API and SQLite ingest; React shell and routes.
- **Day 4, Wednesday 4 November:** finish the dashboard (Failure Map with its table equivalent), accessibility pass, audit sample, README generation.
- **Day 5, Thursday 5 November:** video, preflight, clean-room test, package, and submit by the evening.
- **Friday 6 November:** reserve only.

Because a day was lost, apply the cut order in 0.1 early: M3 and the extended study are the first candidates to drop, and the dashboard stays an MVP.

**Starter pack (built and tested on 1 November).** A zip with the repository skeleton and the verified core of the domain pack, so Copilot credits are not spent on the correctness-critical code:

- `evalkit/domain/history.py`: strict parser and printer (20.5).
- `evalkit/domain/oracle/rules.py`: checker O2 for D1, D2 and D3 with certificates and derivations; `check(history, module)` for M1, M2 and M3.
- `evalkit/domain/oracle/reference.py`: checker O1, a simulator and brute-force search that does not import O2.
- `evalkit/domain/fuzz.py`: random history generators for tests.
- `tests/`: 66 tests (parser, the ten vectors under both checkers, a differential test of O1 against O2, and metamorphic tests). `scripts/diff_fuzz.py`: 60,000 random histories ran with zero disagreements and exercised every violation kind and anomaly class.
- `docs/MODELS.md`, `docs/VECTORS.md`, the split plan under `docs/plan/`, the Copilot rules, `AGENT_START.md` with the next prompts, `.gitignore` and `.env.example`.

**What the starter pack does not prove.** O1 and O2 were written by the same AI assistant in one session, so they are two different methods by one author, not two independent teams. A misunderstanding of a definition could be shared. The defences are the ten textbook vectors (whose verdicts come from the literature, not from the code), the differential and metamorphic tests, and the owner’s comparison of `docs/MODELS.md` with two public sources. If Copilot credits allow, have Copilot write a third checker from `docs/MODELS.md` alone in a fresh chat (prompt P0 in `AGENT_START.md`) and add it to the differential test. The README must state exactly this: two checkers written with AI assistance by the same author, plus literature vectors, and no independent human review.

**AI-tool disclosure.** Record in `docs/DISCLOSURES.md` that the plan and the starter code were drafted by an AI assistant (Claude) and reviewed and extended by the owner with GitHub Copilot, and list any other tool used.

## 1. What the brief requires

### 1.1 Deliverables

- **One .zip file, max 50 MB**, containing code and small supporting files, with `README.md` at the zip root.
- **Video walkthrough link, 5 minutes max**, entered in the submission form and in the README. It must open for anyone with the link, without an access request (YouTube unlisted, Google Drive “anyone with the link”, Loom, Vimeo). Showing your face is not needed; an AI voice is fine.
- **Short description**, entered in the submission form and in the README.

### 1.2 README.md must contain these eight items

Use these exact headings, in this order, so a reviewer can tick them off in seconds:

1. Short description: domain, the gap found, key finding (a few sentences)
2. Video walkthrough link
3. Domain and expertise
4. What it tests and why it matters (what is measured, who it is for, why the gap matters in practice)
5. Setup and run instructions (works from a clean environment, one command where possible, how to supply API keys via environment variables, approximate runtime and cost)
6. Models tested and results (exact model IDs or versions, run date, settings such as temperature and runs per task, scores)
7. Failure analysis (where and why models fail)
8. Prior work and sources (anything that existed before the hackathon, any benchmarks or datasets used)

### 1.3 Also required inside the zip

- **Tasks:** inputs plus expected outputs or grading criteria, covering edge cases and judgment calls, not only easy cases.
- **Scoring logic:** automated grading, a rubric or both, with an explanation of how scores are calculated. If an AI model grades, name it, include its prompt and explain how its reliability was checked.
- **Results:** raw model outputs and scores from your own run.
- **Dependencies:** a requirements file or equivalent, plus `.env.example` listing needed keys without values.

### 1.4 Must not be in the zip

Videos or large datasets (host and link them instead); confidential employer or client data, or private personal information; third-party material you do not have the right to share; API keys, passwords or other credentials.

### 1.5 How it is judged

Submissions are scored out of 100 with a judging rubric, but only after passing the eligibility, completeness, integrity and reproducibility checks. The rubric was not visible in the screenshots. Until you have it, this plan assumes the axes below; replace them with the real categories and weights:

- A real, defensible gap (a genuine limitation, not a trick question)
- Rigor of tasks and grader (edge cases, judgment calls, no false passes or false fails)
- Reproducibility
- Quality of analysis and insight
- Communication (README and video)
- Craft and polish

### 1.6 Rules

Solo participation, one submission, only the latest upload counts. Original work, with prior work and existing benchmarks disclosed. AI coding tools are allowed, but the owner is responsible for quality and correctness. Any cheating, including fabricated results, means disqualification. The micro1 Participant Agreement must be accepted. Re-read the full participant’s guide for anything the screenshots omit (deadline, form fields, licensing terms).

## 2. Operating rules for the coding agent

### 2.1 Hard rules

1. **Never fabricate.** No invented model outputs, scores, costs, citations, expert answers or “expert verified” claims. Any stand-in content carries `status: placeholder`, and the preflight command (Section 15) fails while any placeholder remains.
2. **Never invent domain content.** Expected answers never come from a language model or from memory: in the Section 20 domain pack they come only from the cross-checked checkers, and in any other domain from the owner. The agent may propose structure, edge-case ideas and draft wording, but a task is usable only once the owner has reviewed the evidence for it and set `verified_by` and `status: final`.
3. **No secrets in the repo, logs or frontend bundle.** Keys live in environment variables; `.env` is git-ignored; `.env.example` lists names only. The browser never sees a provider key.
4. **Offline-capable by default.** No CDN scripts, fonts or images. Everything the judges run must work without internet, except live model calls.
5. **Cross-platform.** Assume the owner may be on Windows. Use Python and Node entrypoints rather than bash-only scripts, `pathlib` for paths, no symlinks, LF line endings via `.gitattributes`. A Makefile is a convenience only.
6. **Boring and pinned.** Pin every dependency and record why each non-trivial one exists in `docs/DECISIONS.md`.
7. **Test first for the harness and graders.** Run the full suite at every milestone.
8. **Log AI-tool usage and prior work** in `docs/DISCLOSURES.md` as you go; it feeds README section 8.
9. **Treat model output as untrusted input** everywhere: sanitise it when rendering, never execute it outside the sandbox.

### 2.2 Human gates (the agent stops and asks)

- **G0:** choose the domain and gap hypothesis (Section 4)
- **G1:** approve the task schema and grader design; run the pilot
- **G2:** approve the selection protocol, read and understand the evidence for every chosen task (derivations and cross-check results), and sign the verification record
- **G3:** supply API keys, set a spend cap, authorise the final run
- **G4:** review failure tags and approve every claim in the analysis
- **G5:** record the video
- **G6:** run preflight, inspect the zip, accept the Participant Agreement, submit

## 3. Strategy: how this beats a field of strong entries

Most entries will be a script, ten prompts, a string-matching grader and a README. This one wins on credibility and insight:

1. **A defensible gap with evidence.** A documented pilot-to-final selection process, expert-verification metadata on every task, and an explicit statement of selection bias.
2. **Matched controls.** For each core task, a near-identical control without the edge case, showing that models handle the base skill and fail specifically on the gap. This turns “models fail” into “models fail here, because of this”.
3. **A grader you can trust.** A calibration set with measured false-pass and false-fail rates, plus unit tests of golden, near-miss and paraphrased answers. The brief names false passes and false fails explicitly.
4. **Auditable results.** Every API call is logged with its parameters, the returned model ID, response ID, token usage and a content hash. A manifest of file hashes and a `verify` command make tampering evident, and a “replay mode” lets judges re-score the committed raw outputs offline, for free, with identical results.
5. **Honest statistics.** Several runs per task, pass@1 and consistency (all runs pass), bootstrap confidence intervals over tasks, and no ranking claims where intervals overlap.
6. **A failure taxonomy with numbers.** Defined before analysis, applied to every failure, illustrated with representative raw examples. This is the “why” judges look for.
7. **An exceptional, accessible dashboard.** Any raw output, expected answer and grader verdict is two clicks away. A 3D “Failure Map” tells the story at a glance, with a complete non-3D equivalent.
8. **One-command reproduction and a preflight checker** that fails loudly on anything the brief forbids or requires.

**Effort split:** about 45% eval content and grader, 20% reproducibility, packaging and docs, 20% dashboard and accessibility, 10% video, 5% buffer. If time runs short, cut 3D polish first and never eval rigor.

## 4. Gate G0: choose the domain and the gap

This is a human decision made before any coding. The domain must be one where answers can be verified, either from your own expertise or, as in Section 20, by independent checkers whose agreement you can inspect.

### 4.1 Score each candidate gap from 1 to 5 on

- **Expertise depth:** you can produce and defend the correct answer yourself.
- **Objectivity:** a knowledgeable peer would reach the same answer.
- **Discriminative power:** you have already seen at least one frontier model get a case like this wrong.
- **Fairness (non-trick):** an expert reads the prompt and says “that is a fair question”.
- **Gradability:** the answer can be checked automatically or with a tight rubric.
- **Novelty:** the scenario is original, not lifted from public Q&A that models may have memorised.
- **Impact:** a real person or team pays a real cost when the model errs.

Pick the candidate with the best total, with no score below 3 on fairness or gradability.

### 4.2 Gap patterns that tend to work

- Multi-constraint reasoning where one rule overrides another
- Jurisdiction-, version- or date-specific rules applied to a concrete case
- Multi-step calculation with units, rounding or tolerance conventions
- Procedures where an early small error silently invalidates the rest
- Long or messy inputs where the decisive detail is easy to skip
- Judgment calls where the correct response is to flag missing information, ask a clarifying question or decline
- Code or configuration that must actually run and pass hidden tests (executable grading)
- Calibration: models state wrong answers confidently where an expert would hedge

### 4.3 Anti-patterns to avoid

Trivia; trick wording or tokenisation puzzles; ambiguous prompts with several valid answers; questions needing information not given in the prompt; answers that change with the date unless the date is pinned; anything needing confidential or proprietary data.

### 4.4 Domain Decision Record (`docs/DOMAIN.md`)

One page: domain; your expertise and what you can honestly claim; the gap hypothesis in one sentence; who benefits; three failures you saw by hand; candidate task count; planned grading approach. This page feeds README sections 3 and 4.

### 4.5 Keeping the build domain-agnostic

Nothing in the code hard-codes the domain. Tasks are data files, graders are plugins, and every UI label (title, categories, failure taxonomy, colours) comes from `eval.config.yaml`. Changing the domain means changing data and config, not code.

## 5. Task design specification

### 5.1 Pipeline from idea to frozen task set

1. **Draft 25 to 40 candidates** from your own domain notes.
2. **Pilot** all of them on at least three frontier models from different providers, three runs each.
3. **Expert review:** read every failure by hand and confirm it is a genuine model error, not an ambiguous prompt, a wrong key or a grader bug. Fix or drop the task otherwise.
4. **Select the final 8 to 10 core tasks** (the brief recommends 5 to 10; quality beats quantity). Cover every category and a spread of difficulty, with edge cases and judgment calls well represented.
5. **Freeze:** tag the commit and hash the task files. If any task changes after the final run, re-run it.
6. **Disclose the selection.** Selecting tasks that models fail biases headline pass rates downward, so the README must state how many candidates were piloted, the pilot pass rates and the selection criteria. The final score measures a hard, expert-curated set, not general capability.

### 5.2 Task file schema (one YAML file per task, validated by JSON Schema)

```
id: T07
version: 1
status: final              # placeholder | draft | final (preflight blocks the first two)
category: <from eval.config.yaml>
difficulty: 4              # 1-5, set by the expert, never by model results
type: core                 # core | control
control_of: null           # id of the matching core task when type is control
prompt: |
  <the full, self-contained text sent to every model>
context_files: []          # small attachments, relative paths
output_format: json        # free_text | json | code
edge_cases: [overlapping-rules, missing-info]
judgment_call: false       # true if the right move is to flag, ask or decline
expected:
  answer: <canonical answer plus accepted equivalents>
  rationale: |
    <expert reasoning, step by step>
grading:
  method: rubric           # exact | numeric | structured | executable | rubric | llm_judge
  pass_threshold: 0.8
  criteria:
    - id: c1
      text: Identifies rule X as controlling
      weight: 3
      critical: true       # must be met to pass regardless of total
      check: deterministic # deterministic | llm
      spec: <regex, numeric tolerance, JSON path or judge instruction>
provenance:
  author: owner
  sources: [<public references, cited not copied>]
  verified_by: [owner]     # add a second expert if you can
  verified_on: <date>
  novelty_check: <how you confirmed the scenario is original>
expected_failure_mode: <taxonomy id, a hypothesis validated afterwards>
```

A validator (`validate-tasks`) rejects missing fields, duplicate IDs, criteria weights that do not sum, controls without a core twin, and any task lacking `verified_by`.

### 5.3 Matched controls

For each core task, write a control that keeps the scenario, vocabulary and answer format but removes the edge case or twist. Controls are reported separately and excluded from the headline score. If models pass the control and fail the core task, the gap is isolated. If they fail both, the task may be unfair or the gap broader than claimed, and you must say so. Controls are lightweight; if time is short, do them for the five strongest tasks.

### 5.4 Prompting protocol

- One prompt template and one system prompt for every model, stored under `eval``kit``/prompts/` and versioned. No per-model tuning.
- Ask for reasoning in free text followed by a clearly delimited final answer (for example a fenced JSON block) so graders are robust without constraining how the model thinks.
- Record all settings: temperature or reasoning-effort setting, max tokens, runs per task, any tools enabled (default none).
- Where a provider’s flagship model has a native reasoning mode, run it at one documented setting; optionally add a second setting as an extra column, never as a replacement.
- Do not look at a model’s results and then rewrite the prompt for that model.

## 6. Grading design

### 6.1 Grader hierarchy (use the highest rung that fits)

1. **Executable:** run model-produced code or configuration against hidden tests in a sandbox.
2. **Exact, numeric (with tolerance and units) and structured (JSON schema plus field-wise comparison).**
3. **Rubric with deterministic checks:** weighted binary criteria, each independently checkable.
4. **Rubric with an LLM judge,** only for criteria that cannot be checked deterministically.

Avoid bare regex or `contains` matching on free text; it creates false passes and false fails.

### 6.2 Scoring formula (document it verbatim in `docs/SCORING.md`)

- Task score = sum of weights of satisfied criteria divided by the sum of all weights, in the range 0 to 1.
- A run **passes** when score is at least `pass_threshold` and every `critical` criterion is met.
- **pass@1** per model = mean pass rate over core tasks and runs. **Consistency** = share of tasks where all k runs pass. **Mean rubric score** is reported as a secondary measure.
- Confidence intervals come from a bootstrap over tasks (runs on the same task are not independent). With 8 to 10 tasks the intervals will be wide; say so and avoid ranking models whose intervals overlap.
- Report per-category and per-difficulty breakdowns, and control versus core side by side.

### 6.3 LLM-judge protocol (only if used)

- Name and pin the exact judge model; store the full prompt in the repo.
- Temperature 0 (or the lowest setting the API allows); structured JSON verdict per criterion with a short evidence quote from the response.
- The judge never sees which model produced the answer. It receives the task, the expected answer and the single criterion being checked.
- Run each judgement twice and flag disagreements for manual review.
- Prefer a judge from a different provider than the models being ranked, and report a check for self-preference.
- **Calibration set:** at least 40 responses, labelled by the owner, mixing clearly correct, subtly wrong, correct-but-paraphrased and verbose-but-wrong answers. Report accuracy, **false-pass rate, false-fail rate** and Cohen’s kappa. Suggested bar before the final run: false-pass rate at most 2%, kappa at least 0.8. If the bar is missed, revise the rubric or the grader and re-measure.

### 6.4 Grader unit tests

For every task, test the grader against a golden answer, a near-miss that must fail, a correct paraphrase, a format variant (extra prose, different casing, units), an empty answer, a refusal and a truncated answer. These tests run in CI with no network.

### 6.5 Sandbox rule for executable grading

Never run model-generated code on the host unsandboxed. Use a subprocess with a timeout, memory and CPU limits, no network and a throwaway working directory, or a container where available. Document the isolation in `docs/SCORING.md`.

## 7. Architecture and stack decisions

Three layers; each one is fully usable without the one above it.

1. **`evalkit`**** (Python package):** task loading, providers, runner, graders, statistics, manifest, verify, replay, preflight, packaging. CLI only, no web dependencies.
2. **Backend (Quart):** a read-mostly JSON API over the results, plus optional live-run endpoints. Imports `evalkit`. Also serves the prebuilt frontend, so the whole dashboard is one process.
3. **Frontend (React + Vite + three.js):** the dashboard.

**Source of truth:** task YAML files, raw attempt JSON, grade files and the manifest. **SQLite is a derived index** rebuilt idempotently from those files. This keeps the evidence plain, diffable and auditable, and lets the dashboard be fast.

### 7.1 Stack

- **Python 3.11 or newer** (pin in `.python-version`). Quart served by Hypercorn; `quart-schema` with pydantic v2 for validation and an OpenAPI document; `httpx` or the official provider SDKs behind a single `Provider` interface; `tenacity` for retries; `PyYAML` and `jsonschema`; `numpy` for the bootstrap; `aiosqlite`. Dev: `pytest`, `pytest-asyncio`, `pytest-cov`, `respx` (HTTP mocking), `ruff`, `mypy`.
- **Node LTS** (pin in `.nvmrc`). React, TypeScript, Vite, `react-router`, TanStack Query, `three` with `@react-three/fiber` and `@react-three/drei` (import only what is used), `d3-scale` and `d3-shape` (or `visx`) for SVG charts, `react-markdown` with `rehype-sanitize`, and an accessible primitives library (React Aria Components or Radix) for tabs, dialogs, tooltips and menus. Dev: Vitest, React Testing Library, `jest-axe`, Playwright with `@axe-core/playwright`, `eslint-plugin-jsx-a11y`, Lighthouse CI.
- **Database: SQLite** in WAL mode. Reasons: zero setup (judges need nothing installed), a single file, fully reproducible, more than fast enough for tens of thousands of rows. Postgres adds a service to install and would put the reproducibility gate at risk for no benefit. Record this in `docs/DECISIONS.md`.

## 8. Repository layout

```
/
├── README.md                  # the eight required sections, exact headings
├── LICENSE
├── .env.example               # key NAMES only, no values
├── .gitignore  .gitattributes  .editorconfig  .python-version  .nvmrc
├── requirements.txt           # pinned runtime deps (harness + backend)
├── requirements-dev.txt       # pytest, ruff, mypy, respx, ...
├── pyproject.toml             # tool config only (ruff, pytest, mypy)
├── Makefile                   # convenience wrapper, never the only way
├── eval.config.yaml           # domain title, categories, failure taxonomy, theme
├── models.yaml                # exact model IDs, settings, dated price table
├── tasks/                     # T01.yaml ... T10.yaml, C01.yaml ... (controls)
├── schema/                    # task.schema.json, attempt.schema.json
├── evalkit/
│   ├── cli.py  config.py  tasks.py  runner.py  scoring.py  stats.py
│   ├── providers/             # base.py, one file per provider, mock.py
│   ├── graders/               # exact, numeric, structured, executable, rubric, llm_judge
│   ├── manifest.py  verify.py  replay.py  estimate.py  preflight.py  package.py
│   └── prompts/               # system.txt, task_template.txt, judge_*.txt
├── calibration/               # labelled_responses.jsonl for grader reliability
├── results/
│   ├── runs/<run_id>/         # run.json, raw/<model>/<task>__<rep>.json, grades.jsonl, scores.json
│   ├── failure_tags.jsonl
│   ├── summary.json
│   └── MANIFEST.json         # SHA-256 of every file above
├── backend/
│   ├── app.py  config.py  serve.py
│   ├── api/                   # meta, tasks, results, failures, grader, live
│   ├── db/                    # schema.sql, ingest.py, repo.py
│   └── services/              # live_runs.py
├── frontend/
│   ├── package.json  vite.config.ts  tsconfig.json  index.html
│   ├── src/                   # app/, routes/, components/, three/, hooks/, api/, styles/, a11y/
│   ├── e2e/                   # Playwright specs
│   └── dist/                  # PREBUILT and included in the zip (no Node needed to view)
├── tests/                     # harness tests: unit/, integration/, graders/
├── docs/                      # METHODOLOGY, SCORING, DOMAIN, ARCHITECTURE, ACCESSIBILITY,
│                              # DECISIONS, DISCLOSURES, TASK_AUTHORING, VIDEO_SCRIPT
├── scripts/                   # small cross-platform Python helpers
└── .github/workflows/ci.yml
```

Exclude from the zip: `node_modules`, virtual environments, `.env`, the derived SQLite file, caches, coverage output, videos, and anything over a few MB. The `package` command (Section 15) enforces this with an allow-list.

## 9. The harness (`evalkit`)

### 9.1 CLI contract

Every command works without the web stack. Invoke as `python -m evalkit <command>`.

```
validate-tasks     schema + semantic checks on tasks/ (fails on placeholders)
estimate           expected API calls, tokens, cost and runtime for a run
run                call models, write raw attempts, grade, score (needs keys)
grade              (re)grade existing raw attempts
replay             re-score committed raw outputs offline, no keys
calibrate-grader   measure grader reliability against calibration/ labels
tag-failures       interactive helper to confirm failure tags
report             write summary.json and the Markdown tables for the README
verify             check manifest hashes, recompute scores, diff against stored
reproduce          verify + replay + report in one command, no keys needed
ingest             rebuild the SQLite index from files
preflight          check the submission against the brief (Section 15)
package            build the allow-listed, size-checked submission zip
```

### 9.2 Provider adapters

- One interface: an async `complete(request)` returning text, the model ID the API actually returned, finish reason, token usage, latency, provider response ID and the redacted request parameters.
- At least three real providers from different vendors, plus a `mock` provider that returns scripted outputs so the whole pipeline runs in CI without keys.
- Model IDs, settings and prices live in `models.yaml`. Look up current model IDs from each provider’s documentation on the day of the final run and record that date. Never trust an alias without recording what it resolved to.
- Concurrency via a semaphore, per-provider rate limits, timeouts, exponential backoff **only on transport errors, 429 and 5xx**. Never retry because an answer was wrong.
- Refusals, empty outputs and truncations are recorded as attempts, not discarded; they are data.
- Resumable: each attempt has an idempotent key (run, task, model, repetition), so an interrupted run continues without duplicating or overwriting.
- A spend cap (`MAX_SPEND_USD`) aborts the run when estimated plus actual cost would exceed it.

### 9.3 Raw attempt record

One JSON file per attempt, written before grading and never edited afterwards:

```
attempt_key: <run_id>/<model>/<task>/<rep>
task_id: T07
task_hash: <sha256 of task file>
prompt_sent: <exact text, including system prompt>
model_requested: <id from models.yaml>
model_returned: <id reported by the API>
settings: {temperature: 0, max_tokens: 4096, reasoning: <documented setting>}
response_text: <full text>
finish_reason: stop
usage: {input_tokens: 0, output_tokens: 0}
latency_ms: 0
provider_response_id: <id>
created_at: <UTC timestamp>
content_sha256: <hash of this record>
```

### 9.4 Reproducibility mechanics

- `run_id` combines the UTC timestamp with a short hash of task files, prompts and config.
- `MANIFEST.json` stores SHA-256 hashes of tasks, prompts, config, raw attempts, grades and scores.
- **`replay`** re-grades from the committed raw outputs offline. Deterministic graders must reproduce scores exactly. LLM-judge verdicts are cached in `grades.jsonl` and reused by default; a flag forces live re-judging.
- **`verify`** checks every hash, recomputes all scores and statistics from raw data, diffs them against the stored files and exits non-zero on any mismatch.
- **`reproduce`** = `verify` + `replay` + `report`. This is the one command a judge runs, and it needs no API keys.
- Be honest about live re-runs: provider APIs are not bit-deterministic even at temperature 0, so a fresh `run` yields “the same kind of results”, not identical text. Quantify this with your own run-to-run variance across the k repetitions and say so in the README.
- Bootstrap resampling uses a fixed, recorded seed.
- `estimate` multiplies tasks, models and runs by token estimates and the dated price table. Put both the estimate and the actual cost in README section 5.

### 9.5 Failure tagging

- Define the taxonomy in `eval.config.yaml` **before** looking at failures (for example: wrong rule applied, calculation error, missed constraint, hallucinated source, overconfident instead of abstaining, format violation, incomplete answer, refusal, other).
- Auto-suggest tags from failed criteria; the owner confirms every tag, stored with `source: human` in `failure_tags.jsonl`.
- Re-tag a random 20% sample a day later and report agreement with yourself.
- Pick three to five representative failures for the video and the README, quoted from raw output, each linked to its attempt ID.

## 10. Database (SQLite, derived)

- `aiosqlite`, WAL mode, foreign keys on, `schema.sql` versioned through `PRAGMA user_version`.
- `ingest` is idempotent. The backend runs it on start-up if the database is missing or its stored manifest hash differs from the files. Rebuilding takes about a second at this scale.
- Official results always come from files; live demo runs go to a separate directory and tables (Section 11).

```
tasks(id PK, version, type, control_of, category, difficulty, status, prompt,
      expected_json, grading_json, edge_cases_json, judgment_call,
      provenance_json, content_hash)
models(id PK, provider, model_requested, model_returned, display_name, settings_json)
runs(id PK, started_at, finished_at, config_hash, manifest_hash, notes)
attempts(id PK, run_id FK, task_id FK, model_id FK, rep, response_text,
         finish_reason, tokens_in, tokens_out, latency_ms, cost_usd,
         provider_response_id, raw_path, content_hash, created_at,
         UNIQUE(run_id, task_id, model_id, rep))
grades(attempt_id PK FK, score, passed, criteria_json, grader_method,
       judge_model, judge_rationale, graded_at)
failure_tags(attempt_id FK, tag, source, note, PRIMARY KEY(attempt_id, tag))
calibration_items(id PK, task_id, response_text, human_label, grader_label, note)
summaries(run_id, scope, scope_key, metric, value, ci_low, ci_high, n)
-- indexes: attempts(run_id, task_id), attempts(model_id), failure_tags(tag)
```

## 11. Backend (Quart)

### 11.1 Application rules

- App factory `create_app(settings)`; typed settings loaded from environment variables. `LIVE_RUNS_ENABLED` defaults to false.
- Open the database in `before_serving` and close it in `after_serving`. Handlers are async; no blocking calls on the event loop (run CPU-heavy work such as bootstrap in an executor, and cache its result).
- Validation and OpenAPI through `quart-schema`. Expose the OpenAPI JSON. Its bundled documentation pages may load assets from a CDN: disable them or self-host, to honour the offline rule.
- Security: strict `Content-Security-Policy` (default `self`, no inline scripts), `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`; CORS closed by default (the Vite dev server proxies `/api`); request size limits; rate limiting (`quart-rate-limiter`) on any POST; errors returned as `application/problem+json` (RFC 9457) with no stack traces.
- Static files: serve `frontend/dist` with an SPA fallback, long-lived caching for hashed assets, no-cache for `index.html`. ETags derived from the manifest hash for API responses.
- Structured JSON logging with request IDs. Never log keys or full prompts at info level.

### 11.2 Endpoints

```
GET  /api/health
GET  /api/meta                       title, domain, categories, taxonomy, run date, manifest hash
GET  /api/tasks?category=&type=&difficulty=
GET  /api/tasks/{id}                 prompt, expected answer, rubric, provenance
GET  /api/models
GET  /api/runs        GET /api/runs/{id}
GET  /api/results/summary            headline metrics with confidence intervals
GET  /api/results/matrix             task x model grid: score, pass rate, consistency
GET  /api/results/attempts?task=&model=&passed=&tag=&page=
GET  /api/attempts/{id}              raw output, per-criterion verdicts, rationale, tags
GET  /api/failures/breakdown?by=tag|model|category
GET  /api/grader/reliability         calibration metrics and confusion matrix
GET  /api/integrity                  live manifest verification status
POST /api/live/runs                  disabled unless enabled and keys present
GET  /api/live/runs/{id}/events      Server-Sent Events progress stream
```

### 11.3 Live runs (optional, clearly separated)

- Started as a background task with a single-run lock, a per-run spend cap and rate limiting; results written to `results/live/`, never mixed with the submitted results.
- The UI labels them “Live demo: not part of the submitted results” everywhere they appear. This protects the integrity check.
- The SSE endpoint is an async generator returning `text/event-stream` with `Cache-Control: no-cache`, a periodic heartbeat comment, and clean handling of client disconnects (cancellation).
- Keys are read only from the server environment. The UI never asks for or stores a key.

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
- [ ] Participant Agreement accepted; submission confirmation saved

## 19. Inputs the owner must provide before coding starts

1. **Domain and gap hypothesis** (Section 4), and your honest expertise summary.
2. **The judging rubric and the full participant’s guide**, so Section 1.5 can be replaced with real weights.
3. **The deadline and your daily time budget**, so the phases can be turned into dates.
4. **Your operating system and hardware**, to confirm the cross-platform choices.
5. **Which model providers you have API access to and a spend cap** (at least three providers are recommended).
6. **Whether you have a second expert** who can review the definitions and a sample of the evidence (optional, strongly advised for the computer-science pack).

## 20. Domain pack: verifying transaction histories (computer science)

This pack turns the chosen theme into a complete, buildable eval, and it assumes the owner cannot check answers by hand. Correctness therefore comes from machine-checked evidence, not from anyone’s personal derivation. Where this section conflicts with a generic statement elsewhere in the plan, this section wins. Every statement about how models behave is a hypothesis that the pilot (20.17) must confirm or reject.

### 20.1 The idea in one paragraph

A task shows a short log of database transactions (what each one read and wrote, and when it started and committed), the exact definition of a consistency rule, and a question: does this log obey the rule? The model must answer and attach a proof that a program can check. The ground truth comes from checkers that we build and cross-validate, so grading is exact and no opinion is involved.

**Hypotheses to test (claim none of them before the evidence exists):**

- **H1:** accuracy falls as histories grow (more transactions, keys, overlap), even when the definitions are in the prompt.
- **H2:** models often reach the right verdict with a wrong or invented proof (right for the wrong reason).
- **H3:** the two error types differ: missing a violation hidden among innocent transactions (false accept) versus flagging a valid history that merely looks suspicious (false alarm).
- **H4:** models mishandle uncertainty: they commit to an answer when the log is genuinely ambiguous, or hedge when it is not.
- **H5:** textbook examples are passed but novel randomised instances are not, which separates memorisation from execution.

### 20.2 How correctness is guaranteed when nobody checks by hand

The principle is **proof-carrying ground truth**.

1. **No expected answer is typed by a person or written by a language model.** Every answer is computed by code and ships with a machine-checkable certificate and a plain-English derivation.
2. **The code is checked three ways.** At least two separately implemented checkers must agree on every item; they must reproduce the published textbook cases in 20.11; and they must pass the metamorphic tests in 20.6.
3. **The owner’s job is oversight, not derivation:** choose, read, understand, challenge, decide and sign. Following a machine-written derivation line by line is a realistic task for a computer scientist who has done the learning path in 20.7. Deriving every answer from scratch is not required.
4. **The submission says exactly this.** README section 3 states that ground truth is machine-verified and that the owner reviewed the derivations. It must never claim that answers were written or verified by hand, because an inflated claim is an integrity risk.

**Evidence levels**, recorded per task in `results/verification_record.jsonl`:

- **VL0:** a checker’s output alone. Never acceptable for a final task.
- **VL1:** all three checkers agree on the item, every vector in 20.11 passes, and the metamorphic suite is green.
- **VL2:** VL1 plus a generated derivation that the owner has read, with a dated sign-off and any question raised.
- **VL3:** VL2 plus confirmation from outside our own code: an independent published checker run on that item, or an independent human reviewer.

**Requirements:** every core task at VL2 or higher; VL3 where possible (optional in the six-day edition, see 0.1); every extended-study instance at VL1, recorded in bulk.

**Residual risk, stated plainly.** All three checkers implement the same written definitions (20.4). If a definition were wrong, all three could agree and still be wrong. The defences are the literature vectors, the external cross-check, and an independent reviewer who reads `docs/MODELS.md` (about 30 minutes). Say in the README that this risk exists and what was done about it.

### 20.3 Scope and modules

- **M1, snapshot isolation:** judged from database-assigned timestamps (D1). Deterministic rule application; it tests careful state tracking.
- **M2, serializability:** judged from a commit-ordered history through the dependency graph, including aborted and intermediate reads (D2).
- **M3, in-doubt transactions:** the judgment-call module (D3). The right answer can be “undetermined”, with proof.
- **M4, linearizability (optional):** attempted only after M1 to M3 are finished and frozen (D4).
- **Out of scope:** predicate reads and phantoms (a possible later difficulty knob), multi-statement SQL semantics, full distributed-protocol traces, performance questions.
- **Fairness rule:** every prompt states the rule it applies, verbatim from `docs/MODELS.md`. The eval tests applying a definition to a concrete log, not recalling vendor folklore. Bare product-specific names (for example “repeatable read”, which means different things in different databases) are never used.
- **Optional ablation:** run standard instances with only the textbook name of the rule (“serializable”, “snapshot isolation”) and no definition. If models pass with definitions but fail without, the gap is knowledge; if they fail with definitions, the gap is reasoning.

### 20.4 Formal definitions (copy verbatim into `docs/MODELS.md`)

**Basics.** A store has keys, each with an initial value. Every value written to a key in a history differs from every other value of that key, the initial one included, so a read value identifies exactly one writer (or the initial state). A transaction has an id, a list of operations in program order (`r(k)=v` or `w(k)=v`) and an outcome: committed (with a commit timestamp), aborted, or prepared (in doubt, see D3). Timed histories also give each transaction a start timestamp earlier than its end timestamp. All timestamps in one history are distinct integers, so there are no ties. The **version installed** on key k by a committed transaction is the value of its last write to k; its earlier writes to k are **intermediate**. The **version order** of a key is the initial version followed by the installed versions in order of their writers’ commit timestamps. A read **reads from** the transaction that wrote the value it returned.

**D1. Snapshot isolation (timed histories).** A history is valid iff every committed transaction T satisfies all three rules:

- **(a) Own writes:** a read of k that follows a write of k by T returns T’s most recent earlier write to k.
- **(b) Snapshot reads:** any other read of k returns the version of k installed by the committed transaction that writes k and has the greatest commit timestamp below T’s start timestamp, or the initial value if there is none.
- **(c) First committer wins:** no two committed transactions that write a common key are concurrent, where T1 and T2 are concurrent iff start(T1) < commit(T2) and start(T2) < commit(T1).

Aborted transactions are not checked, and their writes are never visible, so a committed read of such a value breaks rule (b). Naming a failed read: value written by an aborted transaction gives aborted-read; value written by a committed transaction but not as its last write to that key gives intermediate-read; anything else gives snapshot-read.

**D2. Serializability (commit-ordered histories).** The dependency graph has one node per committed transaction and, for committed Ti different from Tj, these edges:

- **ww:** Ti installs a version of k and Tj installs the next version of k.
- **wr:** Tj reads the version of k installed by Ti (not through its own write).
- **rw:** Ti reads a version of k (the initial one included) and Tj installs the next version of k after it.

A history is serializable iff all of these hold: no committed transaction reads a value written by an aborted one (anomaly G1a); no committed transaction reads an intermediate version (G1b); rule (a) of D1 holds; and the graph has no directed cycle. A cycle is named by its edge types: only ww and wr edges gives G1c; exactly one rw edge gives G-single; two or more rw edges give G2-item. Because the version order is the commit order, a cycle made only of ww edges cannot occur.

Equivalent view, used by two of the checkers: some serial order of the committed transactions reproduces every observed read and agrees with the version order. The serial order need not equal the commit order, and real-time order is not required. Requiring it would be strict serializability, a different rule that must never be mixed in.

**D3. In-doubt transactions.** A prepared transaction either committed at its stated timestamp or aborted. A **completion** fixes every in-doubt transaction as committed or aborted. A history with k in-doubt transactions is valid if all 2^k completions are valid, invalid if all are invalid, and **undetermined** otherwise. Core tasks use at most two in-doubt transactions; the extended study at most three.

**D4 (optional module). Linearizability of one register.** Operations have invocation and response times (distinct integers), every write has a unique value, and the initial value is 0. A history is linearizable iff all operations can be placed in one total order that respects real time (if a responds before b is invoked, a comes first) and is legal for a register (each read returns the latest earlier write, or the initial value). A certificate of violation is a set of operations that is closed under reads-from (each read in it comes with its writer, or the initial state) and is itself not linearizable, checked exhaustively; such a set proves the whole history is not linearizable.

**Source fidelity.** D1 to D3 follow the standard formulations in Berenson et al. (1995) and Adya (1999) (see 20.16). A reviewer should compare them with those sources and record any difference in `docs/DECISIONS.md` before the definitions are frozen.

### 20.5 Notation, answer format and prompt template

One history notation serves the parser, the printer, the generator and the prompts. The printer is the only way prompts are produced, and the parser is strict, round-trips with the printer, and has golden-file tests. Each line is one transaction. These blocks only illustrate syntax and are not tasks.

```
Timed history (modules M1 and M3)
Keys: x, y. Initial: x=0, y=0. Every written value is unique per key.
T1  start=1  commit=6   r(x)=0  w(y)=1
T2  start=2  abort=4    w(x)=7
T3  start=3  prepared commit_ts=9   w(y)=2

Commit-ordered history (module M2): no start times, listed in commit order
Keys: x, y. Initial: x=0, y=0. Every written value is unique per key.
T2  commit=5   r(y)=0  w(x)=1
T1  commit=6   r(x)=0  w(y)=1
T3  abort      w(x)=7
```

Operations are addressed as `T1.op1` (the first operation of T1, counting every read and write, starting at 1). Verdict vocabulary: `valid`, `invalid`, `undetermined`.

Models reason freely and then end with one fenced JSON block. The shapes are shown here as YAML for readability.

```
# M1 (timed history)
verdict: valid | invalid
reads_from: {T1.op1: init, T2.op1: T3}   # required when valid: every read not preceded by an own write
violation:                                # required when invalid: exactly one instance
  rule: first-committer-wins
  txns: [T2, T5]
# or
violation:
  rule: snapshot-read                     # also: own-write
  txn: T4
  op: 2
  expected_source: T3                     # the writer the read should have observed, or init
  name: aborted-read                      # optional: aborted-read | intermediate-read | snapshot-read

# M2 (commit-ordered history)
verdict: valid | invalid
serial_order: [T2, T1, T3]                # required when valid
cycle:                                    # required when invalid, unless a G1a or G1b instance is given
  - {from: T1, to: T2, edge: rw, key: x}
  - {from: T2, to: T1, edge: rw, key: y}
anomaly: G2-item                          # optional, low weight
# or
violation: {rule: aborted-read, reader: T2, writer: T1, key: x}   # also: intermediate-read

# M3 (in-doubt transactions): one entry per assignment, 2^k entries
verdict: valid | invalid | undetermined   # must follow from the entries
completions:
  - {committed: [T4], aborted: [], verdict: valid, certificate: <an M1 or M2 answer body>}
  - {committed: [], aborted: [T4], verdict: invalid, certificate: <an M1 or M2 answer body>}

# M4 (optional)
verdict: valid | invalid
order: [w1, r2, r3]                       # when valid
subhistory: [w1, r2, r3]                  # when invalid: reads-from-closed, not linearizable
```

Prompt template (`evalkit/prompts/task_template.txt`), identical for every model:

```
SYSTEM
You are an expert in database transactions. Apply the definitions in the task exactly.
Use no outside facts about specific database products. You have no tools.

USER
Task: decide whether the history below satisfies the stated rule, and prove your answer.

Definitions:
<verbatim text of the relevant rules from docs/MODELS.md>

History:
<history from the printer>

Question: <the module question>

Answer format: reason step by step, then finish with exactly one fenced JSON block
that follows this schema: <the schema for the module>.
Write nothing after the JSON block.
```

Settings: the same for every model and recorded in `models.yaml`; a token budget large enough for long reasoning (truncations are recorded and reported, never silently dropped); no tools; one documented reasoning-effort setting per model.

### 20.6 Building the evidence ladder

**Three independent checkers** live in `evalkit/domain/oracle/`. Each is built from `docs/MODELS.md` alone and is forbidden to import another. Use separate agent sessions, or at least separate prompts and files, for each: the software equivalent of N-version programming. One shared parser feeds all three; it has its own golden-file and round-trip tests, because a parser defect would corrupt every checker.

- **O1, reference simulator (slow and obviously right).** For snapshot isolation, replay the events in timestamp order against a multi-version store, taking a snapshot at every start. For serializability, try serial orders of the committed transactions (at most nine, pruned by the version order) and replay each one against a single-version store. For in-doubt transactions, enumerate the completions.
- **O2, rule and graph checker (the production one).** Applies D1 directly; builds the D2 dependency graph, finds a cycle and classifies it; produces certificates and derivations.
- **O3, constraint-solver encoding.** Expresses each rule as constraints for the Z3 solver (`z3-solver`, a development-only dependency): transaction positions in a serial order with read, version-order and write-conflict constraints for D2, and timestamp comparisons for D1. Its results are committed, so judges never need Z3.

**Differential testing.** Generate at least 100,000 random histories (sizes 2 to 7, all modules, balanced valid and invalid) plus every single-edit neighbour of every vector in 20.11 (change one read value, one timestamp or one outcome). All three checkers must agree on every one. A disagreement is a defect in code or definition: investigate it, fix it and log it in `docs/DECISIONS.md`.

**Metamorphic tests** (verdict and certificate shape must not change): rename transactions, keys or values consistently; add a constant to all timestamps, or stretch them in an order-preserving way; reorder lines where order is not meaningful; delete an aborted transaction that nobody read from; add a transaction that touches only a new key. **Controlled-change test:** restoring the one offending read to its expected value must turn an invalid history valid. This also validates how controls are built.

**External check (VL3).** Export histories to the input format of an independent published checker (for example Elle from the Jepsen project, which needs a Java runtime) and run a sample of at least 200 on the owner’s machine or a CI runner. Record the agreement rate and explain every difference in `docs/METHODOLOGY.md`; such tools may define models slightly differently, so differences must be explained, never hidden. The tool is not shipped.

**Independent human review (VL3).** Give a reviewer `docs/MODELS.md` and ten derivations. They need not re-derive anything: they confirm that the definitions match the literature and that each derivation follows from them. Record the reviewer (or “anonymous reviewer”), with their consent, and the date.

**Freeze and provenance.** Record a hash of all oracle code in the manifest. Any change after the freeze invalidates the evidence for every task and requires re-running the ladder. A CI job re-runs the ladder on every change under `evalkit/domain/`.

**Derivation generator.** Deterministic and template-based, with no model calls. For every task it writes numbered plain-English steps, each citing facts from the history, and ends with the certificate. It is stored with the task as a derived field (regenerated and hash-checked), and the dashboard renders it (20.12). Example, vector V1 under serializability:

```
1. Version order. x: initial (0), then T2’s value 1 (commit 5). y: initial (0), then T1’s value 1 (commit 6).
2. T1 read x=0, the initial version. The next version of x is written by T2, so T1 must come before T2.
   Edge: T1 -> T2, type rw, key x.
3. T2 read y=0, the initial version. The next version of y is written by T1, so T2 must come before T1.
   Edge: T2 -> T1, type rw, key y.
4. T1 before T2 and T2 before T1 cannot both hold. The graph has the cycle T1 -> T2 -> T1 with two rw edges (class G2-item).
5. Conclusion: not serializable. Certificate: cycle [T1 -rw(x)-> T2, T2 -rw(y)-> T1].
```

### 20.7 The owner’s role and learning path

The owner is accountable for the submission and must understand it, even though they do not derive answers.

**What the owner does**

- Makes the decisions at the human gates (Section 2.2).
- Reads the derivation for every core task and signs the verification record (VL2).
- Audits a sample of graded model outputs (20.8).
- Arranges, if possible, an independent reviewer for the definitions (20.6).
- Learns the material well enough to present it, records the video, and approves the honest README claims.

**Learning path** (about 6 to 8 hours spread over a few days; run it in parallel with Phase 1):

1. Martin Kleppmann, *Designing Data-Intensive Applications*, chapter 7 on transactions: the sections on snapshot isolation, write skew and serializability (about 2 hours).
2. The Jepsen consistency-models map at jepsen.io/consistency: the pages for read committed, snapshot isolation, serializable and strict serializable (about 1 hour).
3. The dashboard’s Learn route (20.12): step through vectors V1 to V10 in predict-then-reveal mode (about 2 hours).
4. Skim Berenson et al. (snapshot isolation and write skew) and Adya’s definitions of G0 to G2 (1 to 2 hours; the names and examples matter more than the proofs).
5. Teach-back (next).

**Teach-back checkpoint.** Before recording the video, the owner should be able to answer all of these without notes:

1. What does snapshot isolation guarantee a transaction about the data it reads?
2. Why do V1 (write skew) and V2 (lost update) differ under snapshot isolation?
3. What are ww, wr and rw edges, and how do you read an rw edge?
4. Why does a cycle in the graph mean “not serializable”?
5. Why is V4 (a stale-looking read) still serializable?
6. What is the difference between serializable and strict serializable?
7. What is an in-doubt transaction, and why can the honest answer be “undetermined”?
8. Why must a correct verdict come with a certificate?
9. How do we know the answer key is right (the checkers, the vectors, any cross-checks), and what could still be wrong?
10. What does this eval not show?

**Fallback.** If, after the learning path, the owner still cannot follow a derivation, narrow the scope: drop M3 and M4, keep M1 and M2, and use fewer and smaller histories. An eval the owner understands and can defend beats a wider one they cannot.

### 20.8 Grading specification (fully deterministic, no AI judge)

**Parsing.** Take the last fenced JSON block in the response and validate it against the module’s schema. One lenient fallback: if there is no fenced block, accept the last top-level JSON object in the text. A response that still fails to parse scores as failed but is tagged `format-error` and counted separately, so formatting problems cannot hide inside reasoning failures. This rule is fixed before any run.

**Criteria** (weights fixed per module and documented in `docs/SCORING.md`):

- **c1, verdict (critical, weight 3):** equals the oracle’s verdict.
- **c2, certificate (critical, weight 4):** verifies against the history. A model’s certificate is accepted whenever it is valid, even if it differs from the oracle’s own.
- **c3, naming (weight 1):** the anomaly or rule name matches through an alias table (for example write skew = G2-item), and is consistent with the model’s own certificate.
- **c4, completeness for M3 (critical, weight 3):** the completions cover all 2^k assignments exactly once, each with the correct verdict and a verifying certificate, and the top-level verdict follows from them.
- **Pass** means every critical criterion is met. The task score is the weighted fraction of met criteria. A correct verdict with an invalid certificate is a fail, tagged `right-verdict-bad-proof`.

**Certificate verifiers**

- **M1, valid:** the claimed `reads_from` must equal the checker’s map for every read not preceded by the transaction’s own write, with no read omitted and none invented.
- **M1, invalid:** `first-committer-wins` requires two committed transactions that write the named key and are concurrent. `snapshot-read` requires that the named operation is a read not preceded by an own write, that the claimed expected source is the true one under D1(b), and that the observed value differs from that source’s value. `own-write` requires a read after an own write that returns something else.
- **M2, valid:** `serial_order` lists every committed transaction exactly once, and every edge of the graph points forward in it.
- **M2, invalid:** each claimed edge exists with the stated type and key, consecutive edges chain, and the last edge returns to the first node; or the named G1a or G1b instance exists.
- **M3:** each completion’s certificate is verified as M1 or M2 on the history with that assignment applied.
- **M4:** the order or the reads-from-closed subset is verified by exhaustive search.

**Mutation suite (grader reliability).** For every task, derive answers from the correct certificate and assert the grader’s verdict on each. Harmful mutations must fail: flip the verdict; change an edge type, key or endpoint; drop an edge so the cycle no longer closes; reorder the serial order so an edge points backward; change one `reads_from` entry; name the wrong transaction; truncate the JSON. Harmless variants must pass: reorder independent entries, rotate the cycle’s starting point, use a different valid cycle, add whitespace, change key order. Report the false-pass and false-fail rates (target zero) on the `/grader` page.

**Audit sample.** After the final run, the owner reviews 30 graded model outputs, drawn with a fixed seed and stratified across models, modules and pass or fail. The attempt viewer shows the model’s certificate beside the oracle’s derivation. For each item the owner records agree or disagree with the grader. Any disagreement is investigated and fixed before release, and the agreement rate is reported.

### 20.9 Instance generator, selection protocol and held-out evaluation

**Generator** (`python -m evalkit generate --module m1 --size 8 --seed 42 --n 20`): deterministic from the seed and independent of any external data.

1. **Valid histories by simulation.** Run a small multi-version database simulator (M1) or a serial-execution simulator that interleaves reads and installs versions (M2) with random transactions, and record what happened. These are correct by construction and are still confirmed by the checkers.
2. **Invalid histories by fault injection.** Take a valid history and apply one fault: change a read to another version, drop a write, move a commit timestamp across another, flip an outcome to aborted, or add a conflicting concurrent writer. The label always comes from the checkers, never from the intent of the fault.
3. **Distractors and dressing.** Add transactions that cannot affect the verdict, rename keys and transactions, and shuffle lines where order is not meaningful.
4. **Filters.** Reject duplicates (canonical-form hash), instances where checkers disagree, and trivially local violations when a higher difficulty is targeted.
5. **Difficulty metrics stored with every instance:** transactions, keys, operations, overlap degree, length of the shortest violating certificate, number of distractors and, for M3, the number of in-doubt transactions.
6. **Balance:** about half valid and half invalid in every size band.

**Two seeds, to avoid selection bias.** The **pilot seed** is for exploration and for tuning generator parameters (sizes, knobs). The **final seed** is committed to `docs/SELECTION.md`, with the selection rules, before the pilot results are examined in detail and before any final run; instances are drawn from it exactly once. Git history and the manifest show the order of events. Parameters are tuned on the pilot seed and results are reported on held-out instances.

**Core set (the 8 to 10 showcase tasks).** Drawn from final-seed instances by the pre-registered rules in `docs/SELECTION.md`: one stratum per blueprint in 20.10, the instance chosen by difficulty metrics fixed in advance (never by model outcomes), subject to evidence level VL2. Each core task gets its matched control (20.10). Report core and control pass rates separately.

**Extended study (supplementary).** About 20 final-seed instances per size level (for example 4, 6, 8, 10 and 12 transactions) per module, one run per instance, balanced classes, cost controlled with `estimate`. Plot accuracy and certificate validity against size with bootstrap intervals and report where each model breaks. Label it synthetic and supplementary; it never changes the headline.

**Why this design.** It gives statistical power that ten tasks cannot, resists memorisation (any new seed gives unseen instances), lets judges regenerate with another seed and see the same trend, and removes the criticism that tasks were picked because a model failed them. Verdict chance level is 50%, so always report certificate validity and per-class accuracy, never verdict accuracy alone.

### 20.10 Task blueprints

Eight to ten core tasks, one stratum each. The generator fills a stratum, the rules in `docs/SELECTION.md` choose the instance, and the ladder verifies it. Every core task has a matched control: the same history with one read value changed (or the twist removed) so that the verdict flips or the trap disappears. A model that passes the control and fails the core task isolates the gap.

**Anchors (controls, expected to pass; they calibrate the eval):** V1 write skew and V2 lost update from 20.11.

**Core strata**

1. **C1, M1, hidden write conflict:** a first-committer-wins conflict among seven or more transactions, where the two writers overlap by a single tick.
2. **C2, M1, snapshot boundary:** reads that must come from the start-time snapshot while the transaction also reads its own earlier write; start and commit timestamps of different transactions are adjacent (for example 6 and 7).
3. **C3, M2, long cycle:** a three-transaction cycle with two rw edges and one wr edge, buried among irrelevant transactions.
4. **C4, M2, valid but suspicious:** a serializable history in which a transaction reads an older value although its writer committed earlier. Models that flag it confuse serializable with strict serializable.
5. **C5, M2, needle:** 10 to 12 transactions, invalid because of exactly one read.
6. **C6, M1 or M2, aborted read** hidden among many committed reads.
7. **C7, M1 or M2, intermediate read:** a transaction reads a value its writer later overwrote within the same transaction.
8. **C8, M3, genuinely undetermined:** the completions disagree; the right answer is undetermined, with both completions and their certificates.
9. **C9, M3, looks ambiguous but is not:** an in-doubt transaction whose outcome cannot change the verdict; hedging is the wrong answer.
10. **C10 (optional), M4:** one linearizability task, only if M4 is built.

Judgment calls: C8 and C9 (calibrated uncertainty), C4 (resisting a plausible false alarm) and C5 (not accepting a history that looks fine on a skim).

### 20.11 Literature test vectors (must pass before anything else)

Classic cases whose verdicts are established in the literature (Berenson et al. 1995; Adya 1999; standard textbook treatments). Encode them as tests for all three checkers and have the independent reviewer confirm the encodings. Keys are x and y with initial value 0 unless stated. The timed form is for M1 and M3, the commit-ordered form for M2.

```
V1  Write skew
  timed:
    T1  start=1  commit=6  r(x)=0  w(y)=1
    T2  start=2  commit=5  r(y)=0  w(x)=1
  M1: valid.  reads_from: T1.op1=init, T2.op1=init
  commit-ordered:
    T2  commit=5  r(y)=0  w(x)=1
    T1  commit=6  r(x)=0  w(y)=1
  M2: invalid.  cycle: T1 -rw(x)-> T2 -rw(y)-> T1   (G2-item)

V2  Lost update
  timed:
    T1  start=1  commit=4  r(x)=0  w(x)=1
    T2  start=2  commit=5  r(x)=0  w(x)=2
  M1: invalid.  first-committer-wins on x between T1 and T2
  commit-ordered:
    T1  commit=4  r(x)=0  w(x)=1
    T2  commit=5  r(x)=0  w(x)=2
  M2: invalid.  cycle: T1 -ww(x)-> T2 -rw(x)-> T1   (G-single)

V3  Read skew
  timed:
    T1  start=1  commit=6  r(x)=0  r(y)=2
    T2  start=2  commit=4  w(x)=1  w(y)=2
  M1: invalid.  snapshot-read: T1.op2 expected init (0), observed 2, written by T2 after T1 started
  commit-ordered:
    T2  commit=4  w(x)=1  w(y)=2
    T1  commit=6  r(x)=0  r(y)=2
  M2: invalid.  cycle: T1 -rw(x)-> T2 -wr(y)-> T1   (G-single)

V4  Stale-looking read (serializable, but not strict serializable)
  timed:
    T1  start=1  commit=3  w(x)=1
    T2  start=2  commit=4  r(x)=0
  M1: valid.  reads_from: T2.op1=init
  commit-ordered:
    T1  commit=3  w(x)=1
    T2  commit=4  r(x)=0
  M2: valid.  serial_order: T2, T1

V5  Aborted read
  timed:
    T1  start=1  abort=2  w(x)=1
    T2  start=3  commit=4  r(x)=1
  M1: invalid.  snapshot-read named aborted-read: T2.op1 expected init (0), observed 1 from aborted T1
  commit-ordered:
    T1  abort  w(x)=1
    T2  commit=4  r(x)=1
  M2: invalid.  aborted-read: reader T2, writer T1, key x   (G1a)

V6  Intermediate read
  timed:
    T1  start=1  commit=4  w(x)=1  w(x)=2
    T2  start=5  commit=6  r(x)=1
  M1: invalid.  snapshot-read named intermediate-read: T2.op1 expected T1 (value 2), observed 1
  commit-ordered:
    T1  commit=4  w(x)=1  w(x)=2
    T2  commit=6  r(x)=1
  M2: invalid.  intermediate-read: reader T2, writer T1, key x   (G1b)

V7  In-doubt transaction, undetermined
  timed:
    T1  start=1  prepared commit_ts=4  w(x)=1
    T2  start=5  commit=6  r(x)=1
  M3: undetermined.
    T1 committed: valid (T2.op1 reads from T1).
    T1 aborted:   invalid (aborted-read: T2.op1 expected init, observed 1).

V8  In-doubt transaction that cannot matter (keys x, y, z)
  timed:
    T1  start=1  prepared commit_ts=4  w(z)=1
    T2  start=5  commit=6  r(x)=0  w(y)=1
  M3: valid.  Both completions are valid (T2.op1 reads from init in each).

V9  Reading your own write
  timed:
    T1  start=1  commit=3  w(x)=1  r(x)=1
  M1: valid.  reads_from has no entry (the read follows T1’s own write)
  broken variant:
    T1  start=1  commit=3  w(x)=1  r(x)=0
  M1: invalid.  own-write: T1.op2 must return 1

V10  Adjacent timestamps, no concurrency
  timed:
    T1  start=1  commit=3  w(x)=1
    T2  start=4  commit=5  r(x)=1  w(x)=2
  M1: valid.  reads_from: T2.op1=T1. T2 starts after T1 commits, so no conflict.
```

Every vector above was worked through against D1 and D2 when this plan was written, but the plan is not the authority: the three checkers and the independent reviewer are. If a checker disagrees with a vector, stop and resolve it before building anything else.

### 20.12 Dashboard additions (extends Section 12)

- **Derivation Studio** (task and attempt pages): the derivation as numbered steps. Selecting a step highlights the transactions, edges and timestamps it cites in the timeline. The model’s own certificate is checked line by line against it, each claimed edge marked present, absent or wrong-type with an icon and a word, never colour alone. Fully keyboard operable.
- **History timeline viewer:** one lane per transaction with a bar from start to end. Aborted transactions are dashed with a cross marker; in-doubt ones are hatched with a question marker; dependency edges are labelled arrows (ww, wr, rw) in distinct line styles; the true cycle and the model’s claimed cycle use different styles. Built as SVG with a title and description plus a complete text equivalent listing every transaction, edge and cycle. No animation under reduced motion.
- **Learn route:** vectors V1 to V10 in predict-then-reveal mode. The visitor chooses valid or invalid with a labelled radio group, optionally names a cycle, then sees the derivation in plain language. Everything stays local: nothing is sent or stored beyond the session. It is the owner’s learning tool and lets judges feel the difficulty first-hand.
- **Try-it mode** for core tasks: attempt, then reveal, with the same local-only rule and a clear note that it is not part of the results.
- **Evidence panel:** per task, the evidence level (a badge with text), the checkers’ agreement, the differential-test totals (read from the committed evidence report, never typed), the vector status, the oracle code hash and freeze date, and a link to the verification record, all fed by `/api/integrity` and `/api/evidence`.
- **Audit page:** the 30-item audit with each agree or disagree and the overall agreement rate.
- **Failure Map axes:** x is module (and model under test), z is history-size band, column height is failure rate; the paired short column is the matched control, as in 12.3.
- **Accessibility:** everything above follows Section 13. The quiz uses real form controls with labels, announces results through a polite live region, and never relies on colour alone.

### 20.13 Failure taxonomy, automatic tagging and analyses

Put these tags in `eval.config.yaml` **before** looking at results. All but one are assigned automatically from certificate verification, so tagging does not depend on anyone’s judgment.

- `false-accept`: the model says valid where the oracle says invalid.
- `false-alarm`: the model says invalid where the oracle says valid.
- `strictness-confusion`: a false alarm on a history that is valid under D2 but contains a stale-looking read.
- `right-verdict-bad-proof`: correct verdict, failed certificate.
- `phantom-edge`: a claimed edge that does not exist (wrong type, key or endpoints).
- `cycle-not-closed`: real edges that do not form a closed cycle.
- `order-violates-edge`: a serial order in which a real edge points backward.
- `reads-from-error`: a wrong, missing or invented `reads_from` entry.
- `snapshot-boundary-error`: a snapshot-read error where the true source commits within two ticks of the reader’s start.
- `concurrency-misjudged`: a claimed or missed first-committer-wins conflict that is wrong.
- `hedged-when-determinable`: undetermined, where every completion agrees.
- `committed-when-undetermined`: a definite verdict where completions disagree.
- `incomplete-completions`: missing or duplicated completion assignments.
- `format-error`, `truncated-or-refused`, `other`.
- `rule-misapplied` is the one manual tag: the response states a rule that contradicts the definitions (for example that snapshot isolation forbids write skew). Keyword patterns suggest it and the owner confirms it in the viewer.

**Owner review:** the tag counts, every `other`, every suggested `rule-misapplied`, and a random 20% re-check a day later with the self-agreement rate reported.

**Analyses to run and show:**

1. False-accept versus false-alarm rate per model.
2. Share of correct verdicts that carry an invalid certificate.
3. The size-scaling curve and its knee, per model and module.
4. Over-hedging versus over-confidence on M3.
5. Anchors versus novel instances (a memorisation check).
6. Control versus core on every blueprint.
7. Whether the same instances defeat every model, or failures are model-specific.
8. Reasoning tokens used versus correctness (do longer traces help?).
9. Definitions given versus name only, if the ablation is run.

### 20.14 Human baseline and reference (optional, recommended)

The brief asks for something an expert can do reliably. The oracle shows that a program solves every item in milliseconds and that the textbook precedence-graph procedure applies; a small human baseline strengthens the claim.

- **Method:** five or more volunteers with a computing background solve about ten items (core and control) with pen and paper, no AI and a time limit, using the Try-it mode or a printed sheet.
- **Ethics and privacy:** voluntary, anonymous, told how the results are used, no personal data collected; publish only aggregate accuracy and median time in `docs/BASELINE.md`.
- **Reporting:** accuracy, certificate validity and median time with the small-sample caveat. Call them “volunteers with a computing background”, not experts, unless they are.
- **If no baseline is possible:** say so, and rely on the textbook procedure and the algorithmic reference.

### 20.15 Honest claims, limits and README wording

- **Claim template:** “On synthetic transaction histories of up to N transactions, with the rule’s definition supplied and no tools, model A produced a verifiable proof for X% (interval) of held-out instances and model B for Y%, failing mostly by Z.” No claim about debugging real databases in general.
- **Threats to validity to state:** synthetic histories; small sizes; no tool use (a variant with code execution could close the gap, and saying so is a strength); the chosen formal definitions; model versions on the run date; tuning of parameters on the pilot seed; the owner is a computer-science practitioner, not a specialist in transaction theory, and the mitigations in 20.2.
- **Optional extension:** a second condition in which models may run code. If the gap persists, say so; if it closes, report that too, because it tells readers when the weakness matters.
- **Wording for README section 3 (Domain and expertise):** the owner’s real background in computer science; that the eval applies published definitions; that ground truth is machine-verified by separately implemented checkers (state exactly how many and who or what wrote them) plus the literature vectors, and by an external cross-check only if one was actually run; and that the owner reviewed the derivations.

### 20.16 Prior work and reading list (verify every citation before listing it)

Check the title, authors, year and venue of each item yourself, and never copy text from them (the brief excludes third-party material you cannot share).

- Berenson, Bernstein, Gray, Melton, O’Neil and O’Neil, “A Critique of ANSI SQL Isolation Levels”, SIGMOD 1995: snapshot isolation, write skew, the anomalies behind V1 to V3.
- Adya, doctoral thesis on weak consistency, MIT, 1999: the dependency-graph formalism and the anomaly names G0 to G2 used in D2.
- Herlihy and Wing, “Linearizability: A Correctness Condition for Concurrent Objects”, 1990: only for module M4.
- Kingsbury and Alvaro, the Elle paper on inferring isolation anomalies from observations, and the Jepsen project’s published analyses: inspiration for black-box history checking and for indeterminate operations; the Elle tool only if used for the external check.
- Complexity of checking serializability from observed reads (for example Papadimitriou 1979; Biswas and Enea 2019): only if cited to explain why instances stay small.
- Reading for the owner: Kleppmann, *Designing Data-Intensive Applications* (chapter 7) and the Jepsen consistency-models map.
- Tools: Z3 (development-only), Hypothesis for property-based tests, and Elle if the external check is run.
- README section 8 states plainly that the checkers, generator and graders are original implementations of published definitions, and lists the AI coding tools used and how.

### 20.17 Day-one pilot and go or no-go

The pilot needs trustworthy labels without hand derivation, so it starts by building the verification basics.

1. Build the parser, the printer, checker O2 and the vectors in 20.11 as tests. Do not continue until every vector passes.
2. Build checker O1 and confirm that O1 and O2 agree on 10,000 random histories (pilot-grade evidence only).
3. Generate 24 to 60 pilot-seed instances (24 is enough in the six-day edition) for M1 and M2 across sizes 4, 6, 8, 10 and 12, balanced valid and invalid.
4. Run three models once each with the real prompt template and the real graders (the cost is small; check it with `estimate`).
5. **Read the signal.** Go if at least two of the three models produce an invalid or missing certificate on roughly a third or more of the larger instances (sizes 8 to 12). Open about ten failures in the Derivation Studio and confirm they are genuine model errors, not prompt, parsing, token-budget or grader problems.
6. **No-go and fallbacks:** if failures are mostly format errors or truncations, fix the prompt and token budget, not the story. If every model passes everything at size 12, add M3 and denser histories and re-test. If they still pass, switch to theme 2 or 3 from the earlier list before building the dashboard.
7. Pilot results are exploratory: never report them as final, only describe them in the selection disclosure.

### 20.18 Changes to earlier sections and roadmap

- **5.2 schema:** add `module`, `definitions_ref`, a structured `history`, `question`, a generator record (seed, parameters, difficulty metrics) and a derived `oracle` record (verdict, certificate, derivation, evidence level, checker agreement). `grading.method` gains `certificate`. `verified_by` lists evidence references (checker agreement, vector status, reviewers), not just a person.
