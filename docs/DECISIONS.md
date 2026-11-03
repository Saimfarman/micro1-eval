# Decisions log (add three lines at the end of every working day)

- 2026-10-31: Domain chosen: checking database-transaction histories (snapshot isolation, serializability, in-doubt).
- 2026-10-31: M4 (linearizability) is out of scope for the six-day edition.
- 2026-10-31: SQLite chosen for the dashboard index (zero setup; derived from files). No external CDNs.
- No live provider run is included in this repository release. Any future live
  run requires owner approval, local credentials, and a dated run record.
- 2026-11-01: Starter core built and tested: parser, O2 rules checker, O1 reference, 66 tests, 60,000-history
  differential run with zero disagreements. O1 and O2 share an author (see docs/DISCLOSURES.md).
- Owner-only follow-up: compare docs/MODELS.md with the cited consistency
  literature before making any expanded domain claim.
- 2026-11-02: Approved full scope restores M4 linearizability and adds O3 using a pinned Z3 checker.
- 2026-11-02: Approved backend target is Quart; approved frontend target is component-based React/Vite/TypeScript/Three.js.
- 2026-11-02: SQLite remains the derived database because it preserves offline, clean-room reproducibility.
- 2026-11-03: Phase 1 adds M5 strict serializability as a separately selectable,
  bounded timed-history module. It requires a serial order that reproduces every
  committed read and also respects real-time precedence (response before
  invocation). O1 enumerates orders, O2 searches real-time topological orders,
  and O3 encodes order/source constraints in Z3. Aborted transactions are
  ignored and prepared transactions are rejected; expected results are
  produced by these checkers, not hand-entered.
