import pytest

from evalkit.domain.history import HistoryError
from evalkit.domain.linearizability import parse_register, print_register
from evalkit.domain.oracle import m4, o3, reference, rules


VALID = """\
Register: initial=0.
w1  invoke=1  response=4  write=1
r1  invoke=2  response=3  read=0
"""

INVALID = """\
Register: initial=0.
w1  invoke=1  response=2  write=1
r1  invoke=3  response=4  read=0
"""


def test_register_round_trip_and_validity():
    history = parse_register(VALID)
    assert parse_register(print_register(history)) == history
    assert rules.check(history, "M4")["verdict"] == "valid"
    assert reference.ref_verdict(history, "M4") == "valid"
    assert o3.check(history, "M4")["verdict"] == "valid"


def test_register_realtime_violation():
    history = parse_register(INVALID)
    assert m4.check(history)["verdict"] == "invalid"
    assert reference.ref_verdict(history, "M4") == "invalid"
    assert o3.check(history, "M4")["verdict"] == "invalid"


def test_register_rejects_duplicate_timestamps():
    with pytest.raises(HistoryError):
        parse_register("""\
Register: initial=0.
w1 invoke=1 response=2 write=1
r1 invoke=2 response=3 read=1
""")
