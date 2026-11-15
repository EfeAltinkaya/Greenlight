#!/usr/bin/env python3
"""Embed USG vendor names and write public/models/vendors.emb.json."""

from __future__ import annotations

import json
import sys
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent
REPO = ROOT.parent
OUT = REPO / "public" / "models" / "vendors.emb.json"


def main() -> None:
    sys.path.insert(0, str(ROOT))
    from embed import embed_and_cache, encoder_mode  # noqa: WPS433

    vendors_path = REPO / "src" / "data" / "vendors.json"
    data = json.loads(vendors_path.read_text(encoding="utf-8"))
    vendors = data["vendors"]
    names = [v["name"] for v in vendors]
    ids = [v.get("supplierId") or v["name"] for v in vendors]

    emb = embed_and_cache(names, name="vendors")
    mode = encoder_mode()

    payload = {
        "encoder": "Xenova/bge-small-en-v1.5",
        "pooling": "mean",
        "normalize": True,
        "dim": int(emb.shape[1]),
        "encoderMode": mode,
        "source": data.get("source"),
        "fetched": data.get("fetched"),
        "builtAt": datetime.now(timezone.utc).isoformat(),
        "vendors": [
            {
                "supplierId": ids[i],
                "name": names[i],
                "embedding": emb[i].astype(float).tolist(),
            }
            for i in range(len(names))
        ],
    }
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(payload) + "\n", encoding="utf-8")
    print(f"Wrote {OUT} ({len(names)} vendors, dim={emb.shape[1]}, mode={mode})")


if __name__ == "__main__":
    main()
