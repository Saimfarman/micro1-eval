import json

from evalkit.tasks import (
    create_m4_frozen_tasks,
    generate_tasks,
    validate_tasks,
)


def test_generated_m4_tasks_are_oracle_derived(tmp_path):
    paths = generate_tasks(tmp_path, "M4", 6, 90210)
    assert len(paths) == 6
    assert validate_tasks(tmp_path) == []
    records = [json.loads(path.read_text(encoding="utf-8")) for path in paths]
    assert {record["provenance"]["seed"] for record in records} == {90210}
    assert all(record["module"] == "M4" for record in records)


def test_frozen_m4_pair_has_matched_relationship(tmp_path):
    create_m4_frozen_tasks(tmp_path)
    assert validate_tasks(tmp_path) == []
    control = json.loads((tmp_path / "C18.json").read_text(encoding="utf-8"))
    assert control["control_relationship"] == {"kind": "matched", "paired_with": "T10"}
