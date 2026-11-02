"""Checker O1: the slow, obviously-correct reference.

Deliberately different from rules.py (it must NOT import it):
  * snapshot isolation is checked by replaying events against a simulated multi-version store;
  * serializability is checked by searching for a serial order that reproduces every read
    and keeps each key's writers in commit order (no graphs, no edges).
It only returns a verdict string, which is what the differential tests compare.
"""
from __future__ import annotations

from itertools import product

from ..history import History, HistoryError


def ref_si_valid(h: History) -> bool:
    if h.form != "timed":
        raise HistoryError("timed history required")
    events = []
    for t in h.txns:
        if t.outcome == "prepared":
            raise HistoryError("resolve in-doubt transactions first")
        events.append((t.start, "start", t))
        events.append((t.end, "commit" if t.outcome == "commit" else "abort", t))
    events.sort(key=lambda e: e[0])

    store = {k: h.initial[k] for k in h.keys}  # latest committed value per key
    snapshot, local, seq_at_start, commit_log = {}, {}, {}, []
    for _, kind, t in events:
        if kind == "start":
            snapshot[t.id] = dict(store)
            seq_at_start[t.id] = len(commit_log)
            mine = {}
            for op in t.ops:
                if op.kind == "w":
                    mine[op.key] = op.value
                else:
                    expected = mine[op.key] if op.key in mine else snapshot[t.id][op.key]
                    if t.outcome == "commit" and op.value != expected:
                        return False
            local[t.id] = mine
        elif kind == "commit":
            for other_id, other_keys in commit_log[seq_at_start[t.id]:]:
                if other_keys & set(local[t.id]):
                    return False
            for k, v in local[t.id].items():
                store[k] = v
            commit_log.append((t.id, set(local[t.id])))
    return True


def ref_ser_valid(h: History) -> bool:
    if h.form != "ordered":
        raise HistoryError("ordered history required")
    committed = [t for t in h.txns if t.outcome == "commit"]
    committed.sort(key=lambda t: t.end)
    writers = {k: [t.id for t in committed if k in t.write_keys()] for k in h.keys}
    next_idx = {k: 0 for k in h.keys}

    def reads_ok(t, store):
        mine = {}
        for op in t.ops:
            if op.kind == "w":
                mine[op.key] = op.value
            else:
                expected = mine[op.key] if op.key in mine else store[op.key]
                if op.value != expected:
                    return None
        return mine

    def search(remaining, store):
        if not remaining:
            return True
        for t in remaining:
            if any(writers[k][next_idx[k]] != t.id for k in t.write_keys()):
                continue  # this transaction is not next in line for some key it writes
            mine = reads_ok(t, store)
            if mine is None:
                continue
            for k in mine:
                next_idx[k] += 1
            new_store = dict(store)
            new_store.update(mine)
            rest = [x for x in remaining if x is not t]
            if search(rest, new_store):
                return True
            for k in mine:
                next_idx[k] -= 1
        return False

    return search(committed, {k: h.initial[k] for k in h.keys})


def _resolved(h: History, assignment: dict) -> History:
    from ..history import Txn

    txns = []
    for t in h.txns:
        if t.outcome == "prepared":
            txns.append(Txn(t.id, t.ops, assignment[t.id], t.start, t.end))
        else:
            txns.append(t)
    return h.replace_txns(txns)


def ref_verdict(h: History, module: str) -> str:
    module = module.upper()
    if module == "M1":
        return "valid" if ref_si_valid(h) else "invalid"
    if module == "M2":
        return "valid" if ref_ser_valid(h) else "invalid"
    if module == "M3":
        ids = [t.id for t in h.txns if t.outcome == "prepared"]
        results = set()
        for combo in product(("commit", "abort"), repeat=len(ids)):
            results.add("valid" if ref_si_valid(_resolved(h, dict(zip(ids, combo)))) else "invalid")
        return results.pop() if len(results) == 1 else "undetermined"
    raise ValueError(f"unknown module {module!r}")
