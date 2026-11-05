import json

from evalkit.manifest import verify_attempt_hashes, verify_manifest
from evalkit.replay import replay, verify_results
from evalkit.runner import run


def test_mock_run_replays_and_verifies_without_network(tmp_path):
    source = __import__("pathlib").Path(".")
    (tmp_path / "tasks").mkdir()
    for path in list((source / "tasks").glob("T01.json")):
        (tmp_path / "tasks" / path.name).write_bytes(path.read_bytes())
    run_id = run(tmp_path, provider="mock", run_id="phase5-test")
    assert run_id == "phase5-test"
    assert verify_attempt_hashes(tmp_path) == []
    assert replay(tmp_path)["attempts"] == 1
    assert verify_results(tmp_path) == []
    assert verify_manifest(tmp_path) == []


def test_tampered_attempt_is_detected(tmp_path):
    source = __import__("pathlib").Path(".")
    (tmp_path / "tasks").mkdir()
    task = source / "tasks" / "T01.json"
    (tmp_path / "tasks" / task.name).write_bytes(task.read_bytes())
    run(tmp_path, provider="mock", run_id="tamper-test")
    attempt = next(
        (tmp_path / "results" / "runs" / "tamper-test" / "raw").glob("*.json")
    )
    record = json.loads(attempt.read_text(encoding="utf-8"))
    record["response_text"] += "tampered"
    attempt.write_text(json.dumps(record), encoding="utf-8")
    assert verify_attempt_hashes(tmp_path)


def test_failure_taxonomy_is_explicit_in_run(tmp_path):
    source = __import__("pathlib").Path(".")
    (tmp_path / "tasks").mkdir()
    task = source / "tasks" / "T01.json"
    data = json.loads(task.read_text(encoding="utf-8"))
    data["id"] = "BAD"
    data["expected_verdict"] = "invalid"
    (tmp_path / "tasks" / "BAD.json").write_text(json.dumps(data), encoding="utf-8")
    run(tmp_path, provider="mock", run_id="failure-test")
    failures = json.loads(
        (tmp_path / "results" / "runs" / "failure-test" / "failures.json").read_text()
    )
    assert failures["human_review"]["reviewed"] is False
