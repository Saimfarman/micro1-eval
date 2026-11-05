"""M5: strict serializability for timed transaction histories.

M5 extends the serial-order view of M2 with real-time order.  Aborted
transactions are ignored, prepared transactions are rejected, and a valid
certificate is a serial order that reproduces every committed read.
"""

from __future__ import annotations

from itertools import permutations
from typing import Any

from .history import History, HistoryError, Txn


def _committed(history: History) -> list[Txn]:
    if history.form != "timed":
        raise HistoryError("M5 requires a timed history")
    if any(t.outcome == "prepared" for t in history.txns):
        raise HistoryError("resolve in-doubt transactions before checking M5")
    return [t for t in history.txns if t.outcome == "commit"]


def _real_time_order(txns: list[Txn]) -> list[tuple[str, str]]:
    return [
        (left.id, right.id)
        for left in txns
        for right in txns
        if left.id != right.id and left.end < right.start
    ]


def _simulate(history: History, order: tuple[Txn, ...]) -> bool:
    store = dict(history.initial)
    for transaction in order:
        local: dict[str, int] = {}
        for index, operation in enumerate(transaction.ops):
            if operation.kind == "w":
                local[operation.key] = operation.value
                continue
            expected = local.get(operation.key, store[operation.key])
            if operation.value != expected:
                return False
        store.update(local)
    return True


def _satisfies_real_time(order: tuple[Txn, ...]) -> bool:
    positions = {t.id: i for i, t in enumerate(order)}
    return all(
        positions[left] < positions[right]
        for left, right in _real_time_order(list(order))
    )


def _result(
    verdict: str,
    checker: str,
    serial_order: list[str] | None = None,
) -> dict[str, Any]:
    certificate = (
        {"serial_order": serial_order}
        if serial_order is not None
        else {"kind": "no-strict-serial-order"}
    )
    return {
        "module": "M5",
        "verdict": verdict,
        "checker": checker,
        "certificate": certificate,
    }


def verify_certificate(history: History, result: dict[str, Any]) -> bool:
    """Verify an M5 serial-order certificate independently of its producer."""
    if result.get("module") != "M5":
        return False
    order_ids = result.get("certificate", {}).get("serial_order")
    if result.get("verdict") != "valid" or not isinstance(order_ids, list):
        return False
    txns = _committed(history)
    if len(order_ids) != len(txns) or set(order_ids) != {t.id for t in txns}:
        return False
    order = tuple(history.txn(tid) for tid in order_ids)
    return _satisfies_real_time(order) and _simulate(history, order)


def verify_invalid_certificate(history: History) -> bool:
    return reference_check(history)["verdict"] == "invalid"


def reference_check(history: History) -> dict[str, Any]:
    """O1: enumerate every serial order and simulate it."""
    txns = _committed(history)
    for order in permutations(txns):
        if _satisfies_real_time(order) and _simulate(history, order):
            return _result("valid", "M5-reference", [t.id for t in order])
    return _result("invalid", "M5-reference")


def _topological_orders(txns: list[Txn]) -> list[tuple[Txn, ...]]:
    """Generate only orders satisfying real-time precedence."""
    required = {(left, right) for left, right in _real_time_order(txns)}
    result: list[tuple[Txn, ...]] = []

    def visit(prefix: tuple[Txn, ...], remaining: tuple[Txn, ...]) -> None:
        if not remaining:
            result.append(prefix)
            return
        placed = {t.id for t in prefix}
        for transaction in remaining:
            if all(
                left in placed for left, right in required if right == transaction.id
            ):
                visit(
                    prefix + (transaction,),
                    tuple(t for t in remaining if t.id != transaction.id),
                )

    visit((), tuple(txns))
    return result


def rules_check(history: History) -> dict[str, Any]:
    """O2: enumerate topological orders, then apply sequential read rules."""
    txns = _committed(history)
    for order in _topological_orders(txns):
        if _simulate(history, order):
            return _result("valid", "M5-rules", [t.id for t in order])
    return _result("invalid", "M5-rules")


def constraint_check(history: History) -> dict[str, Any]:
    """O3: encode order positions and read-source constraints in Z3."""
    try:
        from z3 import And, Distinct, Int, Or, Solver, sat
    except ImportError as exc:  # pragma: no cover
        raise RuntimeError("M5 constraint checker requires z3-solver") from exc

    txns = _committed(history)
    position = {t.id: Int(f"m5_pos_{i}") for i, t in enumerate(txns)}
    solver = Solver()
    solver.add(Distinct(*position.values()))
    for value in position.values():
        solver.add(value >= 0, value < len(txns))
    for left, right in _real_time_order(txns):
        solver.add(position[left] < position[right])

    for transaction in txns:
        own_writes: set[str] = set()
        for index, operation in enumerate(transaction.ops):
            if operation.kind == "w":
                own_writes.add(operation.key)
                continue
            if operation.key in own_writes:
                previous = [
                    op.value
                    for op in transaction.ops[:index]
                    if op.kind == "w" and op.key == operation.key
                ][-1]
                solver.add(operation.value == previous)
                continue
            writers = [
                writer
                for writer in txns
                if writer.id != transaction.id
                and writer.final_write(operation.key) is not None
            ]
            choices = []
            if operation.value == history.initial[operation.key]:
                choices.append(
                    And(
                        *(
                            position[writer.id] > position[transaction.id]
                            for writer in writers
                        )
                    )
                )
            for writer in writers:
                if writer.final_write(operation.key) != operation.value:
                    continue
                choices.append(
                    And(
                        position[writer.id] < position[transaction.id],
                        *(
                            Or(
                                position[other.id] < position[writer.id],
                                position[other.id] > position[transaction.id],
                            )
                            for other in writers
                            if other.id != writer.id
                        ),
                    )
                )
            solver.add(Or(*choices) if choices else False)

    if solver.check() != sat:
        return _result("invalid", "M5-constraint")
    model = solver.model()
    ordered = sorted(txns, key=lambda t: model.evaluate(position[t.id]).as_long())
    return _result("valid", "M5-constraint", [t.id for t in ordered])


def check(history: History, checker: str = "reference") -> dict[str, Any]:
    """Run one named M5 checker; ``all`` returns all normalized results."""
    checkers = {
        "reference": reference_check,
        "rules": rules_check,
        "constraint": constraint_check,
    }
    if checker == "all":
        return {name: function(history) for name, function in checkers.items()}
    try:
        return checkers[checker](history)
    except KeyError as exc:
        raise ValueError(f"unknown M5 checker {checker!r}") from exc
