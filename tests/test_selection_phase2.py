import json

from evalkit.selection import SelectionSpec, select_tasks
from evalkit.tasks import validate_tasks


def test_selection_is_reproducible_and_strictly_valid(tmp_path):
    first = tmp_path / "first"
    second = tmp_path / "second"
    spec = SelectionSpec("M1", pilot_seed=11, final_seed=42, count=4,
                         control_count=2, held_out_count=2)
    first_manifest = select_tasks(first, spec)
    second_manifest = select_tasks(second, spec)
    assert first_manifest.read_text(encoding="utf-8") == second_manifest.read_text(encoding="utf-8")
    assert validate_tasks(first, strict=True) == []
    assert validate_tasks(second, strict=True) == []
    assert json.loads(first_manifest.read_text(encoding="utf-8"))["protocol"] == "selection-v1"


def test_selection_supports_new_m5_module_and_held_out_split(tmp_path):
    spec = SelectionSpec("M5", pilot_seed=11, final_seed=43, count=4,
                         control_count=2, held_out_count=2)
    manifest_path = select_tasks(tmp_path, spec)
    records = json.loads(manifest_path.read_text(encoding="utf-8"))["tasks"]
    assert [item["split"] for item in records].count("final") == 6
    assert [item["split"] for item in records].count("held-out") == 2
    assert validate_tasks(tmp_path, strict=True) == []


def test_strict_lint_rejects_stale_or_hand_entered_evidence(tmp_path):
    spec = SelectionSpec("M1", pilot_seed=3, final_seed=4, count=2)
    select_tasks(tmp_path, spec)
    task_path = tmp_path / "T01.json"
    task = json.loads(task_path.read_text(encoding="utf-8"))
    task["expected_verdict"] = (
        "invalid" if task["expected_verdict"] != "invalid" else "valid"
    )
    task["canonical_hash"] = "wrong"
    task["expected_certificate"] = {"hand_entered": True}
    task_path.write_text(json.dumps(task), encoding="utf-8")
    errors = validate_tasks(tmp_path, strict=True)
    assert any("expected_verdict is not oracle-derived" in error for error in errors)
    assert any("expected_certificate is stale" in error for error in errors)
    assert any("canonical_hash is stale" in error for error in errors)
