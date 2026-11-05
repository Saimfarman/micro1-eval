import random

import pytest

from evalkit.domain.fuzz import random_history
from evalkit.domain.oracle import o3, reference, rules


@pytest.mark.parametrize("module", ["M1", "M2", "M3"])
def test_o3_agrees_with_existing_checkers(module):
    rng = random.Random(20261102 + len(module))
    for _ in range(100):
        history = random_history(rng, module)
        assert (
            o3.check(history, module)["verdict"]
            == rules.check(history, module)["verdict"]
        )
        assert o3.check(history, module)["verdict"] == reference.ref_verdict(
            history, module
        )
