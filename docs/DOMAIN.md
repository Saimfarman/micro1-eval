# Domain scope

This project evaluates reasoning about explicit database and register
consistency histories. The implemented modules are:

- **M1 — Snapshot isolation:** timed transaction histories.
- **M2 — Serializability:** commit-ordered transaction histories.
- **M3 — In-doubt transactions:** validity across completions of prepared
  transactions.
- **M4 — Register linearizability:** a single register with invocation and
  response times.
- **M5 — Strict serializability:** timed multi-operation transactions, with
  serial order constrained by non-overlapping real-time order.

The project measures task-level rule application and certificate production.
It does not evaluate database throughput, product-specific database behavior,
vendor configuration, predicate reads, or full distributed-protocol traces.

Expected answers in tasks are generated and validated by the relevant checker
implementations. They must not be authored from model responses or guessed.
Formal rules are documented in [MODELS.md](MODELS.md); the published textbook
cases are listed in [VECTORS.md](VECTORS.md).
