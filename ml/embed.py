#!/usr/bin/env python3
"""Embed texts with BAAI/bge-small-en-v1.5 (mean pooling, L2 normalize).

Caches vectors to ml/cache/<name>.npy. Falls back to a deterministic 384-d
hash embedding if the Hugging Face download fails.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import sys
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parent
CACHE = ROOT / "cache"
ENCODER_ID = "BAAI/bge-small-en-v1.5"
DIM = 384

_MODEL = None
_ENCODER_MODE = "bge"  # or "hash"


def hash_embed(texts: list[str], dim: int = DIM) -> np.ndarray:
    """Deterministic pseudo-embedding from text hashes (fallback only)."""
    out = np.zeros((len(texts), dim), dtype=np.float32)
    for i, text in enumerate(texts):
        seed = int(hashlib.sha256(text.encode("utf-8")).hexdigest()[:16], 16) % (2**32)
        rng = np.random.default_rng(seed)
        vec = rng.standard_normal(dim).astype(np.float32)
        # Mix in token hashes for slight lexical signal
        for tok in text.lower().split():
            h = int(hashlib.md5(tok.encode("utf-8")).hexdigest()[:8], 16)
            vec[h % dim] += 1.0
        norm = np.linalg.norm(vec) + 1e-12
        out[i] = vec / norm
    return out


def load_model():
    global _MODEL, _ENCODER_MODE
    if _MODEL is not None or _ENCODER_MODE == "hash":
        return _MODEL
    try:
        from sentence_transformers import SentenceTransformer

        print(f"Loading encoder {ENCODER_ID} …", file=sys.stderr)
        _MODEL = SentenceTransformer(ENCODER_ID)
        _ENCODER_MODE = "bge"
        return _MODEL
    except Exception as exc:  # noqa: BLE001
        print(f"WARNING: failed to load {ENCODER_ID}: {exc}", file=sys.stderr)
        print("Falling back to deterministic hash embeddings (384-d).", file=sys.stderr)
        _ENCODER_MODE = "hash"
        _MODEL = None
        return None


def encode(texts: list[str], batch_size: int = 64) -> np.ndarray:
    """Mean-pooled, L2-normalized embeddings."""
    model = load_model()
    if model is None:
        return hash_embed(texts)
    # sentence-transformers bge uses mean pooling + normalize when normalize_embeddings=True
    emb = model.encode(
        texts,
        batch_size=batch_size,
        convert_to_numpy=True,
        normalize_embeddings=True,
        show_progress_bar=len(texts) > 32,
    )
    return np.asarray(emb, dtype=np.float32)


def cache_path(name: str) -> Path:
    CACHE.mkdir(parents=True, exist_ok=True)
    return CACHE / f"{name}.npy"


def embed_and_cache(texts: list[str], name: str, force: bool = False) -> np.ndarray:
    path = cache_path(name)
    meta_path = CACHE / f"{name}.meta.json"
    if path.exists() and not force:
        arr = np.load(path)
        if arr.shape[0] == len(texts):
            return arr
    arr = encode(texts)
    np.save(path, arr)
    meta_path.write_text(
        json.dumps(
            {
                "name": name,
                "n": len(texts),
                "dim": int(arr.shape[1]),
                "encoder": ENCODER_ID if _ENCODER_MODE == "bge" else "hash-fallback",
                "mode": _ENCODER_MODE,
                "pooling": "mean",
                "normalize": True,
            },
            indent=2,
        )
        + "\n",
        encoding="utf-8",
    )
    return arr


def encoder_mode() -> str:
    load_model()
    return _ENCODER_MODE


def main() -> None:
    parser = argparse.ArgumentParser(description="Embed Greenlight training CSVs")
    parser.add_argument(
        "--task",
        choices=["items", "board", "replies", "all", "vendors"],
        default="all",
    )
    parser.add_argument("--force", action="store_true")
    args = parser.parse_args()

    import pandas as pd

    tasks = ["items", "board", "replies"] if args.task == "all" else [args.task]
    if args.task == "vendors":
        tasks = []

    for task in tasks:
        csv_path = ROOT / "data" / f"{task}.csv"
        df = pd.read_csv(csv_path)
        texts = df["text"].astype(str).tolist()
        arr = embed_and_cache(texts, name=task, force=args.force)
        print(f"{task}: {arr.shape} mode={encoder_mode()} -> {cache_path(task)}")

    if args.task in ("vendors", "all"):
        vendors_path = ROOT.parent / "src" / "data" / "vendors.json"
        data = json.loads(vendors_path.read_text(encoding="utf-8"))
        names = [v["name"] for v in data["vendors"]]
        arr = embed_and_cache(names, name="vendors", force=args.force)
        print(f"vendors: {arr.shape} mode={encoder_mode()} -> {cache_path('vendors')}")


if __name__ == "__main__":
    main()
