"""History model, strict parser and printer (plan Section 20.5).

Two forms share one notation:

  timed    (modules M1, M3)  T1  start=1  commit=6  r(x)=0  w(y)=1
  ordered  (module  M2)      T2  commit=5  r(y)=0  w(x)=1      (listed in commit order)

Aborted:   timed ``abort=<t>``  ordered ``abort``
In doubt:  timed ``prepared commit_ts=<t>``  (timed histories only)
"""
from __future__ import annotations

import re
from dataclasses import dataclass, replace
from typing import Optional


class HistoryError(ValueError):
    """Raised for any syntactic or semantic problem in a history."""


@dataclass(frozen=True)
class Op:
    kind: str  # "r" or "w"
    key: str
    value: int


@dataclass(frozen=True)
class Txn:
    id: str
    ops: tuple
    outcome: str  # "commit" | "abort" | "prepared"
    start: Optional[int] = None  # timed histories only
    end: Optional[int] = None  # commit ts, abort ts (timed) or proposed commit ts (prepared)

    def writes(self, key: str) -> list:
        return [o.value for o in self.ops if o.kind == "w" and o.key == key]

    def write_keys(self) -> set:
        return {o.key for o in self.ops if o.kind == "w"}

    def final_write(self, key: str):
        w = self.writes(key)
        return w[-1] if w else None


@dataclass(frozen=True)
class History:
    form: str  # "timed" | "ordered"
    keys: tuple
    initial: dict
    txns: tuple

    def txn(self, tid: str) -> Txn:
        for t in self.txns:
            if t.id == tid:
                return t
        raise KeyError(tid)

    def replace_txns(self, txns) -> "History":
        return replace(self, txns=tuple(txns))


# ----------------------------------------------------------------------------
# Parsing
# ----------------------------------------------------------------------------
_ID = r"[A-Za-z][A-Za-z0-9_]*"
_HEADER = re.compile(
    r"^Keys:\s*(?P<keys>" + _ID + r"(?:\s*,\s*" + _ID + r")*)\s*\.\s*"
    r"Initial:\s*(?P<init>[^.]*)\.(?:\s.*)?$"
)
_OP = re.compile(r"^(?P<k>[rw])\((?P<key>" + _ID + r")\)=(?P<v>-?\d+)$")
_INT = r"-?\d+"


def _int(token: str, prefix: str) -> int:
    m = re.fullmatch(re.escape(prefix) + r"=(" + _INT + ")", token)
    if not m:
        raise HistoryError(f"expected {prefix}=<integer>, got {token!r}")
    return int(m.group(1))


def parse(text: str) -> History:
    lines = [ln.strip() for ln in text.strip().splitlines() if ln.strip()]
    if not lines:
        raise HistoryError("empty history")
    m = _HEADER.match(lines[0])
    if not m:
        raise HistoryError(f"bad header line: {lines[0]!r}")
    keys = tuple(k.strip() for k in m.group("keys").split(","))
    initial = {}
    for part in m.group("init").split(","):
        part = part.strip()
        mm = re.fullmatch(r"(" + _ID + r")=(" + _INT + ")", part)
        if not mm:
            raise HistoryError(f"bad initial value {part!r}")
        initial[mm.group(1)] = int(mm.group(2))
    txns = []
    form = None
    for ln in lines[1:]:
        tokens = ln.split()
        tid = tokens[0]
        if not re.fullmatch(_ID, tid):
            raise HistoryError(f"bad transaction id {tid!r}")
        rest = tokens[1:]
        if not rest:
            raise HistoryError(f"{tid}: missing fields")
        start = end = None
        if rest[0].startswith("start="):
            this_form = "timed"
            start = _int(rest[0], "start")
            rest = rest[1:]
            if not rest:
                raise HistoryError(f"{tid}: missing outcome")
            if rest[0].startswith("commit="):
                outcome, end = "commit", _int(rest[0], "commit")
                rest = rest[1:]
            elif rest[0].startswith("abort="):
                outcome, end = "abort", _int(rest[0], "abort")
                rest = rest[1:]
            elif rest[0] == "prepared":
                if len(rest) < 2:
                    raise HistoryError(f"{tid}: prepared needs commit_ts=<t>")
                outcome, end = "prepared", _int(rest[1], "commit_ts")
                rest = rest[2:]
            else:
                raise HistoryError(f"{tid}: bad outcome {rest[0]!r}")
        else:
            this_form = "ordered"
            if rest[0].startswith("commit="):
                outcome, end = "commit", _int(rest[0], "commit")
            elif rest[0] == "abort":
                outcome = "abort"
            else:
                raise HistoryError(f"{tid}: bad outcome {rest[0]!r}")
            rest = rest[1:]
        if form is None:
            form = this_form
        elif form != this_form:
            raise HistoryError("cannot mix timed and ordered transaction lines")
        ops = []
        for tok in rest:
            om = _OP.match(tok)
            if not om:
                raise HistoryError(f"{tid}: bad operation {tok!r}")
            ops.append(Op(om.group("k"), om.group("key"), int(om.group("v"))))
        txns.append(Txn(tid, tuple(ops), outcome, start, end))
    if form is None:
        raise HistoryError("history has no transactions")
    h = History(form, keys, initial, tuple(txns))
    validate(h)
    return h


