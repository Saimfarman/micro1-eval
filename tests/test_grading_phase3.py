import json

from evalkit.domain.strict_serializability import check
from evalkit.grading import extract_answer, grade


VALID = """\
Keys: x. Initial: x=0.
T1  start=1  commit=4  w(x)=1
T2  start=5  commit=8  r(x)=1
"""

INVALID = """\
Keys: x. Initial: x=0.
T1  start=1  commit=4  w(x)=1
T2  start=5  commit=8  r(x)=0
"""


def test_extract_answer_uses_last_json_block_and_reports_format_failure():
    assert (
        extract_answer(
            'draft ```json {"verdict":"invalid"}``` final ```json {"verdict":"valid"}```'
        )["verdict"]
        == "valid"
    )
    assert extract_answer("not json") is None


def test_m5_valid_and_invalid_certificates_are_checked():
    valid = check(
        __import__("evalkit.domain.history", fromlist=["parse"]).parse(VALID), "rules"
    )
    invalid = check(
        __import__("evalkit.domain.history", fromlist=["parse"]).parse(INVALID), "rules"
    )
    assert grade(json.dumps(valid), VALID, "M5")["passed"]
    assert grade(json.dumps(invalid), INVALID, "M5")["passed"]
    bad = dict(valid)
    bad["certificate"] = {"serial_order": ["T2", "T1"]}
    assert not grade(json.dumps(bad), VALID, "M5")["criteria"]["certificate"]


def test_malformed_and_empty_answers_are_explicit_failures():
    result = grade("", VALID, "M5")
    assert result["reason"] == "certificate or verdict failed"
    assert result["observed_verdict"] is None
