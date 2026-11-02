# Decisions log (add three lines at the end of every working day)

- 2026-10-31: Domain chosen: checking database-transaction histories (snapshot isolation, serializability, in-doubt).
- 2026-10-31: M4 (linearizability) is out of scope for the six-day edition.
- 2026-10-31: SQLite chosen for the dashboard index (zero setup; derived from files). No external CDNs.
- 2026-10-31: Azure free account tested: gpt-5-mini deployed and answered, then deleted. Never press Upgrade.
- 2026-11-01: Starter core built and tested: parser, O2 rules checker, O1 reference, 66 tests, 60,000-history
  differential run with zero disagreements. O1 and O2 share an author (see docs/DISCLOSURES.md).
- TODO (owner): compare docs/MODELS.md with the Jepsen consistency pages and Kleppmann chapter 7; record differences here.
- 2026-11-02: Approved full scope restores M4 linearizability and adds O3 using a pinned Z3 checker.
- 2026-11-02: Approved backend target is Quart; approved frontend target is component-based React/Vite/TypeScript/Three.js.
- 2026-11-02: SQLite remains the derived database because it preserves offline, clean-room reproducibility.
