<!-- START HERE: six-day edition, $0 budget, schedule, Copilot kit, starter pack. Section 0.1 and 0.6 override older dates and scope elsewhere. -->

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
