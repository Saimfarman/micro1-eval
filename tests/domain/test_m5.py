import json

import pytest

from evalkit.domain.history import HistoryError, parse
from evalkit.domain.strict_serializability import check, verify_certificate


VALID = """\
Keys: x. Initial: x=0.
T1  start=1  commit=4  w(x)=1
T2  start=2  commit=6  r(x)=1
"""

SERIALIZABLE_NOT_STRICT = """\
Keys: x. Initial: x=0.
T1  start=1  commit=4  w(x)=1
T2  start=5  commit=8  r(x)=0
"""

INVALID = """\
Keys: x, y. Initial: x=0, y=0.
T1  start=1  commit=6  r(x)=0  w(y)=1
T2  start=2  commit=5  r(y)=0  w(x)=1
"""


def generated_histories():
    for value in range(1, 6):
        yield parse(f"""\
Keys: x. Initial: x=0.
T1  start=1  commit=4  w(x)={value}
T2  start=5  commit=8  r(x)={value}
"""), "valid"
        yield parse(f"""\
Keys: x. Initial: x=0.
T1  start=1  commit=4  w(x)={value}
T2  start=5  commit=8  r(x)=0
"""), "invalid"


def test_m5_generated_positive_and_negative_cases_agree():
    for history, expected in generated_histories():
        results = check(history, "all")
        assert {result["verdict"] for result in results.values()} == {expected}


@pytest.mark.parametrize("checker", ["reference", "rules", "constraint"])
def test_m5_valid_certificate(checker):
    result = check(parse(VALID), checker)
    assert result["verdict"] == "valid"
    assert result["certificate"]["serial_order"] == ["T1", "T2"]


def test_m5_distinguishes_real_time_order():
    history = parse(SERIALIZABLE_NOT_STRICT)
    assert check(history, "reference")["verdict"] == "invalid"
    assert check(history, "rules")["verdict"] == "invalid"
    assert check(history, "constraint")["verdict"] == "invalid"


@pytest.mark.parametrize("checker", ["reference", "rules", "constraint"])
def test_m5_invalid_certificate(checker):
    result = check(parse(INVALID), checker)
    assert result["verdict"] == "invalid"
    assert result["certificate"]["kind"] == "no-strict-serial-order"


def test_m5_checkers_agree_and_result_is_json_serializable():
    results = check(parse(VALID), "all")
    assert {result["verdict"] for result in results.values()} == {"valid"}
    json.dumps(results)
    assert verify_certificate(parse(VALID), results["reference"])


def test_m5_checker_rejects_wrong_history_form_and_prepared_transactions():
    with pytest.raises(HistoryError):
        check(parse("Keys: x. Initial: x=0.\nT1  commit=1  w(x)=1"), "reference")
    with pytest.raises(HistoryError):
        check(parse("Keys: x. Initial: x=0.\nT1  start=1  prepared commit_ts=4  w(x)=1"), "reference")


def test_m5_metamorphic_transaction_rename_preserves_verdict():
    history = parse(INVALID)
    renamed = parse("""\
Keys: x, y. Initial: x=0, y=0.
Q1  start=1  commit=6  r(x)=0  w(y)=1
Q2  start=2  commit=5  r(y)=0  w(x)=1
""")
    assert check(history, "all")["reference"]["verdict"] == check(
        renamed, "all"
    )["reference"]["verdict"]


def test_m5_mutated_valid_certificate_is_not_accepted_as_a_certificate():
    result = check(parse(VALID), "reference")
    result["certificate"]["serial_order"].reverse()
    assert not verify_certificate(parse(VALID), result)
