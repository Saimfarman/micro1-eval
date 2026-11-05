"""Strict model and parser for M4 one-register histories."""

from __future__ import annotations

import re
from dataclasses import dataclass

from .history import HistoryError


@dataclass(frozen=True)
class RegisterOp:
    id: str
    kind: str  # "read" or "write"
    invoke: int
    response: int
    value: int


@dataclass(frozen=True)
class RegisterHistory:
    initial: int
    operations: tuple[RegisterOp, ...]


_HEADER = re.compile(r"^Register:\s*initial=(?P<initial>-?\d+)\.$")
_OP = re.compile(
    r"^(?P<id>[A-Za-z][A-Za-z0-9_]*)\s+invoke=(?P<invoke>-?\d+)\s+"
    r"response=(?P<response>-?\d+)\s+(?P<kind>read|write)=(?P<value>-?\d+)$"
)


def parse_register(text: str) -> RegisterHistory:
    lines = [line.strip() for line in text.strip().splitlines() if line.strip()]
    if not lines:
        raise HistoryError("empty register history")
    header = _HEADER.fullmatch(lines[0])
    if not header:
        raise HistoryError("bad register history header")
    operations = []
    for line in lines[1:]:
        match = _OP.fullmatch(line)
        if not match:
            raise HistoryError(f"bad register operation: {line!r}")
        operations.append(
            RegisterOp(
                match.group("id"),
                match.group("kind"),
                int(match.group("invoke")),
                int(match.group("response")),
                int(match.group("value")),
            )
        )
    history = RegisterHistory(int(header.group("initial")), tuple(operations))
    validate_register(history)
    return history


def print_register(history: RegisterHistory) -> str:
    lines = [f"Register: initial={history.initial}."]
    for op in history.operations:
        lines.append(
            f"{op.id}  invoke={op.invoke}  response={op.response}  {op.kind}={op.value}"
        )
    return "\n".join(lines)


def validate_register(history: RegisterHistory) -> None:
    ids = [op.id for op in history.operations]
    if len(ids) != len(set(ids)):
        raise HistoryError("duplicate register operation ids")
    stamps = []
    writes = {history.initial}
    for op in history.operations:
        if op.kind not in {"read", "write"}:
            raise HistoryError(f"unknown register operation kind: {op.kind}")
        if op.invoke >= op.response:
            raise HistoryError(f"{op.id}: invocation must precede response")
        stamps.extend((op.invoke, op.response))
        if op.kind == "write":
            if op.value in writes:
                raise HistoryError(f"{op.id}: write value is not unique")
            writes.add(op.value)
    if len(stamps) != len(set(stamps)):
        raise HistoryError("register timestamps must be distinct")
