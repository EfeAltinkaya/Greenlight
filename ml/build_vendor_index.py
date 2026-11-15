#!/usr/bin/env python3
"""Embed USG vendor names → public/models/vendors.emb.json and heads/vendor.json."""

from __future__ import annotations

import json
import sys
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent
REPO = ROOT.parent
OUT_EMB = REPO / "public" / "models" / "vendors.emb.json"
OUT_HEAD = REPO / "public" / "models" / "heads" / "vendor.json"
ENCODER_BROWSER = "Xenova/bge-small-en-v1.5"


def main() -> None:
    sys.path.insert(0, str(ROOT))
    from embed import embed_and_cache, encoder_mode  # noqa: WPS433

    vendors_path = REPO / "src" / "data" / "vendors.json"
    data = json.loads(vendors_path.read_text(encoding="utf-8"))
    vendors = data["vendors"]
    names = [v["name"] for v in vendors]
    ids = [v.get("supplierId") or v["name"] for v in vendors]
    active = [bool(v.get("active", True)) for v in vendors]

    emb = embed_and_cache(names, name="vendors")
    mode = encoder_mode()
    built = datetime.now(timezone.utc).isoformat()

    payload = {
        "encoder": ENCODER_BROWSER,
        "pooling": "mean",
        "normalize": True,
        "dim": int(emb.shape[1]),
        "encoderMode": mode,
        "source": data.get("source"),
        "fetched": data.get("fetched"),
        "builtAt": built,
        "vendors": [
            {
                "supplierId": ids[i],
                "name": names[i],
                "embedding": emb[i].astype(float).tolist(),
            }
            for i in range(len(names))
        ],
    }
    OUT_EMB.parent.mkdir(parents=True, exist_ok=True)
    OUT_EMB.write_text(json.dumps(payload) + "\n", encoding="utf-8")

    head = {
        "task": "vendor",
        "ready": True,
        "stub": False,
        "dim": int(emb.shape[1]),
        "baseModel": ENCODER_BROWSER,
        "license": "MIT",
        "metrics": {
            "recallAt3": None,
            "nTrain": len(names),
            "note": f"Embedded {len(names)} USG Vendor List names ({mode}).",
        },
        "trainedAt": built,
        "limits": "Suggests close matches on USG's Vendor List. Never marks a vendor approved.",
        "does": "Did-you-mean over USG listed vendors using string similarity and embeddings.",
        "neverDoes": "Approve a vendor or change the 6-week vs 9-week deadline by itself.",
        "reportWrong": "Click Not right, or email the Greenlight team with what you typed and the correct vendor name.",
        "vendors": [
            {
                "name": names[i],
                "listed": active[i],
                "embedding": emb[i].astype(float).tolist(),
            }
            for i in range(len(names))
        ],
        "fuseWeight": 0.5,
        "cosineWeight": 0.5,
    }
    OUT_HEAD.parent.mkdir(parents=True, exist_ok=True)
    OUT_HEAD.write_text(json.dumps(head) + "\n", encoding="utf-8")

    print(f"Wrote {OUT_EMB} ({len(names)} vendors, dim={emb.shape[1]}, mode={mode})")
    print(f"Wrote {OUT_HEAD}")


if __name__ == "__main__":
    main()
