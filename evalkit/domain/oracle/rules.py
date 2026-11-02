"""Checker O2: applies the definitions in docs/MODELS.md directly.

D1  snapshot isolation on timed histories      -> check_si
D2  serializability on commit-ordered histories -> check_ser   (dependency graph)
D3  in-doubt (prepared) transactions            -> check_indoubt (all completions)

Every function returns plain dicts (JSON-friendly) with a verdict, a certificate
and a plain-English derivation. Nothing here calls a model or reads a file.
"""
from __future__ import annotations

from collections import deque
from itertools import product

from ..history import History, HistoryError, Txn
from ..linearizability import RegisterHistory
from .m4 import check as check_m4

EDGE_ORDER = {"ww": 0, "wr": 1, "rw": 2}


# ----------------------------------------------------------------------------
# helpers
# ----------------------------------------------------------------------------
def writer_of(h: History, key: str, value: int):
    """Who wrote this value on this key?

    Returns None (nobody), ("init", None, True) or ("txn", Txn, is_final_write).
    """
    if value == h.initial[key]:
        return ("init", None, True)
    for t in h.txns:
        if value in t.writes(key):
            return ("txn", t, t.final_write(key) == value)
    return None


def name_read(h: History, key: str, value: int) -> str:
    info = writer_of(h, key, value)
    if info is None or info[0] == "init":
        return "snapshot-read"
    _, w, final = info
    if w.outcome == "abort":
        return "aborted-read"
    if w.outcome == "commit" and not final:
        return "intermediate-read"
    return "snapshot-read"


def snapshot_source(h: History, reader: Txn, key: str):
    """D1(b): (source id or 'init', expected value) for a non-own read."""
    cands = [
        w
        for w in h.txns
        if w.outcome == "commit"
        and w.id != reader.id
        and key in w.write_keys()
        and w.end < reader.start
    ]
    if cands:
        w = max(cands, key=lambda x: x.end)
        return w.id, w.final_write(key)
    return "init", h.initial[key]


def _require(cond: bool, msg: str) -> None:
    if not cond:
        raise HistoryError(msg)


def _no_prepared(h: History) -> None:
    if any(t.outcome == "prepared" for t in h.txns):
        raise HistoryError("history has in-doubt transactions; use check_indoubt")


# ----------------------------------------------------------------------------
# D1: snapshot isolation
# ----------------------------------------------------------------------------
def check_si(h: History) -> dict:
    _require(h.form == "timed", "snapshot isolation needs a timed history")
    _no_prepared(h)
    committed = [t for t in h.txns if t.outcome == "commit"]
    reads_from, violations, steps = {}, [], []
    for t in committed:
        steps.append(f"{t.id} started at {t.start} and committed at {t.end}.")
        own = {}
        for i, op in enumerate(t.ops, 1):
            if op.kind == "w":
                own[op.key] = op.value
                continue
            if op.key in own:
                exp = own[op.key]
                ok = op.value == exp
                steps.append(
                    f"  op{i} r({op.key}): {t.id} wrote {op.key}={exp} earlier in the same "
                    f"transaction, so the read must return {exp}. Observed {op.value}: "
                    + ("matches." if ok else "VIOLATION (own-write).")
                )
                if not ok:
                    violations.append(
                        {"rule": "own-write", "txn": t.id, "op": i, "expected": exp, "observed": op.value}
                    )
                continue
            src, exp = snapshot_source(h, t, op.key)
            reads_from[f"{t.id}.op{i}"] = src
            where = "the initial value" if src == "init" else f"the version written by {src}"
            ok = op.value == exp
            steps.append(
                f"  op{i} r({op.key}): no earlier own write, so it reads the snapshot at start={t.start}. "
                f"Latest version of {op.key} committed before {t.start}: {where} ({exp}). "
                f"Observed {op.value}: " + ("matches." if ok else "VIOLATION (snapshot-read).")
            )
            if not ok:
                violations.append(
                    {
                        "rule": "snapshot-read",
                        "txn": t.id,
                        "op": i,
                        "expected_source": src,
                        "expected": exp,
                        "observed": op.value,
                        "name": name_read(h, op.key, op.value),
                    }
                )
    conflicts = []
    for a_i in range(len(committed)):
        for b_i in range(a_i + 1, len(committed)):
            a, b = committed[a_i], committed[b_i]
            common = sorted(a.write_keys() & b.write_keys())
            if common and a.start < b.end and b.start < a.end:
                conflicts.append((a, b, common[0]))
                violations.append(
                    {"rule": "first-committer-wins", "txns": [a.id, b.id], "key": common[0]}
                )
    if conflicts:
        for a, b, k in conflicts:
            steps.append(
                f"{a.id} [{a.start},{a.end}] and {b.id} [{b.start},{b.end}] overlap and both write {k}: "
                "VIOLATION (first-committer-wins)."
            )
    else:
        steps.append("No two overlapping committed transactions write a common key (first-committer-wins holds).")
    verdict = "invalid" if violations else "valid"
    steps.append(
        "Conclusion: valid under snapshot isolation."
        if verdict == "valid"
        else "Conclusion: NOT valid under snapshot isolation. First violation: "
        + _describe_violation(violations[0])
    )
    return {
        "module": "M1",
        "verdict": verdict,
        "reads_from": reads_from,
        "violations": violations,
        "derivation": [f"{n}. {s}" if not s.startswith("  ") else s for n, s in _number(steps)],
    }


