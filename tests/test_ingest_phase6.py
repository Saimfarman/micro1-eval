import json
import sqlite3
from pathlib import Path

import pytest

from backend.db.ingest import ingest
from evalkit.manifest import write_manifest
from evalkit.runner import run


def _fixture(root: Path, with_run: bool = True) -> None:
    (root / "tasks").mkdir(parents=True)
    source = Path("tasks/T01.json")
    (root / "tasks" / source.name).write_bytes(source.read_bytes())
    if with_run:
        run(root, provider="mock", run_id="ingest-test")
    else:
        write_manifest(root)


def test_empty_dataset_ingests_tasks_and_models(tmp_path):
    _fixture(tmp_path, with_run=False)
    result = ingest(tmp_path)
    assert result["status"] == "rebuilt"
    connection = sqlite3.connect(tmp_path / "results/index.sqlite3")
    assert connection.execute("SELECT COUNT(*) FROM tasks").fetchone()[0] == 1
    assert connection.execute("SELECT COUNT(*) FROM attempts").fetchone()[0] == 0


def test_ingest_is_idempotent_and_manifest_aware(tmp_path):
    _fixture(tmp_path)
    first = ingest(tmp_path)
    second = ingest(tmp_path)
    assert first["status"] == "rebuilt"
    assert second["status"] == "unchanged"
    (tmp_path / "tasks/T01.json").write_text(
        (tmp_path / "tasks/T01.json").read_text(encoding="utf-8") + "\n",
        encoding="utf-8",
    )
    write_manifest(tmp_path)
    with pytest.raises(ValueError, match="task hash mismatch"):
        ingest(tmp_path)


def test_partial_run_is_ingested_without_fabrication(tmp_path):
    _fixture(tmp_path)
    grades = tmp_path / "results/runs/ingest-test/grades.jsonl"
    rows = grades.read_text(encoding="utf-8").splitlines()
    grades.write_text(rows[0] + "\n", encoding="utf-8")
    write_manifest(tmp_path)
    result = ingest(tmp_path)
    assert result["grades"] == 1
    connection = sqlite3.connect(tmp_path / "results/index.sqlite3")
    assert connection.execute("SELECT COUNT(*) FROM grades").fetchone()[0] == 1


def test_tampered_dataset_is_rejected(tmp_path):
    _fixture(tmp_path)
    attempt = next((tmp_path / "results/runs/ingest-test/raw").glob("*.json"))
    record = json.loads(attempt.read_text(encoding="utf-8"))
    record["response_text"] += "tamper"
    attempt.write_text(json.dumps(record), encoding="utf-8")
    write_manifest(tmp_path)
    with pytest.raises(ValueError, match="unverified evidence"):
        ingest(tmp_path)
