#!/usr/bin/env python3
"""Train a sponsor ranking model from deal outcomes.

v1 gate: requires at least 50 labeled outcomes. Below that, exits with a clear
message and does not write a ranker artifact.
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
MIN_OUTCOMES = 50


def load_outcomes(path: Path) -> list[dict]:
    if not path.exists():
        return []
    if path.suffix == ".json":
        data = json.loads(path.read_text(encoding="utf-8"))
        if isinstance(data, list):
            return data
        return data.get("outcomes", [])
    # CSV with a header; count non-header lines as outcomes
    lines = [ln for ln in path.read_text(encoding="utf-8").splitlines() if ln.strip()]
    return [{"raw": ln} for ln in lines[1:]]


def main() -> int:
    parser = argparse.ArgumentParser(description="Train sponsor ranker (needs ≥50 outcomes)")
    parser.add_argument(
        "--outcomes",
        type=Path,
        default=ROOT / "data" / "rank_outcomes.csv",
        help="Path to outcomes CSV/JSON",
    )
    args = parser.parse_args()

    outcomes = load_outcomes(args.outcomes)
    n = len(outcomes)
    if n < MIN_OUTCOMES:
        print(f"not enough outcomes (n={n})")
        return 1

    print(f"Would train ranker on n={n} outcomes (not implemented in v1 beyond the gate).")
    return 0


if __name__ == "__main__":
    sys.exit(main())
