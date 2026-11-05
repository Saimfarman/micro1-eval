"""Random history generators used by the differential and metamorphic tests.

Valid histories are produced by simulating a database; faults are then injected with
probability `fault`. Labels always come from the checkers, never from the injected fault.
"""

from __future__ import annotations

import random

from .history import History, Op, Txn, validate


def _keys(nkeys: int):
    return [chr(ord("x") + i) for i in range(nkeys)]


def _plan(rng: random.Random, keys, counters, max_ops):
    ops = []
    for _ in range(rng.randint(1, max_ops)):
        k = rng.choice(keys)
        if rng.random() < 0.5:
            counters[k] += 1
            ops.append(["w", k, counters[k]])
        else:
            ops.append(["r", k, None])
    return ops


def _fault_read(rng, txns, keys, initial):
    reads = [
        (ti, oi)
        for ti, t in enumerate(txns)
        if t.outcome != "abort"
        for oi, o in enumerate(t.ops)
        if o.kind == "r"
    ]
    if not reads:
        return txns
    ti, oi = rng.choice(reads)
    t = txns[ti]
    o = t.ops[oi]
    values = {initial[o.key]}
    for u in txns:
        values.update(u.writes(o.key))
    own = set(
        t.writes(o.key)
    )  # a read must never be made to return the reader's own later write
    choices = sorted(v for v in values if v != o.value and v not in own)
    if not choices:
        return txns
    ops = list(t.ops)
    ops[oi] = Op("r", o.key, rng.choice(choices))
    new = list(txns)
    new[ti] = Txn(t.id, tuple(ops), t.outcome, t.start, t.end)
    return new


def gen_timed(
    rng: random.Random, n=4, nkeys=2, fault=0.5, p_abort=0.15, p_prepared=0.0, max_ops=3
) -> History:
    keys = _keys(nkeys)
    initial = {k: 0 for k in keys}
    counters = {k: 0 for k in keys}
    plan = [_plan(rng, keys, counters, max_ops) for _ in range(n)]
    remaining, active, events, t = list(range(n)), [], [], 0
    while remaining or active:
        t += rng.randint(1, 2)
        if remaining and (not active or rng.random() < 0.5):
            i = rng.choice(remaining)
            remaining.remove(i)
            active.append(i)
            events.append((t, "start", i))
        else:
            i = rng.choice(active)
            active.remove(i)
            events.append((t, "end", i))
    store = dict(initial)
    snap, mine_of, seq0, log = {}, {}, {}, []
    start_ts, end_ts, outcome, ops_of = {}, {}, {}, {}
    for ts, kind, i in events:
        if kind == "start":
            snap[i], mine, seq0[i] = dict(store), {}, len(log)
            start_ts[i] = ts
            ops = []
            for k_, key, val in plan[i]:
                if k_ == "w":
                    mine[key] = val
                    ops.append(Op("w", key, val))
                else:
                    ops.append(Op("r", key, mine[key] if key in mine else snap[i][key]))
            ops_of[i], mine_of[i] = ops, mine
        else:
            end_ts[i] = ts
            conflict = any(ks & set(mine_of[i]) for _, ks in log[seq0[i] :])
            if rng.random() < p_abort or (conflict and rng.random() >= fault):
                outcome[i] = "abort"
            else:
                outcome[i] = "commit"
                store.update(mine_of[i])
                log.append((i, set(mine_of[i])))
    txns = [
        Txn(f"T{i + 1}", tuple(ops_of[i]), outcome[i], start_ts[i], end_ts[i])
        for i in range(n)
    ]
    if rng.random() < fault:
        txns = _fault_read(rng, txns, keys, initial)
    if p_prepared:
        idx = [i for i in range(n) if rng.random() < p_prepared][:2]
        if not idx:
            idx = [rng.randrange(n)]
        for i in idx:
            x = txns[i]
            txns[i] = Txn(x.id, x.ops, "prepared", x.start, x.end)
    h = History("timed", tuple(keys), initial, tuple(txns))
    validate(h)
    return h


def gen_ordered(
    rng: random.Random, n=4, nkeys=2, fault=0.5, p_abort=0.15, max_ops=3
) -> History:
    keys = _keys(nkeys)
    initial = {k: 0 for k in keys}
    counters = {k: 0 for k in keys}
    plan = [_plan(rng, keys, counters, max_ops) for _ in range(n)]
    serial = list(range(n))
    rng.shuffle(serial)
    store, ops_of, outcome = dict(initial), {}, {}
    for i in serial:
        mine, ops = {}, []
        for k_, key, val in plan[i]:
            if k_ == "w":
                mine[key] = val
                ops.append(Op("w", key, val))
            else:
                ops.append(Op("r", key, mine[key] if key in mine else store[key]))
        ops_of[i] = ops
        if rng.random() < p_abort:
            outcome[i] = "abort"
        else:
            outcome[i] = "commit"
            store.update(mine)
    com = [i for i in serial if outcome[i] == "commit"]
    wk = {i: {o.key for o in ops_of[i] if o.kind == "w"} for i in range(n)}
    for _ in range(rng.randint(0, 2 * n)):
        if len(com) > 1:
            j = rng.randrange(len(com) - 1)
            if not (wk[com[j]] & wk[com[j + 1]]):
                com[j], com[j + 1] = com[j + 1], com[j]
    if len(com) > 1 and rng.random() < fault / 2:
        j = rng.randrange(len(com) - 1)
        com[j], com[j + 1] = (
            com[j + 1],
            com[j],
        )  # may reorder writers of one key: a fault
    ts, c = {}, 0
    for i in com:
        c += rng.randint(1, 3)
        ts[i] = c
    rows = [Txn(f"T{i + 1}", tuple(ops_of[i]), "commit", None, ts[i]) for i in com]
    for i in range(n):
        if outcome[i] == "abort":
            rows.insert(
                rng.randint(0, len(rows)), Txn(f"T{i + 1}", tuple(ops_of[i]), "abort")
            )
    if rng.random() < fault:
        rows = _fault_read(rng, rows, keys, initial)
    h = History("ordered", tuple(keys), initial, tuple(rows))
    validate(h)
    return h


def random_history(
    rng: random.Random, module: str, n=None, nkeys=None, fault=0.5
) -> History:
    n = n or rng.randint(2, 6)
    nkeys = nkeys or rng.randint(1, 3)
    module = module.upper()
    if module == "M1":
        return gen_timed(rng, n, nkeys, fault)
    if module == "M2":
        return gen_ordered(rng, n, nkeys, fault)
    if module == "M3":
        return gen_timed(rng, n, nkeys, fault, p_prepared=0.35)
    raise ValueError(module)