def _number(steps):
    n = 0
    for s in steps:
        if s.startswith("  "):
            yield n, s
        else:
            n += 1
            yield n, s


def _describe_violation(v: dict) -> str:
    r = v["rule"]
    if r == "first-committer-wins":
        return f"{v['txns'][0]} and {v['txns'][1]} are concurrent writers of {v['key']}."
    if r in ("snapshot-read", "own-write"):
        return f"{v['txn']}.op{v['op']} expected {v['expected']} but observed {v['observed']} ({v.get('name', r)})."
    return str(v)


# ----------------------------------------------------------------------------
# D2: serializability (dependency graph)
# ----------------------------------------------------------------------------
def build_graph(h: History) -> dict:
    """Return versions, edges and read-level violations for a commit-ordered history."""
    _require(h.form == "ordered", "serializability needs a commit-ordered history")
    committed = [t for t in h.txns if t.outcome == "commit"]
    versions = {k: ["init"] + [t.id for t in committed if k in t.write_keys()] for k in h.keys}
    edges, violations, seen = [], [], set()

    def add(frm, to, kind, key):
        sig = (frm, to, kind, key)
        if frm != to and sig not in seen:
            seen.add(sig)
            edges.append({"from": frm, "to": to, "edge": kind, "key": key})

    for k in h.keys:
        chain = versions[k]
        for j in range(1, len(chain) - 1):
            add(chain[j], chain[j + 1], "ww", k)
    for t in committed:
        own = {}
        for i, op in enumerate(t.ops, 1):
            if op.kind == "w":
                own[op.key] = op.value
                continue
            if op.key in own:
                if op.value != own[op.key]:
                    violations.append(
                        {"rule": "own-write", "txn": t.id, "op": i, "expected": own[op.key], "observed": op.value}
                    )
                continue
            info = writer_of(h, op.key, op.value)
            if info is None or (info[0] == "txn" and info[1].id == t.id):
                violations.append(
                    {"rule": "unwritten-value", "reader": t.id, "op": i, "key": op.key, "observed": op.value}
                )
                continue
            kind, w, final = info
            if kind == "init":
                j = 0
            elif w.outcome == "abort":
                violations.append({"rule": "aborted-read", "reader": t.id, "writer": w.id, "key": op.key, "op": i})
                continue
            elif not final:
                violations.append({"rule": "intermediate-read", "reader": t.id, "writer": w.id, "key": op.key, "op": i})
                continue
            else:
                j = versions[op.key].index(w.id)
                add(w.id, t.id, "wr", op.key)
            if j + 1 < len(versions[op.key]):
                add(t.id, versions[op.key][j + 1], "rw", op.key)
    return {"committed": [t.id for t in committed], "versions": versions, "edges": edges, "violations": violations}


def shortest_cycle(nodes, edges):
    pos = {n: i for i, n in enumerate(nodes)}
    adj = {n: [] for n in nodes}
    for e in edges:
        adj[e["from"]].append(e)
    for n in nodes:
        adj[n].sort(key=lambda e: (pos[e["to"]], EDGE_ORDER[e["edge"]], e["key"]))
    best = None
    for s in nodes:
        parent = {}
        seen = {s}
        q = deque([s])
        found = None
        while q and found is None:
            u = q.popleft()
            for e in adj[u]:
                if e["to"] == s:
                    found = (u, e)
                    break
                if e["to"] not in seen:
                    seen.add(e["to"])
                    parent[e["to"]] = e
                    q.append(e["to"])
        if found:
            u, closing = found
            path = [closing]
            while u != s:
                pe = parent[u]
                path.append(pe)
                u = pe["from"]
            path.reverse()
            if best is None or len(path) < len(best):
                best = path
    return best


def classify_cycle(cycle) -> str:
    rw = sum(1 for e in cycle if e["edge"] == "rw")
    return "G1c" if rw == 0 else ("G-single" if rw == 1 else "G2-item")


