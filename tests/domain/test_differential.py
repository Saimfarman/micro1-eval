"""O1 (reference) and O2 (rules) must agree on every random history."""

import random

import pytest

from evalkit.domain.fuzz import random_history
from evalkit.domain.history import parse, print_history
from evalkit.domain.oracle import reference, rules

N = 1500


@pytest.mark.parametrize("module", ["M1", "M2", "M3"])
def test_checkers_agree_on_random_histories(module):
    rng = random.Random(20261101 + hash(module) % 1000)
    seen = {"valid": 0, "invalid": 0, "undetermined": 0}
    for i in range(N):
        h = random_history(rng, module)
        assert parse(print_history(h)) == h  # printer/parser round trip on fuzz data
        a = rules.check(h, module)["verdict"]
        b = reference.ref_verdict(h, module)
        assert a == b, (
            f"{module} disagreement #{i}:\n{print_history(h)}\nrules={a} reference={b}"
        )
        seen[a] += 1
    # the fuzzer must exercise both classes, otherwise agreement means little
    assert seen["valid"] > N * 0.15 and seen["invalid"] > N * 0.15, seen
