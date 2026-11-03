import json

from evalkit.report import build_report


def test_report_uses_only_existing_grades_and_records_review_status(tmp_path):
    run = tmp_path / "results" / "runs" / "run-1"
    run.mkdir(parents=True)
    (run / "grades.jsonl").write_text(
        json.dumps({"task_id": "T1", "score": 1, "passed": True}) + "\n",
        encoding="utf-8",
    )
    tasks = tmp_path / "tasks"
    tasks.mkdir()
    (tasks / "T1.json").write_text(
        json.dumps({"id": "T1", "module": "M1", "control": False}),
        encoding="utf-8",
    )
    report = build_report(tmp_path)
    assert report["attempts"] == 1
    assert report["human_review"] == {"status": "not_requested", "reviewed": False}
