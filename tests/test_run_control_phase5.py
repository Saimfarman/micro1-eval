import json

import pytest

from evalkit.providers import Quota
from evalkit.runner import run


def _task(tmp_path):
    source = __import__("pathlib").Path("tasks/T01.json")
    (tmp_path / "tasks").mkdir()
    (tmp_path / "tasks/T01.json").write_bytes(source.read_bytes())


def test_token_quota_is_enforced():
    quota = Quota(
        requests_per_minute=10,
        requests_per_day=10,
        tokens_per_minute=2,
        tokens_per_day=2,
    )
    quota.reserve(tokens=2, now=10)
    with pytest.raises(RuntimeError, match="tokens-per-minute"):
        quota.reserve(tokens=1, now=10)


def test_daily_quota_resets_on_new_day():
    quota = Quota(
        requests_per_minute=10,
        requests_per_day=1,
        tokens_per_minute=10,
        tokens_per_day=10,
    )
    quota.reserve(tokens=1, day="2026-11-03")
    with pytest.raises(RuntimeError, match="per-day"):
        quota.reserve(tokens=1, day="2026-11-03")
    quota.reserve(tokens=1, day="2026-11-04")


def test_run_is_idempotent_and_checkpointed(tmp_path):
    _task(tmp_path)
    run(tmp_path, provider="mock", run_id="resume-test")
    raw = next((tmp_path / "results/runs/resume-test/raw").glob("*.json"))
    before = raw.read_bytes()
    run(tmp_path, provider="mock", run_id="resume-test", resume=True)
    assert raw.read_bytes() == before
    checkpoint = json.loads((raw.parent.parent / "checkpoint.json").read_text())
    assert checkpoint["completed"]


def test_spend_cap_pauses_without_writing_attempt(tmp_path):
    _task(tmp_path)
    run(tmp_path, provider="mock", run_id="cap-test", spend_cap_usd=-1)
    run_data = json.loads((tmp_path / "results/runs/cap-test/run.json").read_text())
    assert run_data["status"] == "quota-paused"
    assert not list((tmp_path / "results/runs/cap-test/raw").glob("*.json"))
