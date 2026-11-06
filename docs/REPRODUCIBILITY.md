# Reproducibility and failure analysis

The authoritative artifacts are frozen tasks and saved run/evaluation files.
Each raw attempt includes a content hash and the hash of its source task file.
`results/MANIFEST.json` records hashes for covered task and result files, along
with selected configuration and runtime inputs.

The local CLI supports:

```powershell
python -m evalkit verify
python -m evalkit replay
python -m evalkit reproduce
```

Verification checks manifest and attempt/task integrity and stored results.
Replay grades saved raw responses without contacting a provider. Reproduction
verifies local evidence and regenerates the report from it. These operations
do not make model API calls.

`python -m evalkit ingest` applies SQLite migrations and builds the
rebuildable dashboard projection; it never replaces source evidence.
`python -m evalkit preflight` checks the offline release contract.

Failures are classified from the actual response and grade. The human-review
field remains unreviewed unless a review is performed and recorded. Machine
labels are not human-confirmed findings.
