"""Deterministic, certificate-aware grading for transaction-history answers."""
from __future__ import annotations

import json
import re
from itertools import product

from .domain.history import parse
from .domain.linearizability import parse_register
from .domain.oracle import rules
from .domain.oracle.m4 import validate_linearization
from .domain.strict_serializability import verify_certificate as verify_m5_certificate

CRITICAL = {"verdict", "certificate"}


def extract_answer(text: str) -> dict | None:
    blocks = re.findall(r"```(?:json)?\s*(\{.*?\})\s*```", text, flags=re.S | re.I)
    candidates = list(reversed(blocks))
    if not candidates:
        decoder = json.JSONDecoder()
        candidates = []
        for index, character in enumerate(text):
            if character == "{":
                try:
                    value, _ = decoder.raw_decode(text[index:])
                except json.JSONDecodeError:
                    continue
                candidates.append(value)
    for candidate in candidates:
        try:
            value = json.loads(candidate) if isinstance(candidate, str) else candidate
        except json.JSONDecodeError:
            continue
        if isinstance(value, dict) and isinstance(value.get("verdict"), str):
            return value
    return None


def _m1_certificate(history, answer, oracle) -> bool:
    if answer.get("verdict") == "valid":
        return answer.get("reads_from") == oracle.get("reads_from", {})
    violation = answer.get("violation")
    if not isinstance(violation, dict):
        violation = (answer.get("violations") or [None])[0]
    if not isinstance(violation, dict):
        return False
    if violation.get("rule") == "first-committer-wins":
        txns = violation.get("txns", [])
        if len(txns) != 2:
            return False
        a, b = (history.txn(tid) for tid in txns)
        key = violation.get("key")
        return bool(key and key in a.write_keys() & b.write_keys()
                    and a.outcome == b.outcome == "commit"
                    and a.start < b.end and b.start < a.end)
    if violation.get("rule") in {"snapshot-read", "own-write"}:
        txn = history.txn(violation.get("txn", ""))
        op = violation.get("op")
        if not isinstance(op, int) or not 1 <= op <= len(txn.ops):
            return False
        actual = txn.ops[op - 1]
        if actual.kind != "r":
            return False
        if violation["rule"] == "own-write":
            prior = [x for x in txn.ops[:op - 1] if x.kind == "w" and x.key == actual.key]
            return bool(prior and actual.value != prior[-1].value)
        source, expected = rules.snapshot_source(history, txn, actual.key)
        return (violation.get("expected_source") == source
                and actual.value != expected)
    return False


def _m2_certificate(history, answer, oracle) -> bool:
    if answer.get("verdict") == "valid":
        order = answer.get("serial_order")
        edges = oracle.get("edges", [])
        committed = [t.id for t in history.txns if t.outcome == "commit"]
        return (isinstance(order, list)
                and set(order) == set(committed)
                and len(order) == len(set(order))
                and all(order.index(edge["from"]) < order.index(edge["to"]) for edge in edges))
    violation = answer.get("violation")
    if not violation and isinstance(answer.get("violations"), list):
        claimed = answer["violations"]
        actual = oracle.get("violations", [])
        return claimed == actual
    if isinstance(violation, dict) and violation.get("rule") in {"aborted-read", "intermediate-read"}:
        return any(all(violation.get(k) == item.get(k) for k in ("rule", "reader", "writer", "key"))
                   for item in oracle.get("violations", []))
    cycle = answer.get("cycle")
    if not isinstance(cycle, list) or not cycle:
        cycle = oracle.get("cycle")
    if not isinstance(cycle, list) or not cycle:
        return False
    edges = {(e["from"], e["to"], e["edge"], e["key"]) for e in oracle.get("edges", [])}
    claimed = [(e.get("from"), e.get("to"), e.get("edge"), e.get("key")) for e in cycle]
    return all(edge in edges for edge in claimed) and all(
        claimed[i][1] == claimed[(i + 1) % len(claimed)][0] for i in range(len(claimed))
    )


