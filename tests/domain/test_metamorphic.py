"""Verdicts must not change under meaning-preserving rewrites of a history."""
import random

import pytest

from evalkit.domain.fuzz import random_history
from evalkit.domain.history import History, Op, Txn, validate
from evalkit.domain.oracle import reference, rules

N = 400


def rename(h: History) -> History:
    tmap = {t.id: f"Q{i * 7 + 3}" for i, t in enumerate(h.txns)}
    kmap = {k: f"key{i}" for i, k in enumerate(h.keys)}
    f = lambda v: 5 * v + 11
    txns = [Txn(tmap[t.id], tuple(Op(o.kind, kmap[o.key], f(o.value)) for o in t.ops), t.outcome, t.start, t.end) for t in h.txns]
    return History(h.form, tuple(kmap[k] for k in h.keys), {kmap[k]: f(v) for k, v in h.initial.items()}, tuple(txns))


def stretch(h: History) -> History:
    g = lambda t: None if t is None else 3 * t + 5
    return h.replace_txns([Txn(t.id, t.ops, t.outcome, g(t.start), g(t.end)) for t in h.txns])


def shuffle_lines(h: History, rng) -> History:
    if h.form != "timed":
        return h
    txns = list(h.txns)
    rng.shuffle(txns)
    return h.replace_txns(txns)


def drop_unread_aborted(h: History) -> History:
    read = {(o.key, o.value) for t in h.txns for o in t.ops if o.kind == "r"}
    keep = [t for t in h.txns if not (t.outcome == "abort" and not any((o.key, o.value) in read for o in t.ops if o.kind == "w"))]
    return h.replace_txns(keep) if keep else h


def add_fresh_key(h: History) -> History:
    top = max([t.end for t in h.txns if t.end is not None] or [0])
    ops = (Op("r", "zz", 0), Op("w", "zz", 1))
    if h.form == "timed":
        top = max(max(t.start, t.end) for t in h.txns)
        extra = Txn("TZ", ops, "commit", top + 1, top + 2)
    else:
        extra = Txn("TZ", ops, "commit", None, top + 1)
    return History(h.form, h.keys + ("zz",), {**h.initial, "zz": 0}, h.txns + (extra,))


TRANSFORMS = [
    ("rename", lambda h, rng: rename(h)),
    ("stretch", lambda h, rng: stretch(h)),
    ("shuffle", shuffle_lines),
    ("drop_unread_aborted", lambda h, rng: drop_unread_aborted(h)),
    ("add_fresh_key", lambda h, rng: add_fresh_key(h)),
]


@pytest.mark.parametrize("module", ["M1", "M2", "M3"])
@pytest.mark.parametrize("name,fn", TRANSFORMS, ids=[n for n, _ in TRANSFORMS])
def test_verdict_invariant(module, name, fn):
    rng = random.Random(7)
    for _ in range(N):
        h = random_history(rng, module)
        h2 = fn(h, rng)
        validate(h2)
        assert rules.check(h, module)["verdict"] == rules.check(h2, module)["verdict"], name
        assert reference.ref_verdict(h, module) == reference.ref_verdict(h2, module), name


def test_restoring_the_offending_read_makes_si_history_valid():
    """Controlled change: fix the first snapshot-read violation and the history becomes valid
    (unless another violation remains, in which case a different one is reported)."""
    rng = random.Random(11)
    fixed = 0
    for _ in range(600):
        h = random_history(rng, "M1")
        r = rules.check(h, "M1")
        reads_only = [v for v in r["violations"] if v["rule"] == "snapshot-read"]
        if r["verdict"] == "valid" or len(r["violations"]) != 1 or len(reads_only) != 1:
            continue
        v = reads_only[0]
        t = h.txn(v["txn"])
        ops = list(t.ops)
        o = ops[v["op"] - 1]
        ops[v["op"] - 1] = Op("r", o.key, v["expected"])
        h2 = h.replace_txns([Txn(t.id, tuple(ops), t.outcome, t.start, t.end) if x.id == t.id else x for x in h.txns])
        assert rules.check(h2, "M1")["verdict"] == "valid"
        assert reference.ref_verdict(h2, "M1") == "valid"
        fixed += 1
    assert fixed > 30
