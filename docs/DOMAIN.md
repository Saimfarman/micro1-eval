# Domain decision

This evaluation measures whether language models can apply explicit definitions of
snapshot isolation (M1), serializability (M2), in-doubt transactions (M3),
linearizability (M4), and strict serializability (M5) to small database
histories. The reference definitions are in `docs/MODELS.md`; expected answers
come from the repository oracle implementations and are never hand-entered.

The project deliberately does not claim to measure database performance, vendor
configuration knowledge, predicate reads, or full distributed-protocol traces.
