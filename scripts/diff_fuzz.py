"""Large differential run: python scripts/diff_fuzz.py --n 20000 [--seed 1] [--max-txns 7]

Compares checker O1 (reference) with O2 (rules) on random histories and prints how often each
kind of verdict, violation and anomaly was exercised. Exit code 1 on any disagreement.
"""
from __future__ import annotations

import argparse
import collections
import random
import sys
import time

sys.path.insert(0, ".")
from evalkit.domain.fuzz import random_history  # noqa: E402
from evalkit.domain.history import print_history  # noqa: E402
from evalkit.domain.oracle import reference, rules  # noqa: E402


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--n", type=int, default=20000, help="histories per module")
    ap.add_argument("--seed", type=int, default=1)
    ap.add_argument("--max-txns", type=int, default=7)
    a = ap.parse_args()
    rng = random.Random(a.seed)
    bad = 0
    t0 = time.time()
    for module in ("M1", "M2", "M3"):
        cover = collections.Counter()
        for i in range(a.n):
            h = random_history(rng, module, n=rng.randint(2, a.max_txns), nkeys=rng.randint(1, 3))
            r = rules.check(h, module)
            ref = reference.ref_verdict(h, module)
            if r["verdict"] != ref:
                bad += 1
                print(f"DISAGREEMENT {module} #{i}: rules={r['verdict']} reference={ref}\n{print_history(h)}\n")
                if bad > 5:
                    return 1
            cover["verdict:" + r["verdict"]] += 1
            if module == "M1":
                for v in r["violations"]:
                    cover["violation:" + v["rule"] + (":" + v["name"] if v.get("name") else "")] += 1
            elif module == "M2":
                for v in r["violations"]:
                    cover["violation:" + v["rule"]] += 1
                if "anomaly" in r:
                    cover["cycle:" + r["anomaly"]] += 1
                if r["verdict"] == "valid":
                    commit_order = [t.id for t in h.txns if t.outcome == "commit"]
                    if r["serial_order"] != commit_order:
                        cover["valid-but-not-commit-order"] += 1
        print(f"{module}: {a.n} histories")
        for k, v in sorted(cover.items()):
            print(f"   {k:45s} {v}")
    print(f"disagreements: {bad}   time: {time.time() - t0:.1f}s")
    return 1 if bad else 0


if __name__ == "__main__":
    raise SystemExit(main())
