"""One local command for everything that exists so far: python scripts/check_all.py"""
import subprocess
import sys

STEPS = [
    ("unit and property tests", [sys.executable, "-m", "pytest"]),
    ("differential fuzz (O1 vs O2), 3000 per module", [sys.executable, "scripts/diff_fuzz.py", "--n", "3000"]),
]

failed = 0
for name, cmd in STEPS:
    print(f"\n=== {name}")
    if subprocess.call(cmd) != 0:
        print(f"FAILED: {name}")
        failed += 1
print("\nALL GREEN" if not failed else f"\n{failed} step(s) failed")
sys.exit(1 if failed else 0)