def topological_order(nodes, edges):
    pos = {n: i for i, n in enumerate(nodes)}
    indeg = {n: 0 for n in nodes}
    out = {n: set() for n in nodes}
    for e in edges:
        if e["to"] not in out[e["from"]]:
            out[e["from"]].add(e["to"])
            indeg[e["to"]] += 1
    ready = sorted([n for n in nodes if indeg[n] == 0], key=pos.get)
    order = []
    while ready:
        n = ready.pop(0)
        order.append(n)
        for m in sorted(out[n], key=pos.get):
            indeg[m] -= 1
            if indeg[m] == 0:
                ready.append(m)
        ready.sort(key=pos.get)
    return order if len(order) == len(nodes) else None


def check_ser(h: History) -> dict:
    g = build_graph(h)
    nodes, edges, viol = g["committed"], g["edges"], g["violations"]
    cycle = shortest_cycle(nodes, edges)
    steps = []
    commit_ts = {t.id: t.end for t in h.txns}
    for k in h.keys:
        parts = [f"initial ({h.initial[k]})"]
        for w in g["versions"][k][1:]:
            parts.append(f"{w}'s value {h.txn(w).final_write(k)} (commit {commit_ts[w]})")
        steps.append(f"Version order of {k}: " + ", then ".join(parts) + ".")
    for e in edges:
        a, b, k = e["from"], e["to"], e["key"]
        if e["edge"] == "ww":
            steps.append(f"{a} and {b} install consecutive versions of {k}, so {a} must come before {b}. Edge: {a} -> {b}, type ww, key {k}.")
        elif e["edge"] == "wr":
            steps.append(f"{b} read the version of {k} written by {a}, so {a} must come before {b}. Edge: {a} -> {b}, type wr, key {k}.")
        else:
            steps.append(
                f"{a} read a version of {k} whose next version is written by {b}, so {a} must come before {b}. "
                f"Edge: {a} -> {b}, type rw, key {k}."
            )
    for v in viol:
        steps.append(f"VIOLATION ({v['rule']}): {v}")
    result = {"module": "M2", "edges": edges, "violations": viol, "versions": g["versions"]}
    if cycle:
        label = classify_cycle(cycle)
        text = " ".join(f"{e['from']} -{e['edge']}({e['key']})->" for e in cycle) + f" {cycle[0]['from']}"
        steps.append(f"The graph has a cycle: {text}. It has {sum(e['edge']=='rw' for e in cycle)} rw edge(s) (class {label}), so no serial order can satisfy every edge.")
        result["cycle"] = cycle
        result["anomaly"] = label
    if viol or cycle:
        result["verdict"] = "invalid"
        steps.append("Conclusion: NOT serializable.")
    else:
        order = topological_order(nodes, edges)
        result["verdict"] = "valid"
        result["serial_order"] = order
        steps.append(f"The graph is acyclic. A serial order that respects every edge: {', '.join(order)}. Conclusion: serializable.")
    result["derivation"] = [f"{i}. {s}" for i, s in enumerate(steps, 1)]
    return result


# ----------------------------------------------------------------------------
# D3: in-doubt transactions
# ----------------------------------------------------------------------------
def prepared_ids(h: History) -> list:
    return [t.id for t in h.txns if t.outcome == "prepared"]


def resolve(h: History, assignment: dict) -> History:
    """assignment maps each prepared transaction id to 'commit' or 'abort'."""
    txns = []
    for t in h.txns:
        if t.outcome == "prepared":
            txns.append(Txn(t.id, t.ops, assignment[t.id], t.start, t.end))
        else:
            txns.append(t)
    return h.replace_txns(txns)


def completions(h: History):
    ids = prepared_ids(h)
    for combo in product(("commit", "abort"), repeat=len(ids)):
        yield dict(zip(ids, combo))


def check_indoubt(h: History) -> dict:
    _require(h.form == "timed", "in-doubt transactions need a timed history")
    rows = []
    for a in completions(h):
        r = check_si(resolve(h, a))
        rows.append(
            {
                "committed": sorted(k for k, v in a.items() if v == "commit"),
                "aborted": sorted(k for k, v in a.items() if v == "abort"),
                "verdict": r["verdict"],
                "result": r,
            }
        )
    verdicts = {r["verdict"] for r in rows}
    verdict = verdicts.pop() if len(verdicts) == 1 else "undetermined"
    return {"module": "M3", "verdict": verdict, "completions": rows}


def check(h: History | RegisterHistory, module: str) -> dict:
    module = module.upper()
    if module == "M4":
        if not isinstance(h, RegisterHistory):
            raise HistoryError("M4 requires a register history")
        return check_m4(h)
    if module == "M1":
        return check_si(h)
    if module == "M2":
        return check_ser(h)
    if module == "M3":
        return check_indoubt(h)
    raise ValueError(f"unknown module {module!r}")
