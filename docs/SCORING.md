# Scoring

Each response is graded deterministically against the oracle verdict. A response
passes when its final JSON block contains the expected `verdict`; malformed or
missing JSON is a failure. `pass@1` is passed attempts divided by attempts.
Controls are reported separately from core tasks. Raw attempts are immutable and
replay never calls a model.
