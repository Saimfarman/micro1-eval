import pytest

from evalkit.domain.history import HistoryError, parse, print_history

TIMED = """Keys: x, y. Initial: x=0, y=0. Every written value is unique per key.
T1  start=1  commit=6  r(x)=0  w(y)=1
T2  start=2  abort=4  w(x)=7
T3  start=3  prepared commit_ts=9  w(y)=2"""

ORDERED = """Keys: x, y. Initial: x=0, y=0.
T2  commit=5  r(y)=0  w(x)=1
T3  abort  w(x)=7
T1  commit=6  r(x)=0  w(y)=1"""


@pytest.mark.parametrize("text", [TIMED, ORDERED])
def test_round_trip(text):
    h = parse(text)
    assert parse(print_history(h)) == h
    assert print_history(parse(print_history(h))) == print_history(h)


def test_fields_timed():
    h = parse(TIMED)
    assert h.form == "timed" and h.keys == ("x", "y") and h.initial == {"x": 0, "y": 0}
    t3 = h.txn("T3")
    assert (t3.outcome, t3.start, t3.end) == ("prepared", 3, 9)
    assert h.txn("T2").outcome == "abort" and h.txn("T2").end == 4


@pytest.mark.parametrize(
    "bad",
    [
        "",
        "Keys: x. Initial: x=0.\n",  # no transactions
        "Keys: x. Initial: x=0.\nT1 start=1 commit=2 w(x)=0",  # not unique (equals initial)
        "Keys: x. Initial: x=0.\nT1 start=1 commit=2 w(x)=1\nT2 start=3 commit=4 w(x)=1",
        "Keys: x. Initial: x=0.\nT1 start=2 commit=1 w(x)=1",  # start after end
        "Keys: x. Initial: x=0.\nT1 start=1 commit=2 w(x)=1\nT2 start=2 commit=3 w(x)=2",  # tie
        "Keys: x. Initial: x=0.\nT1 start=1 commit=2 w(q)=1",  # undeclared key
        "Keys: x. Initial: x=0.\nT1 commit=5 w(x)=1\nT2 commit=3 w(x)=2",  # not in commit order
        "Keys: x. Initial: x=0.\nT1 commit=5 w(x)=1\nT2 start=1 commit=9 w(x)=2",  # mixed forms
        "Keys: x. Initial: x=0.\nT1 start=1 commit=2 z(x)=1",  # bad op
        "Keys: x. Initial: x=0.\nT1 start=1 sparkle=2 w(x)=1",  # bad outcome
    ],
)
def test_rejects_bad_input(bad):
    with pytest.raises(HistoryError):
        parse(bad)
