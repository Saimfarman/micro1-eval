<!-- Brief requirements, agent rules, strategy, domain choice. Section 0.1 and 0.6 override older dates and scope elsewhere. -->

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
