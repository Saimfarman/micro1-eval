"""Conservative, machine-derived failure taxonomy for model attempts."""
from __future__ import annotations


def classify_failure(record: dict, grade: dict) -> dict:
    """Classify observable grader failures without claiming human review."""
    if not record.get("response_text", "").strip():
        tag, suggestion = "empty-response", "Return one final JSON answer."
    elif grade.get("observed_verdict") is None:
        tag, suggestion = "format-error", "Return one parseable JSON object in the required format."
    elif not grade["criteria"].get("verdict"):
        tag, suggestion = "wrong-verdict", "Recheck the formal module definition."
    elif not grade["criteria"].get("certificate"):
        tag, suggestion = "invalid-certificate", "Provide a certificate derived from the history."
    elif not grade["criteria"].get("completeness"):
        tag, suggestion = "incomplete-certificate", "Include every required certificate item."
    else:
        tag, suggestion = "other-grader-failure", "Inspect the raw attempt and grader details."
    return {
        "tag": tag,
        "suggestion": suggestion,
        "attempt_key": record.get("attempt_key"),
        "human_review": {"status": "not_reviewed", "reviewed": False},
    }


def analyze_failures(root, grades: list[dict]) -> list[dict]:
    import json
    from pathlib import Path

    output = []
    for grade in grades:
        if grade.get("passed"):
            continue
        raw = next(
            (json.loads(path.read_text(encoding="utf-8"))
             for path in Path(root).glob(f"results/runs/*/raw/*.json")
             if json.loads(path.read_text(encoding="utf-8")).get("attempt_key") == grade.get("attempt_key")),
            {},
        )
        output.append(classify_failure(raw, grade))
    return output