# ----------------------------------------------------------------------------
# Printing
# ----------------------------------------------------------------------------
def print_history(h: History, note: bool = True) -> str:
    head = f"Keys: {', '.join(h.keys)}. Initial: " + ", ".join(
        f"{k}={h.initial[k]}" for k in h.keys
    ) + "."
    if note:
        head += " Every written value is unique per key."
    out = [head]
    for t in h.txns:
        parts = [t.id]
        if h.form == "timed":
            parts.append(f"start={t.start}")
            if t.outcome == "commit":
                parts.append(f"commit={t.end}")
            elif t.outcome == "abort":
                parts.append(f"abort={t.end}")
            else:
                parts.append(f"prepared commit_ts={t.end}")
        else:
            parts.append(f"commit={t.end}" if t.outcome == "commit" else "abort")
        parts += [f"{o.kind}({o.key})={o.value}" for o in t.ops]
        out.append("  ".join(parts))
    return "\n".join(out)


# ----------------------------------------------------------------------------
# Validation
# ----------------------------------------------------------------------------
def validate(h: History) -> None:
    if len(set(h.keys)) != len(h.keys):
        raise HistoryError("duplicate keys")
    for k in h.keys:
        if k not in h.initial:
            raise HistoryError(f"no initial value for key {k}")
    ids = [t.id for t in h.txns]
    if len(set(ids)) != len(ids):
        raise HistoryError("duplicate transaction ids")
    written = {k: {h.initial[k]} for k in h.keys}
    for t in h.txns:
        for o in t.ops:
            if o.key not in h.keys:
                raise HistoryError(f"{t.id}: undeclared key {o.key}")
            if o.kind == "w":
                if o.value in written[o.key]:
                    raise HistoryError(
                        f"{t.id}: value {o.value} written to {o.key} is not unique"
                    )
                written[o.key].add(o.value)
    if h.form == "timed":
        stamps = []
        for t in h.txns:
            if t.start is None or t.end is None:
                raise HistoryError(f"{t.id}: timed transactions need start and end")
            if not t.start < t.end:
                raise HistoryError(f"{t.id}: start must be earlier than end")
            stamps += [t.start, t.end]
        if len(set(stamps)) != len(stamps):
            raise HistoryError("timestamps must be distinct integers")
    elif h.form == "ordered":
        last = None
        for t in h.txns:
            if t.start is not None:
                raise HistoryError(f"{t.id}: ordered histories have no start times")
            if t.outcome == "prepared":
                raise HistoryError(f"{t.id}: in-doubt transactions need a timed history")
            if t.outcome == "commit":
                if t.end is None:
                    raise HistoryError(f"{t.id}: commit needs a timestamp")
                if last is not None and t.end <= last:
                    raise HistoryError(
                        "ordered histories must list committed transactions in "
                        "strictly increasing commit order"
                    )
                last = t.end
    else:
        raise HistoryError(f"unknown form {h.form!r}")
