# Task selection rules

The checked-in task JSON files under `tasks/` are the frozen evaluation
corpus. The validator recomputes expected verdicts, certificates, derivations,
and canonical hashes using the appropriate checker implementations. Stored
expectations that disagree with recomputation are rejected.

Generated tasks are deterministic for a fixed module, count, and seed, and are
written outside the frozen corpus. Canonical identity is SHA-256 over module
name and canonical history; duplicate task histories are rejected.

Every eligible task must use a supported module (M1–M5), parse using the
module's format, have a final/generated status, and carry the required
provenance and oracle-derived metadata. Draft or placeholder tasks are not
eligible.

Core tasks and controls remain distinct. Matched controls identify their paired
core task; standalone controls are labelled as such. Selection does not
silently replace unavailable module/verdict categories with another category.
The actual checked-in corpus is the authority for counts and composition.

Generation and validation are offline and do not call model providers.
