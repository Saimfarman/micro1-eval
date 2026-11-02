import json
import pytest

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


def test_m4_valid_linearization_certificate_passes():
    history = (
        "Register: initial=0.\n"
        "W1  invoke=1  response=2  write=1\n"
        "R1  invoke=3  response=4  read=1\n"
    )
    answer = {"verdict": "valid", "linearization": ["W1", "R1"]}
    assert grade(json.dumps(answer), history, "M4")["passed"]


def test_m4_invalid_certificate_rejects_mutated_operations():
    history = (
        "Register: initial=0.\n"
        "W1  invoke=1  response=2  write=1\n"
        "R1  invoke=3  response=4  read=0\n"
    )
    answer = {
        "verdict": "invalid",
        "violation": {
            "operations": ["W1"],
            "reason": "no real-time-respecting legal linearization exists",
        },
    }
    result = grade(json.dumps(answer), history, "M4")
    assert not result["passed"]
    assert not result["criteria"]["certificate"]


def test_weighted_score_requires_critical_criteria():
    result = grade(json.dumps({"verdict": "valid", "reads_from": {}}), V["V1_timed"], "M1")
    assert result["score"] == pytest.approx(0.6)
    assert not result["passed"]