def _m3_certificate(history, answer) -> bool:
    rows = answer.get("completions")
    prepared = [t.id for t in history.txns if t.outcome == "prepared"]
    if not isinstance(rows, list) or len(rows) != 2 ** len(prepared):
        return False
    seen = set()
    for row in rows:
        committed = tuple(sorted(row.get("committed", [])))
        aborted = tuple(sorted(row.get("aborted", [])))
        if set(committed) | set(aborted) != set(prepared) or set(committed) & set(aborted):
            return False
        key = (committed, aborted)
        if key in seen:
            return False
        seen.add(key)
        resolved = rules.resolve(history, {tid: "commit" if tid in committed else "abort" for tid in prepared})
        if row.get("verdict") != rules.check(resolved, "M1")["verdict"]:
            return False
    verdicts = {row["verdict"] for row in rows}
    return answer.get("verdict") == (verdicts.pop() if len(verdicts) == 1 else "undetermined")


def _m4_certificate(history, answer, oracle) -> bool:
    if answer.get("verdict") == "valid":
        order = answer.get("linearization", answer.get("order"))
        return isinstance(order, list) and validate_linearization(history, order)
    violation = answer.get("violation")
    if not isinstance(violation, dict):
        return False
    expected = oracle.get("violation", {})
    return (
        violation.get("reason") == expected.get("reason")
        and sorted(violation.get("operations", [])) == sorted(expected.get("operations", []))
    )


def _m5_certificate(history, answer, expected: str) -> bool:
    if expected == "valid":
        certificate = answer.get("certificate", {})
        return verify_m5_certificate(history, {
            "module": "M5",
            "verdict": answer.get("verdict"),
            "certificate": {"serial_order": answer.get(
                "serial_order", certificate.get("serial_order")
            )},
        })
    return answer.get("verdict") == "invalid" and (
        answer.get("certificate", {}).get("kind") == "no-strict-serial-order"
        or answer.get("reason") == "no-strict-serial-order"
    )


CRITERION_WEIGHTS = {
    "verdict": 0.4,
    "certificate": 0.4,
    "naming": 0.1,
    "completeness": 0.1,
}


def grade(text: str, history_text: str, module: str, expected: str | None = None) -> dict:
    answer = extract_answer(text)
    module = module.upper()
    history = parse_register(history_text) if module == "M4" else parse(history_text)
    if module == "M5":
        from .domain.strict_serializability import check as m5_check
        oracle = m5_check(history, "rules")
    else:
        oracle = rules.check(history, module)
    expected = expected or oracle["verdict"]
    criteria = {"verdict": bool(answer and answer.get("verdict") == expected),
                "certificate": False, "naming": True, "completeness": True}
    if answer:
        if module == "M1":
            criteria["certificate"] = _m1_certificate(history, answer, oracle)
        elif module == "M2":
            criteria["certificate"] = _m2_certificate(history, answer, oracle)
        elif module == "M3":
            criteria["certificate"] = _m3_certificate(history, answer)
            criteria["completeness"] = criteria["certificate"]
        elif module == "M4":
            criteria["certificate"] = _m4_certificate(history, answer, oracle)
            criteria["completeness"] = criteria["certificate"]
        elif module == "M5":
            criteria["certificate"] = _m5_certificate(history, answer, expected)
            criteria["completeness"] = criteria["certificate"]
        if module == "M2" and answer.get("anomaly") and oracle.get("anomaly"):
            criteria["naming"] = answer["anomaly"] == oracle["anomaly"]
    score = sum(CRITERION_WEIGHTS[key] * int(value) for key, value in criteria.items())
    passed = criteria["verdict"] and criteria["certificate"] and criteria["completeness"]
    return {"score": score, "passed": passed, "grader_method": "deterministic-certificate-v2",
            "criterion_weights": CRITERION_WEIGHTS,
            "criteria": criteria, "observed_verdict": answer.get("verdict") if answer else None,
            "expected_verdict": expected,
            "reason": "all critical criteria passed" if passed else "certificate or verdict failed"}
