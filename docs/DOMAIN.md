# Domain decision

This evaluation measures whether language models can apply explicit definitions of
snapshot isolation (M1), serializability (M2), and in-doubt transactions (M3) to
small database histories. The reference definitions are in `docs/MODELS.md`; the
independent O1 and O2 implementations are the source of expected answers.

The project deliberately does not claim to measure database performance, vendor
configuration knowledge, predicate reads, or full distributed-protocol traces.
