"""M4 linearizability checker, independent of O1/O2 transaction checkers."""
from __future__ import annotations

from itertools import permutations

from ..linearizability import RegisterHistory


def _legal(history: RegisterHistory, order: tuple[int, ...]) -> bool:
    value = history.initial
    for index in order:
        operation = history.operations[index]
        if operation.kind == "write":
            value = operation.value
        elif operation.value != value:
            return False
    return True


def _respects_realtime(history: RegisterHistory, order: tuple[int, ...]) -> bool:
    positions = {index: position for position, index in enumerate(order)}
    for left_index, left in enumerate(history.operations):
        for right_index, right in enumerate(history.operations):
            if left.response < right.invoke and positions[left_index] >= positions[right_index]:
                return False
    return True


def linearization(history: RegisterHistory) -> tuple[str, ...] | None:
    for order in permutations(range(len(history.operations))):
        if _respects_realtime(history, order) and _legal(history, order):
            return tuple(history.operations[index].id for index in order)
    return None


def validate_linearization(history: RegisterHistory, order: list[str] | tuple[str, ...]) -> bool:
    """Return whether a submitted operation order is legal and real-time-respecting."""
    ids = [operation.id for operation in history.operations]
    if len(order) != len(ids) or set(order) != set(ids):
        return False
    by_id = {operation.id: index for index, operation in enumerate(history.operations)}
    indices = tuple(by_id[operation_id] for operation_id in order)
    return _respects_realtime(history, indices) and _legal(history, indices)


def check(history: RegisterHistory) -> dict:
    order = linearization(history)
    if order is not None:
        return {
            "module": "M4",
            "verdict": "valid",
            "order": list(order),
            "derivation": ["A total order respects real time and every register read is legal."],
        }
    return {
        "module": "M4",
        "verdict": "invalid",
        "violation": {
            "operations": [operation.id for operation in history.operations],
            "reason": "no real-time-respecting legal linearization exists",
        },
        "derivation": ["Exhaustive search found no legal order respecting real time."],
    }
