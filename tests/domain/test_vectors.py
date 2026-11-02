"""The ten textbook cases must pass under BOTH checkers before anything else is built."""
import pytest

from evalkit.domain.history import parse
from evalkit.domain.oracle import reference, rules
from tests.domain.vectors import V


def H(name):
    return parse(V[name])


def edge_set(cycle):
    return {(e["from"], e["to"], e["edge"], e["key"]) for e in cycle}


# ---- M1: snapshot isolation -------------------------------------------------
def test_v1_write_skew_valid_under_si():
    r = rules.check(H("V1_timed"), "M1")
    assert r["verdict"] == "valid"
    assert r["reads_from"] == {"T1.op1": "init", "T2.op1": "init"}


def test_v2_lost_update_first_committer_wins():
    r = rules.check(H("V2_timed"), "M1")
    assert r["verdict"] == "invalid"
    v = [x for x in r["violations"] if x["rule"] == "first-committer-wins"]
    assert v and set(v[0]["txns"]) == {"T1", "T2"} and v[0]["key"] == "x"


def test_v3_read_skew_snapshot_read():
    r = rules.check(H("V3_timed"), "M1")
    assert r["verdict"] == "invalid"
    v = r["violations"][0]
    assert (v["rule"], v["txn"], v["op"], v["expected_source"], v["expected"], v["observed"]) == (
        "snapshot-read", "T1", 2, "init", 0, 2)
    assert v["name"] == "snapshot-read"


def test_v4_stale_looking_read_valid_under_si():
    r = rules.check(H("V4_timed"), "M1")
    assert r["verdict"] == "valid" and r["reads_from"] == {"T2.op1": "init"}


def test_v5_aborted_read_si():
    r = rules.check(H("V5_timed"), "M1")
    v = r["violations"][0]
    assert r["verdict"] == "invalid" and v["rule"] == "snapshot-read" and v["name"] == "aborted-read"
    assert (v["txn"], v["op"], v["expected"], v["observed"]) == ("T2", 1, 0, 1)


def test_v6_intermediate_read_si():
    r = rules.check(H("V6_timed"), "M1")
    v = r["violations"][0]
    assert r["verdict"] == "invalid" and v["name"] == "intermediate-read"
    assert (v["expected_source"], v["expected"], v["observed"]) == ("T1", 2, 1)


def test_v9_own_write():
    assert rules.check(H("V9_timed"), "M1")["verdict"] == "valid"
    assert rules.check(H("V9_timed"), "M1")["reads_from"] == {}
    r = rules.check(H("V9_broken"), "M1")
    assert r["verdict"] == "invalid"
    v = r["violations"][0]
    assert (v["rule"], v["txn"], v["op"], v["expected"]) == ("own-write", "T1", 2, 1)


def test_v10_adjacent_timestamps_no_conflict():
    r = rules.check(H("V10_timed"), "M1")
    assert r["verdict"] == "valid" and r["reads_from"] == {"T2.op1": "T1"}


# ---- M2: serializability ------------------------------------------------------
def test_v1_write_skew_not_serializable():
    r = rules.check(H("V1_ordered"), "M2")
    assert r["verdict"] == "invalid" and r["anomaly"] == "G2-item"
    assert edge_set(r["cycle"]) == {("T1", "T2", "rw", "x"), ("T2", "T1", "rw", "y")}


def test_v2_lost_update_cycle():
    r = rules.check(H("V2_ordered"), "M2")
    assert r["verdict"] == "invalid" and r["anomaly"] == "G-single"
    assert edge_set(r["cycle"]) == {("T1", "T2", "ww", "x"), ("T2", "T1", "rw", "x")}


def test_v3_read_skew_cycle():
    r = rules.check(H("V3_ordered"), "M2")
    assert r["verdict"] == "invalid" and r["anomaly"] == "G-single"
    assert edge_set(r["cycle"]) == {("T1", "T2", "rw", "x"), ("T2", "T1", "wr", "y")}


def test_v4_serializable_not_strict():
    r = rules.check(H("V4_ordered"), "M2")
    assert r["verdict"] == "valid" and r["serial_order"] == ["T2", "T1"]


def test_v5_g1a():
    r = rules.check(H("V5_ordered"), "M2")
    v = r["violations"][0]
    assert r["verdict"] == "invalid" and (v["rule"], v["reader"], v["writer"], v["key"]) == ("aborted-read", "T2", "T1", "x")


def test_v6_g1b():
    r = rules.check(H("V6_ordered"), "M2")
    v = r["violations"][0]
    assert r["verdict"] == "invalid" and (v["rule"], v["reader"], v["writer"], v["key"]) == ("intermediate-read", "T2", "T1", "x")


# ---- M3: in-doubt transactions -----------------------------------------------------
def test_v7_undetermined():
    r = rules.check(H("V7_timed"), "M3")
    assert r["verdict"] == "undetermined"
    by = {tuple(c["committed"]): c["verdict"] for c in r["completions"]}
    assert by == {("T1",): "valid", (): "invalid"}


def test_v8_cannot_matter():
    r = rules.check(H("V8_timed"), "M3")
    assert r["verdict"] == "valid" and len(r["completions"]) == 2


# ---- the independent reference agrees on every vector -------------------------------------
@pytest.mark.parametrize(
    "name,module,expected",
    [
        ("V1_timed", "M1", "valid"), ("V2_timed", "M1", "invalid"), ("V3_timed", "M1", "invalid"),
        ("V4_timed", "M1", "valid"), ("V5_timed", "M1", "invalid"), ("V6_timed", "M1", "invalid"),
        ("V9_timed", "M1", "valid"), ("V9_broken", "M1", "invalid"), ("V10_timed", "M1", "valid"),
        ("V1_ordered", "M2", "invalid"), ("V2_ordered", "M2", "invalid"), ("V3_ordered", "M2", "invalid"),
        ("V4_ordered", "M2", "valid"), ("V5_ordered", "M2", "invalid"), ("V6_ordered", "M2", "invalid"),
        ("V7_timed", "M3", "undetermined"), ("V8_timed", "M3", "valid"),
    ],
)
def test_reference_agrees_with_vectors(name, module, expected):
    assert reference.ref_verdict(H(name), module) == expected
    assert rules.check(H(name), module)["verdict"] == expected
