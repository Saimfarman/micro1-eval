<!-- Domain pack: verifying transaction histories (definitions, checkers, grading, generator, vectors). Section 0.1 and 0.6 override older dates and scope elsewhere. -->

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
