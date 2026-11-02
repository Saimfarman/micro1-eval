# Reproducibility and failure analysis

Raw attempts are immutable evidence records. Each record contains a
`content_sha256` over its complete JSON payload and the SHA-256 of the task
file used to create it. `verify` checks both hashes, the file manifest, stored
grades, and any stored summary.

`replay` reads only local task and raw-attempt files. It never calls a provider.
`verify_results` recomputes every grade and compares it with `grades.jsonl`.
Reports can therefore be regenerated from the evidence files in a clean
environment without API keys.

Failed attempts receive conservative machine-derived tags such as
`malformed-json`, `wrong-verdict`, and `invalid-certificate`, plus a suggestion
and a `human_review` object. The default status is `not_requested` or
`not_reviewed`; the system never claims a human reviewed or confirmed a
failure.
