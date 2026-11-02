import json

from evalkit.grading import extract_answer, grade
from evalkit.domain.history import parse
from tests.domain.vectors import V


def test_extract_answer_uses_last_fenced_json():
    text = "draft ```json\n{\"verdict\":\"invalid\"}\n``` final ```json\n{\"verdict\":\"valid\"}\n```"
    assert extract_answer(text)["verdict"] == "valid"


def test_m1_valid_certificate_passes():
    history = V["V1_timed"]
    answer = {"verdict": "valid", "reads_from": {"T1.op1": "init", "T2.op1": "init"}}
    result = grade(json.dumps(answer), history, "M1")
    assert result["passed"]


def test_m1_bad_certificate_fails_even_with_right_verdict():
    result = grade(json.dumps({"verdict": "valid", "reads_from": {}}), V["V1_timed"], "M1")
    assert not result["passed"]
    assert result["criteria"]["verdict"]
    assert not result["criteria"]["certificate"]


def test_m2_valid_serial_order_certificate_passes():
    answer = {"verdict": "valid", "serial_order": ["T2", "T1"]}
    assert grade(json.dumps(answer), V["V4_ordered"], "M2")["passed"]


def test_m3_requires_every_completion():
    result = grade(json.dumps({"verdict": "undetermined", "completions": []}), V["V7_timed"], "M3")
    assert not result["passed"]
