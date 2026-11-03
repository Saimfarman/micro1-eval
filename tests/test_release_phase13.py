from pathlib import Path

from evalkit.cli import _release_checks


def test_release_checks_reject_root_env_file(tmp_path, monkeypatch):
    monkeypatch.setattr("evalkit.cli.ROOT", tmp_path)
    (tmp_path / ".env").write_text("API_KEY=not-for-commit\n", encoding="utf-8")
    (tmp_path / "tasks").mkdir()
    errors = _release_checks()
    assert ".env must not be present in a release checkout" in errors


def test_release_checks_require_generated_frontend_assets(tmp_path, monkeypatch):
    monkeypatch.setattr("evalkit.cli.ROOT", tmp_path)
    (tmp_path / "tasks").mkdir()
    errors = _release_checks()
    assert "frontend/dist is missing generated assets" in errors


def test_clean_room_does_not_require_video_url(tmp_path, monkeypatch):
    monkeypatch.setattr("evalkit.cli.ROOT", tmp_path)
    (tmp_path / "tasks").mkdir()
    errors = _release_checks(clean_room=True)
    assert "README.md has no public video URL for clean-room release" not in errors
