"""O3 checker: independent constraint-oriented checker.

Z3 is used for M2 serial orders and M4 linearizations. M1 and M3 use separate
implementations of the definitions and never import O1 or O2.
"""
from __future__ import annotations

from itertools import product

from ..history import History, Txn
from ..linearizability import RegisterHistory
try:
    from z3 import And, Distinct, Int, Or, Solver, sat
except ImportError:  # pragma: no cover - exercised by installation checks
    And = Distinct = Int = Or = Solver = sat = None


def _require_z3() -> None:
    if Solver is None:
        raise RuntimeError("O3 requires the pinned z3-solver dependency")


def _si_valid(history: History) -> bool:
    committed = [t for t in history.txns if t.outcome == "commit"]
    for transaction in committed:
        own = {}
        for operation in transaction.ops:
            if operation.kind == "w":
                own[operation.key] = operation.value
            elif operation.key in own and operation.value != own[operation.key]:
                return False
            elif operation.key not in own:
                candidates = [
                    writer for writer in committed
                    if writer.id != transaction.id and operation.key in writer.write_keys()
                    and writer.end < transaction.start
                ]
                source = max(candidates, key=lambda item: item.end) if candidates else None
                expected = source.final_write(operation.key) if source else history.initial[operation.key]
                if operation.value != expected:
                    return False
    for index, left in enumerate(committed):
        for right in committed[index + 1:]:
            if left.write_keys() & right.write_keys() and left.start < right.end and right.start < left.end:
                return False
    return True


def _resolved(history: History, assignment: dict[str, str]) -> History:
    return history.replace_txns(tuple(
        Txn(t.id, t.ops, assignment.get(t.id, t.outcome), t.start, t.end)
        for t in history.txns
    ))


def _m3(history: History) -> str:
    prepared = [t.id for t in history.txns if t.outcome == "prepared"]
    verdicts = {
        "valid" if _si_valid(_resolved(history, dict(zip(prepared, values)))) else "invalid"
        for values in product(("commit", "abort"), repeat=len(prepared))
    }
    return verdicts.pop() if len(verdicts) == 1 else "undetermined"


def _m2(history: History) -> str:
    _require_z3()
    committed = [t for t in history.txns if t.outcome == "commit"]
    positions = {t.id: Int(f"pos_{i}") for i, t in enumerate(committed)}
    solver = Solver()
    solver.add(Distinct(list(positions.values())))
    for position in positions.values():
        solver.add(position >= 0, position < len(committed))
    writers = {
        key: [t for t in sorted(committed, key=lambda item: item.end) if key in t.write_keys()]
        for key in history.keys
    }
    for key_writers in writers.values():
        for left, right in zip(key_writers, key_writers[1:]):
            solver.add(positions[left.id] < positions[right.id])
    for transaction in committed:
        local = {}
        for operation in transaction.ops:
            if operation.kind == "w":
                local[operation.key] = operation.value
                continue
            if operation.key in local:
                solver.add(local[operation.key] == operation.value)
                continue
            source = next((t for t in committed if operation.value in t.writes(operation.key)), None)
            if source is None:
                solver.add(operation.value == history.initial[operation.key])
                for writer in writers[operation.key]:
                    if writer.id != transaction.id:
                        solver.add(positions[transaction.id] < positions[writer.id])
            else:
                if source.final_write(operation.key) != operation.value:
                    solver.add(False)
                    continue
                solver.add(positions[source.id] < positions[transaction.id])
                for later in committed:
                    if later.id != source.id and operation.key in later.write_keys():
                        solver.add(Or(positions[later.id] <= positions[source.id],
                                      positions[later.id] >= positions[transaction.id]))
    return "valid" if solver.check() == sat else "invalid"


def _m4(history: RegisterHistory) -> str:
    _require_z3()
    operations = history.operations
    positions = [Int(f"linear_pos_{i}") for i in range(len(operations))]
    solver = Solver()
    solver.add(Distinct(positions))
    for position in positions:
        solver.add(position >= 0, position < len(operations))
    for left_index, left in enumerate(operations):
        for right_index, right in enumerate(operations):
            if left.response < right.invoke:
                solver.add(positions[left_index] < positions[right_index])
    for read_index, read in enumerate(operations):
        if read.kind != "read":
            continue
        matching_writes = [
            write_index for write_index, write in enumerate(operations)
            if write.kind == "write" and write.value == read.value
        ]
        choices = []
        if read.value == history.initial:
            choices.append(And(*(
                positions[write_index] > positions[read_index]
                for write_index, write in enumerate(operations)
                if write.kind == "write"
            )))
        for write_index in matching_writes:
            between = [
                Or(
                    positions[other_index] < positions[write_index],
                    positions[other_index] > positions[read_index],
                )
                for other_index, other in enumerate(operations)
                if other.kind == "write" and other_index != write_index
            ]
            choices.append(And(
                positions[write_index] < positions[read_index],
                *between,
            ))
        solver.add(Or(*choices) if choices else False)
    return "valid" if solver.check() == sat else "invalid"


def check(history: History | RegisterHistory, module: str) -> dict:
    module = module.upper()
    if module == "M4":
        if not isinstance(history, RegisterHistory):
            raise ValueError("M4 requires a RegisterHistory")
        return {"module": "M4", "verdict": _m4(history), "checker": "O3"}
    if not isinstance(history, History):
        raise ValueError("M1-M3 require a transaction History")
    if module == "M1":
        return {"module": "M1", "verdict": "valid" if _si_valid(history) else "invalid", "checker": "O3"}
    if module == "M2":
        return {"module": "M2", "verdict": _m2(history), "checker": "O3"}
    if module == "M3":
        return {"module": "M3", "verdict": _m3(history), "checker": "O3"}
    raise ValueError(f"unknown module {module!r}")
