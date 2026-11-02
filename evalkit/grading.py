"""Small deterministic grader used by both live runs and replay."""
from __future__ import annotations
import json
import re

def extract_answer(text: str) -> dict | None:
    blocks = re.findall(r"```(?:json)?\s*(\{.*?\})\s*```", text, flags=re.S | re.I)
    for candidate in blocks or [text]:
        try:
            value = json.loads(candidate)
        except json.JSONDecodeError:
            continue
        if isinstance(value, dict) and isinstance(value.get("verdict"), str):
            return value
    return None

def grade(text: str, expected: str) -> dict:
    answer = extract_answer(text)
    passed = answer is not None and answer.get("verdict", "").lower() == expected
    return {"score": int(passed), "passed": passed, "grader_method": "deterministic-verdict",
            "observed_verdict": answer.get("verdict") if answer else None,
            "expected_verdict": expected,
            "reason": "verdict matches oracle" if passed else "missing or incorrect verdict"}
