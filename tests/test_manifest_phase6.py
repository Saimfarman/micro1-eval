import json

from evalkit.manifest import verify_manifest, write_manifest
from evalkit.runner import run


def test_manifest_covers_dependencies_and_detects_tampering(tmp_path):
    source = __import__("pathlib").Path("tasks/T01.json")
    (tmp_path / "tasks").mkdir()
    (tmp_path / "tasks/T01.json").write_bytes(source.read_bytes())
    (tmp_path / "models.yaml").write_text("models:\n", encoding="utf-8")
    run(tmp_path, provider="mock", run_id="manifest-test")
    write_manifest(tmp_path)
    assert verify_manifest(tmp_path) == []
    (tmp_path / "models.yaml").write_text("changed", encoding="utf-8")
    assert any("models.yaml" in error for error in verify_manifest(tmp_path))
